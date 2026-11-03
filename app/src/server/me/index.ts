import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artists, classes, encoreRounds, encores, instructorProfiles, regions, requests, songs } from "@/db/schema";
import { publiclyVisible } from "@/server/classes";
import { activeEncoreCount, effectiveEncoreStatus, type EncoreStatus, encoreThreshold } from "@/server/encores";
import { visibleVideoId } from "@/server/songs";

// 마이 (F-10, specs/my-page). 로그인 사용자 id로만 읽는다. 수정·취소는 곡·클래스 상세에서 한다

// 곡 상세의 기다리는 수와 같은 기준 (최근 90일, 취소 제외)
const WAITING_DAYS = 90;

export type MyRequestItem = {
  songSlug: string;
  title: string;
  artistName: string;
  videoId: string | null;
  /** null = 어디든 좋아요 */
  regionName: string | null;
  createdAt: Date;
  status: "waiting" | "opened";
  /** 열린 클래스가 수강생에게 공개일 때만 */
  openedClassId: number | null;
  waiting: number;
};

// 내 추가요: 취소한 것은 빼고, 열린 것 먼저, 그다음 최근에 남긴 순
export async function listMyRequests(userId: string): Promise<MyRequestItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      songId: songs.id,
      songSlug: songs.slug,
      title: songs.title,
      artistName: artists.name,
      videoId: visibleVideoId,
      regionName: regions.shortName,
      createdAt: requests.createdAt,
      status: requests.status,
      fulfilledClassId: requests.fulfilledClassId,
      waiting: sql<number>`(select count(*)::int from ${requests} r2
        where r2.song_id = ${requests.songId} and r2.status <> 'canceled'
          and r2.created_at >= now() - make_interval(days => ${WAITING_DAYS}))`,
    })
    .from(requests)
    .innerJoin(songs, eq(songs.id, requests.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .leftJoin(regions, eq(regions.id, requests.regionId))
    .where(and(eq(requests.userId, userId), ne(requests.status, "canceled")))
    .orderBy(sql`${requests.status} = 'opened' desc`, desc(requests.createdAt));

  const fulfilledIds = rows.map((r) => r.fulfilledClassId).filter((id): id is number => id !== null);
  const visible = new Set(
    fulfilledIds.length === 0
      ? []
      : (
          await db
            .select({ id: classes.id })
            .from(classes)
            .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
            .where(and(inArray(classes.id, fulfilledIds), publiclyVisible))
        ).map((c) => c.id),
  );

  return rows.map((r) => ({
    songSlug: r.songSlug,
    title: r.title,
    artistName: r.artistName,
    videoId: r.videoId,
    regionName: r.regionName,
    createdAt: r.createdAt,
    status: r.status === "opened" ? "opened" : "waiting",
    openedClassId: r.status === "opened" && r.fulfilledClassId && visible.has(r.fulfilledClassId) ? r.fulfilledClassId : null,
    waiting: r.waiting,
  }));
}

export type MyEncoreItem = {
  classId: number;
  title: string;
  startsAt: Date;
  instructorName: string;
  status: EncoreStatus;
  count: number;
  threshold: number;
  /** 앵콜 클래스가 열렸고 공개일 때만 */
  encoreClassId: number | null;
};

// 내 앵콜: 취소한 것과 공개가 아닌 클래스는 빼고, 앵콜 클래스가 열린 것 먼저, 그다음 최근에 남긴 순.
// 상태·인원·기준은 클래스 상세와 같은 계산 (src/server/encores)
export async function listMyEncores(userId: string): Promise<MyEncoreItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      classId: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      capacity: classes.capacity,
      instructorName: instructorProfiles.displayName,
      status: effectiveEncoreStatus,
      count: activeEncoreCount(classes.id),
      threshold: encoreRounds.threshold,
      encoreClassId: encoreRounds.encoreClassId,
    })
    .from(encores)
    .innerJoin(classes, eq(classes.id, encores.classId))
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .leftJoin(encoreRounds, eq(encoreRounds.classId, classes.id))
    .where(and(eq(encores.userId, userId), isNull(encores.canceledAt), publiclyVisible))
    .orderBy(sql`${encoreRounds.status} = 'opened' desc nulls last`, desc(encores.createdAt));

  const openedIds = rows.filter((r) => r.status === "opened" && r.encoreClassId).map((r) => r.encoreClassId!);
  const visible = new Set(
    openedIds.length === 0
      ? []
      : (
          await db
            .select({ id: classes.id })
            .from(classes)
            .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
            .where(and(inArray(classes.id, openedIds), publiclyVisible))
        ).map((c) => c.id),
  );

  return rows.map((r) => ({
    classId: r.classId,
    title: r.title,
    startsAt: r.startsAt,
    instructorName: r.instructorName,
    status: r.status,
    count: r.count,
    threshold: r.threshold ?? encoreThreshold(r.capacity),
    encoreClassId: r.status === "opened" && r.encoreClassId && visible.has(r.encoreClassId) ? r.encoreClassId : null,
  }));
}
