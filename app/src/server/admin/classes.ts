import { and, asc, desc, eq, gt, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import {
  artists,
  bookingType,
  classes,
  classLevel,
  classSongs,
  classStatus,
  encoreRounds,
  events,
  instructorPlaces,
  instructorProfiles,
  regionMappings,
  regions,
  songs,
} from "@/db/schema";
import { resolveVideoId, VideoError } from "@/server/youtube";
import { openEncoreRound } from "./encores";
import { AdminInputError, kstDateTime, openRequestsForClass, todayKst, type Tx } from "./shared";

const FALLBACK_REGION_ID = 8; // 기타 서울 (0003 시드)

const HALF_HOUR = /^([01]\d|2[0-3]):(00|30)$/;
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => v || null)
    .nullable()
    .default(null);

// F-12 입력 규칙 (FR-9)
export const classInput = z
  .object({
    instructorId: z.number().int().positive("강사를 골라 주세요"),
    songIds: z
      .array(z.number().int().positive())
      .transform((ids) => [...new Set(ids)])
      .pipe(z.array(z.number()).min(1, "곡을 하나 이상 골라 주세요").max(3, "곡은 3개까지예요")),
    title: optionalText(30, "클래스 이름은 30자까지예요"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 골라 주세요"),
    startTime: z.string().regex(HALF_HOUR, "시작 시간은 30분 단위로 골라 주세요"),
    endTime: z.string().regex(HALF_HOUR, "종료 시간은 30분 단위로 골라 주세요"),
    placeId: z.number().int().positive().nullable(),
    studioName: optionalText(60, "스튜디오 이름은 60자까지예요"),
    address: optionalText(200, "주소는 200자까지예요"),
    regionId: z.number().int().positive().nullable(), // null = 주소로 추정
    price: z.number({ message: "가격을 숫자로 넣어 주세요" }).int().min(0, "가격은 0원 이상이에요"),
    level: z.enum(classLevel.enumValues, { message: "난이도를 골라 주세요" }),
    capacity: z.number().int().positive("정원은 1명 이상이에요").nullable(),
    bookingUrl: z.string().trim().url("예약 링크를 확인해 주세요").regex(/^https?:\/\//i, "예약 링크는 http(s) 주소여야 해요"),
    bookingType: z.enum(bookingType.enumValues).nullable(), // null = 주소로 추정
    description: optionalText(1000, "설명은 1,000자까지예요"),
    teaserUrl: optionalText(300, "티저 영상 링크가 너무 길어요"), // F-25. 저장 전에 영상 ID로 바꾼다
    encoreOfClassId: z.number().int().positive().nullable().default(null), // 앵콜 클래스면 원 클래스 (F-24)
  })
  .refine((v) => v.date >= todayKst(), { message: "오늘 이후 날짜만 등록할 수 있어요", path: ["date"] })
  .refine((v) => v.endTime > v.startTime, { message: "종료 시간이 시작 시간보다 늦어야 해요", path: ["endTime"] })
  .refine((v) => v.placeId || (v.studioName && v.address), { message: "장소를 고르거나 스튜디오 이름과 주소를 넣어 주세요", path: ["studioName"] });
export type ClassInput = z.infer<typeof classInput>;

// 티저 영상 (F-25, specs/class-teaser): 비면 없음, 아니면 퍼갈 수 있는 YouTube 영상만. 트랜잭션 밖에서 확인한다
export async function resolveTeaser(url: string | null): Promise<string | null> {
  try {
    return await resolveVideoId(url);
  } catch (e) {
    if (e instanceof VideoError) throw new AdminInputError(`티저 영상: ${e.message}`);
    throw e;
  }
}

// 예약 링크 주소로 유형 추정 (FR-11)
export function guessBookingType(url: string): (typeof bookingType.enumValues)[number] {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.endsWith("booking.naver.com") || host === "naver.me") return "naver";
  if (host === "open.kakao.com") return "kakao_openchat";
  if (host.endsWith("instagram.com") || host === "ig.me") return "insta_dm";
  if (host === "forms.gle" || (host === "docs.google.com" && url.includes("/forms/"))) return "google_form";
  return "other";
}

// "서울 마포구 양화로 100" → 마포구 → 홍대·합정. 못 찾으면 기타 서울 (FR-12)
export async function guessRegion(db: Tx | ReturnType<typeof getDb>, address: string): Promise<{ regionId: number; sigungu: string | null }> {
  const sigungu = address.match(/([가-힣]+구)(?=\s|$)/)?.[1] ?? null;
  if (!sigungu) return { regionId: FALLBACK_REGION_ID, sigungu: null };
  const [row] = await db
    .select({ regionId: regionMappings.regionId })
    .from(regionMappings)
    .where(and(eq(regionMappings.sigungu, sigungu), isNull(regionMappings.bname)))
    .limit(1);
  return { regionId: row?.regionId ?? FALLBACK_REGION_ID, sigungu };
}

export type AdminPlace = { id: number; studioName: string; address: string; regionId: number };

export async function listPlacesForInstructor(instructorId: number): Promise<AdminPlace[]> {
  return getDb()
    .select({ id: instructorPlaces.id, studioName: instructorPlaces.studioName, address: instructorPlaces.address, regionId: instructorPlaces.regionId })
    .from(instructorPlaces)
    // 목록에서 뺀 스튜디오는 고를 수 없다 (specs/instructor-studio FR-6)
    .where(and(eq(instructorPlaces.instructorId, instructorId), isNull(instructorPlaces.archivedAt)))
    .orderBy(sql`${instructorPlaces.lastUsedAt} desc nulls last`, desc(instructorPlaces.id));
}

export type CreateClassResult = { id: number; isPublic: boolean; openedRequests: number; isEncore: boolean };

// 클래스 대리 등록 (F-15). 공개 조건을 만족하면 그 자리에서 추가요를 연다 (FR-14)
export async function createClassByAdmin(input: ClassInput): Promise<CreateClassResult> {
  return createClass(input, { createdByAdmin: true });
}

// 클래스 등록의 공통 규칙. 운영자 대리 등록과 강사 직접 등록(F-12, specs/instructor-classes)이 같이 쓴다.
// 강사 쪽은 instructorId를 자기 것으로 고정해서 부른다
export async function createClass(input: ClassInput, origin: { createdByAdmin: boolean }): Promise<CreateClassResult> {
  const startsAt = kstDateTime(input.date, input.startTime);
  const endsAt = kstDateTime(input.date, input.endTime);
  if (startsAt <= new Date()) throw new AdminInputError("이미 지난 시간이에요");
  const teaserVideoId = await resolveTeaser(input.teaserUrl);

  return getDb().transaction(async (tx) => {
    const [instructor] = await tx
      .select({ status: instructorProfiles.status, isProxy: instructorProfiles.isProxy, consentAt: instructorProfiles.consentAt })
      .from(instructorProfiles)
      .where(eq(instructorProfiles.id, input.instructorId))
      .limit(1);
    if (!instructor) throw new AdminInputError("없는 강사예요");

    const songRows = await tx
      .select({ id: songs.id, title: songs.title })
      .from(songs)
      .where(and(inArray(songs.id, input.songIds), isNull(songs.mergedIntoId)));
    if (songRows.length !== input.songIds.length) throw new AdminInputError("없는 곡이 섞여 있어요");
    const firstSong = songRows.find((s) => s.id === input.songIds[0])!;

    // 장소: 저장된 장소를 쓰거나 새로 저장한다 (FR-13)
    let place: { id: number; studioName: string; address: string; regionId: number };
    if (input.placeId) {
      const [saved] = await tx
        .select({ id: instructorPlaces.id, studioName: instructorPlaces.studioName, address: instructorPlaces.address, regionId: instructorPlaces.regionId })
        .from(instructorPlaces)
        .where(and(eq(instructorPlaces.id, input.placeId), eq(instructorPlaces.instructorId, input.instructorId), isNull(instructorPlaces.archivedAt)))
        .limit(1);
      if (!saved) throw new AdminInputError("이 강사의 장소가 아니에요");
      place = saved;
    } else {
      const guessed = await guessRegion(tx, input.address!);
      const [created] = await tx
        .insert(instructorPlaces)
        .values({
          instructorId: input.instructorId,
          studioName: input.studioName!,
          address: input.address!,
          sigungu: guessed.sigungu,
          regionId: input.regionId ?? guessed.regionId,
        })
        .returning({ id: instructorPlaces.id, studioName: instructorPlaces.studioName, address: instructorPlaces.address, regionId: instructorPlaces.regionId });
      place = created;
    }
    if (input.regionId) {
      const [region] = await tx.select({ id: regions.id }).from(regions).where(eq(regions.id, input.regionId)).limit(1);
      if (!region) throw new AdminInputError("없는 권역이에요");
    }
    await tx.update(instructorPlaces).set({ lastUsedAt: sql`now()` }).where(eq(instructorPlaces.id, place.id));

    const [created] = await tx
      .insert(classes)
      .values({
        instructorId: input.instructorId,
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
        createdByAdmin: origin.createdByAdmin,
        encoreOfClassId: input.encoreOfClassId,
      })
      .returning({ id: classes.id });

    // 앵콜 클래스: 원 클래스의 앵콜을 오픈으로. 조건이 안 맞으면 등록도 되돌린다
    if (input.encoreOfClassId) await openEncoreRound(tx, input.encoreOfClassId, input.instructorId, created.id);

    await tx.insert(classSongs).values(input.songIds.map((songId, i) => ({ classId: created.id, songId, position: i + 1 })));

    const isPublic = instructor.status === "approved" && (!instructor.isProxy || instructor.consentAt !== null);
    const openedRequests = isPublic ? await openRequestsForClass(tx, created.id, input.songIds) : 0;
    return { id: created.id, isPublic, openedRequests, isEncore: input.encoreOfClassId !== null };
  });
}

export type AdminClassRow = {
  id: number;
  title: string;
  startsAt: Date;
  instructorName: string;
  regionName: string;
  isPublic: boolean;
  status: (typeof classStatus.enumValues)[number];
  /** 앵콜이 한 번이라도 있었는지 (있으면 마감을 풀 수 없다) */
  hasEncore: boolean;
};

export async function listUpcomingClassesForAdmin(limit = 30): Promise<AdminClassRow[]> {
  return getDb()
    .select({
      id: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      instructorName: instructorProfiles.displayName,
      regionName: regions.shortName,
      isPublic: sql<boolean>`not ${classes.isHidden} and ${instructorProfiles.status} = 'approved' and (not ${instructorProfiles.isProxy} or ${instructorProfiles.consentAt} is not null)`,
      status: classes.status,
      hasEncore: sql<boolean>`exists (select 1 from ${encoreRounds} where ${encoreRounds.classId} = ${classes.id})`,
    })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .where(gt(classes.endsAt, sql`now()`))
    .orderBy(asc(classes.startsAt))
    .limit(limit);
}

export type EncoreSource = {
  classId: number;
  instructorId: number;
  title: string;
  songs: { id: number; label: string }[];
  placeId: number | null;
  studioName: string;
  address: string;
  regionId: number;
  price: number;
  level: (typeof classLevel.enumValues)[number];
  capacity: number | null;
  bookingUrl: string;
  bookingType: (typeof bookingType.enumValues)[number];
  description: string | null;
  teaserVideoId: string | null;
  startTime: string;
  endTime: string;
};

// 앵콜 클래스 등록 폼에 미리 채울 원 클래스 값 (F-12 복사해서 만들기). 날짜만 새로 넣는다
export async function getEncoreSource(classId: number): Promise<EncoreSource | null> {
  const db = getDb();
  const [c] = await db
    .select({
      classId: classes.id,
      instructorId: classes.instructorId,
      title: classes.title,
      placeId: classes.placeId,
      studioName: classes.studioName,
      address: classes.address,
      regionId: classes.regionId,
      price: classes.price,
      level: classes.level,
      capacity: classes.capacity,
      bookingUrl: classes.bookingUrl,
      bookingType: classes.bookingType,
      description: classes.description,
      teaserVideoId: classes.teaserVideoId,
      startTime: sql<string>`to_char(${classes.startsAt} at time zone 'Asia/Seoul', 'HH24:MI')`,
      endTime: sql<string>`to_char(${classes.endsAt} at time zone 'Asia/Seoul', 'HH24:MI')`,
    })
    .from(classes)
    .where(eq(classes.id, classId));
  if (!c) return null;
  const songRows = await db
    .select({ id: songs.id, title: songs.title, artistName: artists.name })
    .from(classSongs)
    .innerJoin(songs, eq(songs.id, classSongs.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(eq(classSongs.classId, classId))
    .orderBy(asc(classSongs.position));
  return { ...c, songs: songRows.map((s) => ({ id: s.id, label: `${s.title} - ${s.artistName}` })) };
}

// ── 클래스 관리 (F-17, specs/admin-classes) ─────────────────────────────

export type AdminClassStatus = (typeof classStatus.enumValues)[number];
export const ADMIN_CLASS_STATUSES = classStatus.enumValues;

// 화면 상태: 취소 > 종료 시각 지남 = ended > DB 상태 (자동 종료 배치가 없다)
const displayStatus = sql<AdminClassStatus>`case when ${classes.status} = 'canceled' then 'canceled' when ${classes.endsAt} <= now() then 'ended' else ${classes.status}::text end`;
const isPublicSql = sql<boolean>`not ${classes.isHidden} and ${instructorProfiles.status} = 'approved' and (not ${instructorProfiles.isProxy} or ${instructorProfiles.consentAt} is not null)`;
const bookingClicksSql = sql<number>`(select count(*)::int from ${events} where ${events.classId} = ${classes.id} and ${events.type} = 'booking_click')`;
const encoreCountSql = sql<number>`(select count(*)::int from encores e where e.class_id = ${classes.id} and e.canceled_at is null)`;

export type AdminClassFilters = { status?: AdminClassStatus | null; instructorId?: number | null; regionId?: number | null; q?: string | null; hiddenOnly?: boolean };

export type AdminClassListRow = {
  id: number;
  title: string;
  startsAt: Date;
  instructorName: string;
  regionName: string;
  songTitle: string;
  isHidden: boolean;
  isPublic: boolean;
  status: AdminClassStatus;
  bookingClicks: number;
  encoreCount: number;
};

export function parseAdminClassFilters(params: URLSearchParams): AdminClassFilters {
  const status = params.get("status");
  const instructor = Number(params.get("instructor"));
  const region = Number(params.get("region"));
  return {
    status: status && (ADMIN_CLASS_STATUSES as readonly string[]).includes(status) ? (status as AdminClassStatus) : null,
    instructorId: Number.isInteger(instructor) && instructor > 0 ? instructor : null,
    regionId: Number.isInteger(region) && region > 0 ? region : null,
    q: (params.get("q") ?? "").trim().slice(0, 50) || null,
    hiddenOnly: params.get("hidden") === "1",
  };
}

// 전체 클래스 (지난 것 포함), 시작 최근순. 검색어는 클래스 이름·대표 곡·아티스트
export async function listClassesForAdmin(filters: AdminClassFilters = {}, limit = 200): Promise<AdminClassListRow[]> {
  // LIKE 와일드카드는 뺀다. 빼고 나서 비면 검색어가 없는 것
  const stripped = filters.q?.replace(/[%_]/g, "").trim() ?? "";
  const like = stripped ? `%${stripped}%` : null;
  return getDb()
    .select({
      id: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      instructorName: instructorProfiles.displayName,
      regionName: regions.shortName,
      songTitle: songs.title,
      isHidden: classes.isHidden,
      isPublic: isPublicSql,
      status: displayStatus,
      bookingClicks: bookingClicksSql,
      encoreCount: encoreCountSql,
    })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .innerJoin(classSongs, and(eq(classSongs.classId, classes.id), eq(classSongs.position, 1)))
    .innerJoin(songs, eq(songs.id, classSongs.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(
      and(
        filters.status ? sql`${displayStatus} = ${filters.status}` : undefined,
        filters.instructorId ? eq(classes.instructorId, filters.instructorId) : undefined,
        filters.regionId ? eq(classes.regionId, filters.regionId) : undefined,
        like ? or(ilike(classes.title, like), ilike(songs.title, like), ilike(artists.name, like)) : undefined,
        filters.hiddenOnly ? eq(classes.isHidden, true) : undefined,
      ),
    )
    .orderBy(desc(classes.startsAt), desc(classes.id))
    .limit(limit);
}

export type AdminClassDetail = EncoreSource & {
  id: number;
  date: string;
  isHidden: boolean;
  isPublic: boolean;
  status: AdminClassStatus;
  rawStatus: AdminClassStatus;
  createdByAdmin: boolean;
  instructorName: string;
  instagramHandle: string;
  cancelReason: string | null;
  bookingClicks: number;
  encoreCount: number;
  hasEncore: boolean;
};

export async function getClassForAdmin(classId: number): Promise<AdminClassDetail | null> {
  const src = await getEncoreSource(classId);
  if (!src) return null;
  const [row] = await getDb()
    .select({
      date: sql<string>`to_char(${classes.startsAt} at time zone 'Asia/Seoul', 'YYYY-MM-DD')`,
      isHidden: classes.isHidden,
      isPublic: isPublicSql,
      status: displayStatus,
      rawStatus: classes.status,
      createdByAdmin: classes.createdByAdmin,
      instructorName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      cancelReason: classes.cancelReason,
      bookingClicks: bookingClicksSql,
      encoreCount: encoreCountSql,
      hasEncore: sql<boolean>`exists (select 1 from ${encoreRounds} where ${encoreRounds.classId} = ${classes.id})`,
    })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .where(eq(classes.id, classId))
    .limit(1);
  if (!row) return null;
  return { ...src, ...row, id: src.classId };
}

// 숨김: 신고·오류. 상태는 건드리지 않고 수강생 화면에서만 빠진다 (publiclyVisible)
export async function setClassHidden(classId: number, hidden: boolean): Promise<void> {
  const [updated] = await getDb().update(classes).set({ isHidden: hidden, updatedAt: sql`now()` }).where(eq(classes.id, classId)).returning({ id: classes.id });
  if (!updated) throw new AdminInputError("없는 클래스예요");
}

export const bookingUrlInput = classInput.shape.bookingUrl;

// 예약 링크 수정: 유형은 주소로 다시 정한다. 일시·장소가 아니라 "변경됨"은 남기지 않는다
export async function updateBookingUrl(classId: number, url: string): Promise<{ bookingType: (typeof bookingType.enumValues)[number] }> {
  const parsed = bookingUrlInput.safeParse(url);
  if (!parsed.success) throw new AdminInputError(parsed.error.issues[0]?.message ?? "예약 링크를 확인해 주세요");
  const type = guessBookingType(parsed.data);
  const [updated] = await getDb()
    .update(classes)
    .set({ bookingUrl: parsed.data, bookingType: type, updatedAt: sql`now()` })
    .where(eq(classes.id, classId))
    .returning({ id: classes.id });
  if (!updated) throw new AdminInputError("없는 클래스예요");
  return { bookingType: type };
}

// 강제 종료: 시작 전이라도 끝난 클래스로. 되돌리지 않는다
export async function endClass(classId: number): Promise<void> {
  const [updated] = await getDb()
    .update(classes)
    .set({ status: "ended", updatedAt: sql`now()` })
    .where(and(eq(classes.id, classId), inArray(classes.status, ["open", "closing_soon", "closed"]), gt(classes.endsAt, sql`now()`)))
    .returning({ id: classes.id });
  if (!updated) throw new AdminInputError("이미 끝났거나 취소한 클래스예요");
}

export const ADMIN_CANCEL_REASONS = { instructor_request: "강사 요청", error: "등록 오류", other: "기타" } as const;
export const adminCancelReason = z.enum(["instructor_request", "error", "other"]);

// 운영자 취소: 종료·취소 아닌 클래스만. 되돌리지 않는다
export async function cancelClassByAdmin(classId: number, reason: z.infer<typeof adminCancelReason>): Promise<void> {
  const [updated] = await getDb()
    .update(classes)
    .set({ status: "canceled", cancelReason: `운영자 · ${ADMIN_CANCEL_REASONS[reason]}`, updatedAt: sql`now()` })
    .where(and(eq(classes.id, classId), inArray(classes.status, ["open", "closing_soon", "closed"]), gt(classes.endsAt, sql`now()`)))
    .returning({ id: classes.id });
  if (!updated) throw new AdminInputError("이미 끝났거나 취소한 클래스예요");
}
