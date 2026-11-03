import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artists, classes, classSongs, favorites, instructorProfiles, regions, songs } from "@/db/schema";
import { type ClassDisplayStatus, classEnded, displayStatusOf, publiclyVisible } from "@/server/classes";
import { visibleVideoId } from "@/server/songs";

// 찜 (F-22, specs/favorites). 사용자 × 클래스 1건은 PK가 지킨다

export class FavoriteError extends Error {}

export async function isFavorite(userId: string, classId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ classId: favorites.classId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.classId, classId)))
    .limit(1);
  return !!row;
}

// 켜기: 공개 클래스만, 이미 있으면 그대로. 끄기: 지운다 (취소 시각을 남기지 않는다)
export async function setFavorite(userId: string, classId: number, on: boolean): Promise<void> {
  const db = getDb();
  if (!on) {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.classId, classId)));
    return;
  }
  const [target] = await db
    .select({ id: classes.id })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .where(and(eq(classes.id, classId), publiclyVisible))
    .limit(1);
  if (!target) throw new FavoriteError("없는 클래스예요");
  await db.insert(favorites).values({ userId, classId }).onConflictDoNothing();
}

export type FavoriteItem = {
  classId: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  regionName: string;
  price: number;
  level: "intro" | "beginner" | "intermediate_plus";
  /** 화면 상태 (끝남은 시각으로) */
  status: ClassDisplayStatus;
  /** 대표 곡 */
  songTitle: string;
  artistName: string;
  videoId: string | null;
};

// 내 찜: 다가오는 것(끝나지 않고 취소 아님)이 날짜 순으로 먼저, 지난·취소된 것은 최근 시작 순으로 뒤에. 공개 아닌 클래스는 뺀다
export async function listMyFavorites(userId: string): Promise<FavoriteItem[]> {
  const past = sql<boolean>`${classEnded} or ${classes.status} = 'canceled'`;
  const rows = await getDb()
    .select({
      classId: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      endsAt: classes.endsAt,
      regionName: regions.shortName,
      price: classes.price,
      level: classes.level,
      status: classes.status,
      ended: classEnded,
      past,
      songTitle: songs.title,
      artistName: artists.name,
      videoId: visibleVideoId,
    })
    .from(favorites)
    .innerJoin(classes, eq(classes.id, favorites.classId))
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .innerJoin(classSongs, and(eq(classSongs.classId, classes.id), eq(classSongs.position, 1)))
    .innerJoin(songs, eq(songs.id, classSongs.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(and(eq(favorites.userId, userId), publiclyVisible))
    .orderBy(asc(past), sql`case when ${past} then null else ${classes.startsAt} end asc`, desc(classes.startsAt));

  return rows.map(({ ended, past: _past, status, ...rest }) => ({ ...rest, status: displayStatusOf(status, ended) })); // eslint-disable-line @typescript-eslint/no-unused-vars
}
