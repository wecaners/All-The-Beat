import { and, asc, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { artists, classes, classSongs, encoreRounds, events, instructorPlaces, instructorProfiles, regions, requests, songs } from "@/db/schema";
import {
  classInput,
  type ClassInput,
  createClass,
  type CreateClassResult,
  type EncoreSource,
  getEncoreSource,
  guessBookingType,
  guessRegion,
  resolveTeaser,
} from "@/server/admin/classes";
import { type AdminEncoreDetail, listEncoresForAdmin, respondToEncore, setClassClosed } from "@/server/admin/encores";
import { AdminInputError, kstDateTime, openRequestsForClass } from "@/server/admin/shared";
import { activeEncoreCount } from "@/server/encores";

// 강사의 내 클래스 (F-12, specs/instructor-classes). 운영자 함수(등록·마감·앵콜 응답)를 소유 확인 뒤 부른다.
// 승인된 강사만, 자기 클래스만. 운영자 오류(AdminInputError)는 그대로 화면 문구가 된다

export class MyClassError extends Error {}

const toMyError = (e: unknown): never => {
  if (e instanceof AdminInputError) throw new MyClassError(e.message);
  throw e;
};

// 승인된 강사의 id. 아니면 null
export async function getApprovedInstructorId(userId: string): Promise<number | null> {
  const [row] = await getDb()
    .select({ id: instructorProfiles.id })
    .from(instructorProfiles)
    .where(and(eq(instructorProfiles.userId, userId), eq(instructorProfiles.status, "approved")))
    .limit(1);
  return row?.id ?? null;
}

async function ownedClass(instructorId: number, classId: number) {
  const [row] = await getDb()
    .select({ id: classes.id, status: classes.status, ended: sql<boolean>`${classes.endsAt} <= now()`, placeId: classes.placeId, startsAt: classes.startsAt, endsAt: classes.endsAt, studioName: classes.studioName, address: classes.address })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.instructorId, instructorId)))
    .limit(1);
  if (!row) throw new MyClassError("내 클래스가 아니에요");
  return row;
}

export type MyClassRow = {
  id: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  regionName: string;
  price: number;
  level: "intro" | "beginner" | "intermediate_plus";
  /** 화면 상태: 종료 시각이 지난 open·closing_soon·closed는 ended */
  status: "open" | "closing_soon" | "closed" | "ended" | "canceled";
  bookingClicks: number;
  encoreCount: number;
  /** 앵콜 라운드가 있으면 마감 풀기 불가 */
  hasEncoreRound: boolean;
  songTitle: string;
  videoId: string | null;
};

export type MyClasses = { upcoming: MyClassRow[]; past: MyClassRow[]; encores: AdminEncoreDetail[] };

// 다가오는(종료 전·취소 아님)과 지난(종료·취소). 예약 클릭은 events로, 앵콜은 encores로 센다 (T-03)
export async function listMyClasses(instructorId: number): Promise<MyClasses> {
  const db = getDb();
  const rows = await db
    .select({
      id: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      endsAt: classes.endsAt,
      regionName: regions.shortName,
      price: classes.price,
      level: classes.level,
      rawStatus: classes.status,
      ended: sql<boolean>`${classes.endsAt} <= now()`,
      bookingClicks: sql<number>`(select count(*)::int from ${events} where ${events.classId} = ${classes.id} and ${events.type} = 'booking_click')`,
      encoreCount: activeEncoreCount(classes.id),
      hasEncoreRound: sql<boolean>`exists (select 1 from ${encoreRounds} where ${encoreRounds.classId} = ${classes.id})`,
      songTitle: songs.title,
      videoId: sql<string | null>`case when ${songs.videoEmbeddable} is not false then ${songs.ytVideoId} end`,
    })
    .from(classes)
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .innerJoin(classSongs, and(eq(classSongs.classId, classes.id), eq(classSongs.position, 1)))
    .innerJoin(songs, eq(songs.id, classSongs.songId))
    .where(eq(classes.instructorId, instructorId))
    .orderBy(asc(classes.startsAt), asc(classes.id));

  const all: MyClassRow[] = rows.map(({ rawStatus, ended, ...r }) => ({
    ...r,
    status: rawStatus === "canceled" ? "canceled" : ended || rawStatus === "ended" ? "ended" : rawStatus,
  }));
  const upcoming = all.filter((c) => c.status !== "ended" && c.status !== "canceled");
  const past = all.filter((c) => c.status === "ended" || c.status === "canceled").reverse();
  const { needsResponse } = await listEncoresForAdmin(instructorId);
  return { upcoming, past, encores: needsResponse };
}

// 등록: 강사 id를 내 것으로 고정 (FR-2). 공개·추가요 열기는 운영자 등록과 같다
export async function createMyClass(instructorId: number, raw: unknown): Promise<CreateClassResult> {
  const parsed = classInput.safeParse({ ...(raw as object), instructorId });
  if (!parsed.success) throw new MyClassError(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요");
  if (parsed.data.encoreOfClassId) await ownedClass(instructorId, parsed.data.encoreOfClassId);
  return createClass(parsed.data, { createdByAdmin: false }).catch(toMyError);
}

// 수정 입력: 등록과 같되 앵콜 원 클래스는 바꾸지 않는다
const updateInput = classInput;

// 수정 (FR-8): 종료 전·취소 아닌 내 클래스. 시작·종료·장소가 바뀌면 변경 시각을 남긴다 (클래스 상세 "변경됨" 24시간)
export async function updateMyClass(instructorId: number, classId: number, raw: unknown): Promise<{ id: number; scheduleChanged: boolean }> {
  const parsed = updateInput.safeParse({ ...(raw as object), instructorId, encoreOfClassId: null });
  if (!parsed.success) throw new MyClassError(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요");
  const input: ClassInput = parsed.data;
  const before = await ownedClass(instructorId, classId);
  if (before.status === "canceled") throw new MyClassError("취소한 클래스는 고칠 수 없어요");
  if (before.ended || before.status === "ended") throw new MyClassError("끝난 클래스는 고칠 수 없어요. 복사해서 다시 열어 주세요");

  const startsAt = kstDateTime(input.date, input.startTime);
  const endsAt = kstDateTime(input.date, input.endTime);
  if (startsAt <= new Date()) throw new MyClassError("이미 지난 시간이에요");
  const teaserVideoId = await resolveTeaser(input.teaserUrl).catch(toMyError);

  return getDb()
    .transaction(async (tx) => {
      const songRows = await tx
        .select({ id: songs.id, title: songs.title })
        .from(songs)
        .where(and(inArray(songs.id, input.songIds), isNull(songs.mergedIntoId)));
      if (songRows.length !== input.songIds.length) throw new AdminInputError("없는 곡이 섞여 있어요");
      const firstSong = songRows.find((s) => s.id === input.songIds[0])!;

      let place: { id: number; studioName: string; address: string; regionId: number };
      if (input.placeId) {
        const [saved] = await tx
          .select({ id: instructorPlaces.id, studioName: instructorPlaces.studioName, address: instructorPlaces.address, regionId: instructorPlaces.regionId })
          .from(instructorPlaces)
          .where(and(eq(instructorPlaces.id, input.placeId), eq(instructorPlaces.instructorId, instructorId), isNull(instructorPlaces.archivedAt)))
          .limit(1);
        if (!saved) throw new AdminInputError("내 장소가 아니에요");
        place = saved;
      } else {
        const guessed = await guessRegion(tx, input.address!);
        const [created] = await tx
          .insert(instructorPlaces)
          .values({ instructorId, studioName: input.studioName!, address: input.address!, sigungu: guessed.sigungu, regionId: input.regionId ?? guessed.regionId })
          .returning({ id: instructorPlaces.id, studioName: instructorPlaces.studioName, address: instructorPlaces.address, regionId: instructorPlaces.regionId });
        place = created;
      }
      if (input.regionId) {
        const [region] = await tx.select({ id: regions.id }).from(regions).where(eq(regions.id, input.regionId)).limit(1);
        if (!region) throw new AdminInputError("없는 권역이에요");
      }
      await tx.update(instructorPlaces).set({ lastUsedAt: sql`now()` }).where(eq(instructorPlaces.id, place.id));

      const scheduleChanged =
        startsAt.getTime() !== before.startsAt.getTime() || endsAt.getTime() !== before.endsAt.getTime() || place.studioName !== before.studioName || place.address !== before.address;

      await tx
        .update(classes)
        .set({
          title: input.title ?? `${firstSong.title} 원데이 클래스`,
          startsAt,
          endsAt,
          studioName: place.studioName,
          address: place.address,
          placeId: place.id,
          regionId: input.regionId ?? place.regionId,
          price: input.price,
          level: input.level,
          capacity: input.capacity,
          bookingUrl: input.bookingUrl,
          bookingType: input.bookingType ?? guessBookingType(input.bookingUrl),
          description: input.description,
          teaserVideoId,
          updatedAt: sql`now()`,
          ...(scheduleChanged ? { scheduleChangedAt: sql`now()` } : {}),
        })
        .where(eq(classes.id, classId));

      await tx.delete(classSongs).where(eq(classSongs.classId, classId));
      await tx.insert(classSongs).values(input.songIds.map((songId, i) => ({ classId, songId, position: i + 1 })));
      // 새로 넣은 곡의 기다리는 추가요를 연다 (이미 열린 건 그대로)
      await openRequestsForClass(tx, classId, input.songIds);
      return { id: classId, scheduleChanged };
    })
    .catch(toMyError);
}

export const statusChange = z.enum(["closing_soon", "open", "closed"]);

// 상태 (FR-7): 모집중 ↔ 마감 임박은 직접, 마감·마감 풀기는 운영자 규칙(앵콜 있으면 못 품)
export async function setMyClassStatus(instructorId: number, classId: number, to: z.infer<typeof statusChange>): Promise<void> {
  const c = await ownedClass(instructorId, classId);
  if (c.status === "canceled" || c.ended || c.status === "ended") throw new MyClassError("끝났거나 취소한 클래스는 상태를 바꿀 수 없어요");
  if (to === "closed") return setClassClosed(classId, true).catch(toMyError);
  if (to === "open" && c.status === "closed") return setClassClosed(classId, false).catch(toMyError);
  if (!["open", "closing_soon"].includes(c.status)) throw new MyClassError("모집 중인 클래스만 바꿀 수 있어요");
  await getDb().update(classes).set({ status: to, updatedAt: sql`now()` }).where(eq(classes.id, classId));
}

export const CANCEL_REASONS = { low_turnout: "인원 미달", personal: "개인 사정", other: "기타" } as const;
export const cancelReason = z.enum(["low_turnout", "personal", "other"]);

// 취소 (FR-7): 종료 전 내 클래스. 되돌리지 않는다
export async function cancelMyClass(instructorId: number, classId: number, reason: z.infer<typeof cancelReason>): Promise<void> {
  const c = await ownedClass(instructorId, classId);
  if (c.status === "canceled") throw new MyClassError("이미 취소한 클래스예요");
  if (c.ended || c.status === "ended") throw new MyClassError("끝난 클래스는 취소할 수 없어요");
  await getDb()
    .update(classes)
    .set({ status: "canceled", cancelReason: CANCEL_REASONS[reason], updatedAt: sql`now()` })
    .where(and(eq(classes.id, classId), inArray(classes.status, ["open", "closing_soon", "closed"]), gt(classes.endsAt, sql`now()`)));
}

// 앵콜 응답 (F-24): 내 클래스의 앵콜만. 상태는 앞으로만 (운영자 함수와 같다)
export async function respondToMyEncore(instructorId: number, classId: number, answer: "review" | "decline"): Promise<void> {
  await ownedClass(instructorId, classId);
  await respondToEncore(classId, answer).catch(toMyError);
}

// ── 폼 초기값 ────────────────────────────────────────────────────────

export type ClassFormSource = Omit<EncoreSource, "classId" | "instructorId"> & { date: string | null };

// 폼에는 원 클래스·강사 id를 주지 않는다
function formFields(src: EncoreSource): Omit<EncoreSource, "classId" | "instructorId"> {
  const { classId: _classId, instructorId: _instructorId, ...rest } = src; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

// 수정 폼: 날짜까지 채운다
export async function getMyClassForEdit(instructorId: number, classId: number): Promise<ClassFormSource | null> {
  const c = await ownedClass(instructorId, classId);
  if (c.status === "canceled" || c.ended || c.status === "ended") return null;
  const src = await getEncoreSource(classId);
  if (!src) return null;
  const [{ date }] = await getDb()
    .select({ date: sql<string>`to_char(${classes.startsAt} at time zone 'Asia/Seoul', 'YYYY-MM-DD')` })
    .from(classes)
    .where(eq(classes.id, classId));
  return { ...formFields(src), date };
}

// 복사 폼 (FR-9): 날짜·시간은 비운다
export async function getMyCopySource(instructorId: number, classId: number): Promise<ClassFormSource | null> {
  await ownedClass(instructorId, classId);
  const src = await getEncoreSource(classId);
  if (!src) return null;
  return { ...formFields(src), date: null, startTime: "", endTime: "" };
}

// 앵콜 클래스 폼: 원 클래스가 내 것이고 앵콜이 전달·검토 중일 때만
export async function getMyEncoreSource(instructorId: number, classId: number): Promise<(ClassFormSource & { encoreOfClassId: number }) | null> {
  await ownedClass(instructorId, classId);
  const [round] = await getDb().select({ status: encoreRounds.status }).from(encoreRounds).where(eq(encoreRounds.classId, classId)).limit(1);
  if (!round || !["delivered", "reviewing"].includes(round.status)) return null;
  const src = await getEncoreSource(classId);
  if (!src) return null;
  return { ...formFields(src), date: null, encoreOfClassId: classId };
}

export type MyPlace = { id: number; studioName: string; address: string; regionId: number };

export async function listMyPlaces(instructorId: number): Promise<MyPlace[]> {
  return getDb()
    .select({ id: instructorPlaces.id, studioName: instructorPlaces.studioName, address: instructorPlaces.address, regionId: instructorPlaces.regionId })
    .from(instructorPlaces)
    .where(and(eq(instructorPlaces.instructorId, instructorId), isNull(instructorPlaces.archivedAt)))
    .orderBy(sql`${instructorPlaces.lastUsedAt} desc nulls last`, desc(instructorPlaces.id));
}

// 곡 상세 "이 곡으로 클래스 열기"의 곡 미리 선택 (FR-4)
export async function getSongOption(slug: string): Promise<{ id: number; label: string; waiting: number } | null> {
  const db = getDb();
  const [s] = await db
    .select({ id: songs.id, title: songs.title, artistName: artists.name })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(and(eq(songs.slug, slug), isNull(songs.mergedIntoId)))
    .limit(1);
  if (!s) return null;
  const [{ waiting }] = await db
    .select({ waiting: count() })
    .from(requests)
    .where(and(eq(requests.songId, s.id), sql`${requests.status} <> 'canceled'`, sql`${requests.createdAt} >= now() - interval '90 days'`));
  return { id: s.id, label: `${s.title} - ${s.artistName}`, waiting };
}
