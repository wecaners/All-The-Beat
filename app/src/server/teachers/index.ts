import { and, asc, count, desc, eq, gt, inArray, isNotNull, lte, max, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artists, classes, classSongs, instructorProfiles, instructorRegions, regions, songs } from "@/db/schema";
import { mediaUrl } from "@/server/media";
import { visibleVideoId } from "@/server/songs";

// 강사 프로필 페이지 (F-21, specs/teacher-profile). 누구나 본다

export type TeacherClass = {
  id: number;
  startsAt: Date;
  endsAt: Date;
  regionName: string;
  price: number;
  level: "intro" | "beginner" | "intermediate_plus";
  status: "open" | "closing_soon" | "closed";
  /** 대표 곡 (position 1) */
  songTitle: string;
  artistName: string;
  videoId: string | null;
};

export type TeacherSong = { slug: string; title: string; artistName: string; videoId: string | null; times: number };

export type TeacherProfile = {
  displayName: string;
  instagramHandle: string;
  regionNames: string[];
  photoUrl: string | null;
  bio: string | null;
  portfolioVideoIds: string[];
  upcoming: TeacherClass[];
  pastSongs: TeacherSong[];
};

// 주소의 아이디: "%40Minji.Dance" → "minji.dance". 인스타 아이디는 대소문자를 구분하지 않고 소문자로 저장돼 있다
export function normalizeTeacherHandle(raw: string): string {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // 잘못된 인코딩은 그대로 둔다(찾지 못해 없는 페이지가 된다)
  }
  return value.trim().replace(/^@+/, "").toLowerCase();
}

// 수강생에게 보여도 되는 강사: 승인 + (직접 강사 또는 게재 동의). 클래스 공개 조건(publiclyVisible)의 강사 쪽과 같다.
// 정지(탈퇴 포함)·대기·반려·동의 전 대리 강사는 없는 강사로 다룬다
const visibleTeacher = and(eq(instructorProfiles.status, "approved"), or(eq(instructorProfiles.isProxy, false), isNotNull(instructorProfiles.consentAt)));

export async function getTeacherProfile(rawHandle: string): Promise<TeacherProfile | null> {
  const handle = normalizeTeacherHandle(rawHandle);
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return null;
  const db = getDb();

  const [t] = await db
    .select({
      id: instructorProfiles.id,
      displayName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      isProxy: instructorProfiles.isProxy,
      mediaConsent: instructorProfiles.mediaConsent,
      photoPath: instructorProfiles.photoPath,
      bio: instructorProfiles.bio,
      portfolioVideoIds: instructorProfiles.portfolioVideoIds,
    })
    .from(instructorProfiles)
    .where(and(eq(instructorProfiles.instagramHandle, handle), visibleTeacher))
    .limit(1);
  if (!t) return null;

  // 사진·소개·영상은 클래스 상세와 같은 규칙: 대리 등록이면 사진·영상 게재 동의가 있을 때만 (specs/instructor-studio)
  const showMedia = !t.isProxy || t.mediaConsent;
  const mine = and(eq(classes.instructorId, t.id), eq(classes.isHidden, false));

  const [regionRows, upcoming, pastSongs] = await Promise.all([
    db
      .select({ name: regions.shortName })
      .from(instructorRegions)
      .innerJoin(regions, eq(regions.id, instructorRegions.regionId))
      .where(eq(instructorRegions.instructorId, t.id))
      .orderBy(asc(regions.sortOrder)),
    // 다가오는 클래스: 시작 전, 마감도 보여 앵콜하러 갈 수 있게 (F-24)
    db
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
      .innerJoin(regions, eq(regions.id, classes.regionId))
      .innerJoin(classSongs, and(eq(classSongs.classId, classes.id), eq(classSongs.position, 1)))
      .innerJoin(songs, eq(songs.id, classSongs.songId))
      .innerJoin(artists, eq(artists.id, songs.artistId))
      .where(and(mine, inArray(classes.status, ["open", "closing_soon", "closed"]), gt(classes.startsAt, sql`now()`)))
      .orderBy(asc(classes.startsAt), asc(classes.id)),
    // 가르쳐 온 곡: 이미 시작한(지난) 클래스의 곡, 최근에 가르친 순 (F-21 "지난 클래스(곡 목록)")
    db
      .select({ slug: songs.slug, title: songs.title, artistName: artists.name, videoId: visibleVideoId, times: count(classes.id) })
      .from(classSongs)
      .innerJoin(classes, eq(classes.id, classSongs.classId))
      .innerJoin(songs, eq(songs.id, classSongs.songId))
      .innerJoin(artists, eq(artists.id, songs.artistId))
      .where(and(mine, ne(classes.status, "canceled"), lte(classes.startsAt, sql`now()`)))
      .groupBy(songs.id, artists.name)
      .orderBy(desc(max(classes.startsAt)), asc(songs.id)),
  ]);

  return {
    displayName: t.displayName,
    instagramHandle: t.instagramHandle,
    regionNames: regionRows.map((r) => r.name),
    photoUrl: showMedia && t.photoPath ? mediaUrl(t.photoPath) : null,
    bio: showMedia ? t.bio : null,
    portfolioVideoIds: showMedia ? t.portfolioVideoIds : [],
    upcoming: upcoming as TeacherClass[],
    pastSongs,
  };
}
