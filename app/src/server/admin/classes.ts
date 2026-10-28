import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import {
  bookingType,
  classes,
  classLevel,
  classSongs,
  instructorPlaces,
  instructorProfiles,
  regionMappings,
  regions,
  songs,
} from "@/db/schema";
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
  })
  .refine((v) => v.date >= todayKst(), { message: "오늘 이후 날짜만 등록할 수 있어요", path: ["date"] })
  .refine((v) => v.endTime > v.startTime, { message: "종료 시간이 시작 시간보다 늦어야 해요", path: ["endTime"] })
  .refine((v) => v.placeId || (v.studioName && v.address), { message: "장소를 고르거나 스튜디오 이름과 주소를 넣어 주세요", path: ["studioName"] });
export type ClassInput = z.infer<typeof classInput>;

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

export type ClassSongOption = { id: number; label: string };

export async function listSongOptions(): Promise<ClassSongOption[]> {
  const rows = await getDb()
    .select({ id: songs.id, title: songs.title, artist: sql<string>`(select name from artists where artists.id = ${songs.artistId})` })
    .from(songs)
    .where(isNull(songs.mergedIntoId))
    .orderBy(asc(songs.title));
  return rows.map((r) => ({ id: r.id, label: `${r.title} - ${r.artist}` }));
}

// 클래스 대리 등록 (F-15). 공개 조건을 만족하면 그 자리에서 추가요를 연다 (FR-14)
export async function createClassByAdmin(input: ClassInput): Promise<{ id: number; isPublic: boolean; openedRequests: number }> {
  const startsAt = kstDateTime(input.date, input.startTime);
  const endsAt = kstDateTime(input.date, input.endTime);
  if (startsAt <= new Date()) throw new AdminInputError("이미 지난 시간이에요");

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
        createdByAdmin: true,
      })
      .returning({ id: classes.id });

    await tx.insert(classSongs).values(input.songIds.map((songId, i) => ({ classId: created.id, songId, position: i + 1 })));

    const isPublic = instructor.status === "approved" && (!instructor.isProxy || instructor.consentAt !== null);
    const openedRequests = isPublic ? await openRequestsForClass(tx, created.id, input.songIds) : 0;
    return { id: created.id, isPublic, openedRequests };
  });
}

export type AdminClassRow = {
  id: number;
  title: string;
  startsAt: Date;
  instructorName: string;
  regionName: string;
  isPublic: boolean;
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
    })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .where(gt(classes.endsAt, sql`now()`))
    .orderBy(asc(classes.startsAt))
    .limit(limit);
}
