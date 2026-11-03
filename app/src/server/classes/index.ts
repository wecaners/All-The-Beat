import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, lt, min, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { artists, bookingType, classes, classSongs, classStatus, instructorPlaces, instructorProfiles, regions, songs, studioPhotos } from "@/db/schema";
import { type Facility, isFacility } from "@/lib/facilities";
import { mediaUrl } from "@/server/media";
import { visibleVideoId } from "@/server/songs";

export type ClassCard = {
  id: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  regionName: string;
  price: number;
  level: "intro" | "beginner" | "intermediate_plus";
  status: "open" | "closing_soon";
  instructorName: string;
};

// 수강생에게 보여도 되는 클래스: 숨김 아님 + 승인된 강사 + 대리 등록이면 게재 동의 있음 (F-15)
// instructorProfiles를 join한 쿼리에서만 쓴다
export const publiclyVisible = and(
  eq(classes.isHidden, false),
  eq(instructorProfiles.status, "approved"),
  or(eq(instructorProfiles.isProxy, false), isNotNull(instructorProfiles.consentAt)),
);

// 곡 상세의 "다가오는 클래스" (F-04): 모집중·마감 임박, 날짜 가까운 순
export async function listUpcomingClassesForSong(songId: number, limit = 20): Promise<ClassCard[]> {
  const rows = await getDb()
    .select({
      id: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      endsAt: classes.endsAt,
      regionName: regions.shortName,
      price: classes.price,
      level: classes.level,
      status: classes.status,
      instructorName: instructorProfiles.displayName,
    })
    .from(classSongs)
    .innerJoin(classes, eq(classes.id, classSongs.classId))
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .where(
      and(
        eq(classSongs.songId, songId),
        inArray(classes.status, ["open", "closing_soon"]),
        gt(classes.startsAt, sql`now()`),
        publiclyVisible,
      ),
    )
    .orderBy(asc(classes.startsAt))
    .limit(limit);

  return rows as ClassCard[];
}

// 화면에 보여줄 상태. 자동 종료 배치가 없어 종료 시각이 지나도 DB에는 open으로 남으므로 시각으로 판단한다 (specs/class-detail findings)
export type ClassDisplayStatus = (typeof classStatus.enumValues)[number];

export function displayStatusOf(status: ClassDisplayStatus, ended: boolean): ClassDisplayStatus {
  if (status === "canceled") return "canceled";
  if (ended) return "ended";
  return status;
}

export function canBook(status: ClassDisplayStatus): boolean {
  return status === "open" || status === "closing_soon";
}

// 종료 시각 비교는 DB 안에서 (timestamptz와 JS Date의 정밀도 차이를 피한다)
export const classEnded = sql<boolean>`${classes.endsAt} <= now()`;

// URL의 클래스 번호. 숫자만 받는다 ("0x10", "1e3" 같은 다른 표기로 같은 클래스가 열리지 않게)
export const classIdInput = z
  .string()
  .regex(/^[1-9][0-9]{0,14}$/)
  .transform(Number);

export type ClassDetail = {
  id: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  studioName: string;
  address: string;
  regionName: string;
  price: number;
  level: "intro" | "beginner" | "intermediate_plus";
  capacity: number | null;
  bookingType: (typeof bookingType.enumValues)[number];
  description: string | null;
  status: ClassDisplayStatus;
  canBook: boolean;
  /** 사진·소개·포트폴리오는 대리 등록 강사면 사진·영상 게재 동의가 있을 때만 (FR-12) */
  instructor: {
    displayName: string;
    instagramHandle: string;
    photoUrl: string | null;
    bio: string | null;
    portfolioVideoIds: string[];
  };
  /** 스튜디오의 지금 값 (이름·주소는 클래스 스냅샷을 쓴다, FR-8). 연결된 스튜디오가 없으면 비어 있다 */
  studio: {
    lat: number | null;
    lng: number | null;
    kakaoPlaceUrl: string | null;
    facilities: Facility[];
    photos: { url: string; thumbUrl: string }[];
  };
  /** position 순. 첫 곡이 대표 곡 */
  songs: { slug: string; title: string; artistName: string; videoId: string | null }[];
  /** 앵콜 클래스면 원 클래스 id (원 클래스가 공개일 때만, F-24) */
  encoreOfClassId: number | null;
};

// 클래스 상세 (F-05). 공개되지 않았거나 없으면 null — 존재 여부를 드러내지 않는다
export async function getPublicClass(rawId: string): Promise<ClassDetail | null> {
  const parsed = classIdInput.safeParse(rawId);
  if (!parsed.success) return null;
  const id = parsed.data;
  const db = getDb();

  const [row] = await db
    .select({
      id: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      endsAt: classes.endsAt,
      studioName: classes.studioName,
      address: classes.address,
      regionName: regions.shortName,
      price: classes.price,
      level: classes.level,
      capacity: classes.capacity,
      bookingType: classes.bookingType,
      description: classes.description,
      status: classes.status,
      ended: classEnded,
      instructorName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      isProxy: instructorProfiles.isProxy,
      mediaConsent: instructorProfiles.mediaConsent,
      photoPath: instructorProfiles.photoPath,
      bio: instructorProfiles.bio,
      portfolioVideoIds: instructorProfiles.portfolioVideoIds,
      placeId: classes.placeId,
      lat: instructorPlaces.lat,
      lng: instructorPlaces.lng,
      kakaoPlaceUrl: instructorPlaces.kakaoPlaceUrl,
      facilities: instructorPlaces.facilities,
      encoreOfClassId: classes.encoreOfClassId,
    })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .leftJoin(instructorPlaces, eq(instructorPlaces.id, classes.placeId))
    .where(and(eq(classes.id, id), publiclyVisible));
  if (!row) return null;

  const photoRows = row.placeId
    ? await db
        .select({ path: studioPhotos.path, thumbPath: studioPhotos.thumbPath })
        .from(studioPhotos)
        .where(eq(studioPhotos.placeId, row.placeId))
        .orderBy(asc(studioPhotos.position), asc(studioPhotos.id))
    : [];
  const showMedia = !row.isProxy || row.mediaConsent;

  const songRows = await db
    .select({ slug: songs.slug, title: songs.title, artistName: artists.name, videoId: visibleVideoId })
    .from(classSongs)
    .innerJoin(songs, eq(songs.id, classSongs.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(eq(classSongs.classId, id))
    .orderBy(asc(classSongs.position));

  const [encoreOf] = row.encoreOfClassId
    ? await db
        .select({ id: classes.id })
        .from(classes)
        .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
        .where(and(eq(classes.id, row.encoreOfClassId), publiclyVisible))
    : [];

  const status = displayStatusOf(row.status, row.ended);
  return {
    id: row.id,
    title: row.title,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    studioName: row.studioName,
    address: row.address,
    regionName: row.regionName,
    price: row.price,
    level: row.level,
    capacity: row.capacity,
    bookingType: row.bookingType,
    description: row.description,
    status,
    canBook: canBook(status),
    instructor: {
      displayName: row.instructorName,
      instagramHandle: row.instagramHandle,
      photoUrl: showMedia && row.photoPath ? mediaUrl(row.photoPath) : null,
      bio: showMedia ? row.bio : null,
      portfolioVideoIds: showMedia ? row.portfolioVideoIds : [],
    },
    studio: {
      lat: row.lat,
      lng: row.lng,
      kakaoPlaceUrl: row.kakaoPlaceUrl,
      facilities: (row.facilities ?? []).filter(isFacility),
      // 연습실 사진도 강사가 준 사진이라 같은 동의를 따른다
      photos: showMedia ? photoRows.map((p) => ({ url: mediaUrl(p.path), thumbUrl: mediaUrl(p.thumbPath) })) : [],
    },
    songs: songRows,
    encoreOfClassId: encoreOf?.id ?? null,
  };
}

// 홈에 보여줄 수 있는 클래스: 공개 + 모집 중·마감 임박 + 아직 시작 전 (F-01)
const upcomingAndOpen = and(inArray(classes.status, ["open", "closing_soon"]), gt(classes.startsAt, sql`now()`), publiclyVisible);

export type UpcomingClassCard = {
  id: number;
  startsAt: Date;
  endsAt: Date;
  regionName: string;
  price: number;
  level: "intro" | "beginner" | "intermediate_plus";
  status: "open" | "closing_soon";
  /** 대표 곡 (position 1) */
  songTitle: string;
  artistName: string;
  videoId: string | null;
};

// 홈 "다가오는 클래스" (F-01): 시작이 가까운 순
export async function listUpcomingClasses(limit = 10): Promise<UpcomingClassCard[]> {
  const rows = await getDb()
    .select({
      id: classes.id,
      startsAt: classes.startsAt,
      endsAt: classes.endsAt,
      regionName: regions.shortName,
      price: classes.price,
      level: classes.level,
      status: classes.status,
      songTitle: songs.title,
      artistName: artists.name,
      videoId: visibleVideoId,
    })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .innerJoin(classSongs, and(eq(classSongs.classId, classes.id), eq(classSongs.position, 1)))
    .innerJoin(songs, eq(songs.id, classSongs.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(upcomingAndOpen)
    .orderBy(asc(classes.startsAt), asc(classes.id))
    .limit(limit);

  return rows as UpcomingClassCard[];
}

export type HotSong = { slug: string; title: string; artistName: string; videoId: string | null; classCount: number };

// 홈 "이번 주 핫한 곡" (F-01): 지금부터 7일 안에 시작하는 클래스가 많은 곡. 같으면 더 빨리 열리는 곡 먼저
export async function listHotSongsThisWeek(limit = 10): Promise<HotSong[]> {
  return getDb()
    .select({
      slug: songs.slug,
      title: songs.title,
      artistName: artists.name,
      videoId: visibleVideoId,
      classCount: count(classes.id),
    })
    .from(classSongs)
    .innerJoin(classes, eq(classes.id, classSongs.classId))
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(songs, eq(songs.id, classSongs.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(and(upcomingAndOpen, lt(classes.startsAt, sql`now() + interval '7 days'`), isNull(songs.mergedIntoId)))
    .groupBy(songs.id, artists.name)
    .orderBy(desc(count(classes.id)), asc(min(classes.startsAt)))
    .limit(limit);
}
