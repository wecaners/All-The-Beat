import { and, count, countDistinct, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, max, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { artists, classes, classSongs, instructorProfiles, regions, requests, songs, timePref } from "@/db/schema";
import { publiclyVisible } from "@/server/classes";
import { isRequestableSong, visibleVideoId } from "@/server/songs";

// 곡 상세의 추가요 수는 최근 90일 기준 (03 명세 F-04)
const SUMMARY_DAYS = 90;
// 홈의 추가요 TOP과 랭킹은 "요즘" 기다리는 곡이라 최근 30일 (03 명세 F-01·F-08)
const TOP_DAYS = 30;
// 랭킹 (F-08): 3명 미만은 빼고 50위까지. "이번 주"와 "지난주 순위"는 7일
const RANK_MIN = 3;
const RANK_LIMIT = 50;
const WEEK_DAYS = 7;

export const requestInput = z.object({
  regionId: z.number().int().positive().nullable(), // null = 어디든 좋아요
  timePref: z.enum(timePref.enumValues).default("any"),
  message: z
    .string()
    .trim()
    .max(100, "한마디는 100자까지예요")
    .transform((v) => v || null)
    .nullable()
    .default(null),
});
export type RequestInput = z.infer<typeof requestInput>;

export type MyRequest = {
  status: "waiting" | "opened" | "canceled";
  regionId: number | null;
  timePref: RequestInput["timePref"];
  message: string | null;
};

export type RequestSummary = {
  total: number;
  topRegions: { name: string; count: number }[];
};

export async function getRequestSummary(songId: number): Promise<RequestSummary> {
  const db = getDb();
  const recent = and(
    eq(requests.songId, songId),
    ne(requests.status, "canceled"),
    gte(requests.createdAt, sql`now() - make_interval(days => ${SUMMARY_DAYS})`),
  );

  const [[{ total }], topRegions] = await Promise.all([
    db.select({ total: count() }).from(requests).where(recent),
    db
      .select({ name: regions.shortName, count: count() })
      .from(requests)
      .innerJoin(regions, eq(regions.id, requests.regionId))
      .where(and(recent, isNotNull(requests.regionId)))
      .groupBy(regions.id, regions.shortName)
      .orderBy(desc(count()), regions.sortOrder)
      .limit(3),
  ]);

  return { total, topRegions };
}

export async function getMyRequest(userId: string, songId: number): Promise<MyRequest | null> {
  const [row] = await getDb()
    .select({ status: requests.status, regionId: requests.regionId, timePref: requests.timePref, message: requests.message })
    .from(requests)
    .where(and(eq(requests.userId, userId), eq(requests.songId, songId)))
    .limit(1);
  return row ?? null;
}

export class RequestError extends Error {}

// 사용자 × 곡 = 1건 (UK). 처음이면 만들고, 있으면 권역·시간대·한마디를 고친다.
// 취소했던 걸 다시 하면 waiting으로 되돌리고 created_at을 지금으로 바꾼다: "최근 90일" 집계에 새 요청으로 잡히게
export async function saveRequest(userId: string, songId: number, input: RequestInput) {
  if (!(await isRequestableSong(songId))) throw new RequestError("없는 곡이에요");
  if (input.regionId !== null) {
    const [region] = await getDb().select({ id: regions.id }).from(regions).where(eq(regions.id, input.regionId)).limit(1);
    if (!region) throw new RequestError("없는 권역이에요");
  }

  return getDb().transaction(async (tx) => {
    // 첫 추가요(처음이거나 취소 후 다시)일 때만 완료 순간을 보여준다 (specs/design-system FR-4)
    const [before] = await tx
      .select({ status: requests.status })
      .from(requests)
      .where(and(eq(requests.userId, userId), eq(requests.songId, songId)))
      .limit(1);
    const isNew = !before || before.status === "canceled";

    await tx
      .insert(requests)
      .values({ userId, songId, ...input })
      .onConflictDoUpdate({
        target: [requests.userId, requests.songId],
        set: {
          regionId: input.regionId,
          timePref: input.timePref,
          message: input.message,
          // 열렸어요(opened)는 수정해도 유지한다
          status: sql`case when ${requests.status} = 'canceled' then 'waiting'::request_status else ${requests.status} end`,
          createdAt: sql`case when ${requests.status} = 'canceled' then now() else ${requests.createdAt} end`,
          canceledAt: null,
        },
      });

    // 순번: 곡 상세와 같은 기준(최근 90일, 취소 제외)에서 내 요청까지의 수.
    // 내 생성 시각은 DB 안에서 비교한다. JS Date로 가져오면 마이크로초가 잘려 내 요청이 빠진다 (findings Issues 2)
    const mine = sql`(select ${requests.createdAt} from ${requests} where ${requests.userId} = ${userId} and ${requests.songId} = ${songId})`;
    const [{ position }] = await tx
      .select({ position: count() })
      .from(requests)
      .where(
        and(
          eq(requests.songId, songId),
          ne(requests.status, "canceled"),
          gte(requests.createdAt, sql`now() - make_interval(days => ${SUMMARY_DAYS})`),
          lte(requests.createdAt, mine),
        ),
      );

    return { isNew, position };
  });
}

export async function cancelRequest(userId: string, songId: number) {
  await getDb()
    .update(requests)
    .set({ status: "canceled", canceledAt: sql`now()` })
    .where(and(eq(requests.userId, userId), eq(requests.songId, songId), ne(requests.status, "canceled")));
}

export type TopRequestedSong = { slug: string; title: string; artistName: string; videoId: string | null; waiting: number };

// 홈 "추가요 TOP" (F-01): 최근 30일·취소 제외 추가요가 많은 곡. 같으면 최근에 요청이 들어온 곡 먼저. 병합된 곡은 뺀다
export async function listTopRequestedSongs(limit = 5): Promise<TopRequestedSong[]> {
  return getDb()
    .select({
      slug: songs.slug,
      title: songs.title,
      artistName: artists.name,
      videoId: visibleVideoId,
      waiting: count(requests.id),
    })
    .from(requests)
    .innerJoin(songs, eq(songs.id, requests.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(
      and(
        ne(requests.status, "canceled"),
        gte(requests.createdAt, sql`now() - make_interval(days => ${TOP_DAYS})`),
        isNull(songs.mergedIntoId),
      ),
    )
    .groupBy(songs.id, artists.name)
    .orderBy(desc(count(requests.id)), desc(max(requests.createdAt)))
    .limit(limit);
}

export type RankChange = { kind: "new" } | { kind: "same" } | { kind: "up" | "down"; by: number };

export type RankedSong = {
  rank: number;
  slug: string;
  title: string;
  artistName: string;
  videoId: string | null;
  /** 최근 30일 기다리는 수 */
  waiting: number;
  /** 그중 최근 7일에 들어온 수 */
  weekGain: number;
  /** 공개된 다가오는 클래스 수 (권역과 상관없다) */
  upcomingClasses: number;
  /** 7일 전 랭킹과 견준 변화 */
  change: RankChange;
};

// 추가요 랭킹 (F-08, specs/request-ranking). 집계 기준은 홈 TOP과 같고(30일·취소 제외·병합 곡 제외·같으면 최근 요청 먼저),
// 3명 미만은 빼고 50위까지. 권역을 주면 그 권역을 희망한 요청만 센다("어디든 좋아요"는 전체에만).
// 지난주 순위는 7일 전 시점의 랭킹을 같은 규칙으로 다시 계산한다: 그때까지 만들어졌고(30일 안) 그때 취소되지 않았던 요청
export async function listRequestRanking(regionId: number | null = null, limit = RANK_LIMIT): Promise<RankedSong[]> {
  const db = getDb();
  const weekAgo = sql`now() - make_interval(days => ${WEEK_DAYS})`;
  const inRegion = regionId === null ? undefined : eq(requests.regionId, regionId);
  const rankOrder = [desc(count(requests.id)), desc(max(requests.createdAt))];

  const [current, previous] = await Promise.all([
    db
      .select({
        id: songs.id,
        slug: songs.slug,
        title: songs.title,
        artistName: artists.name,
        videoId: visibleVideoId,
        waiting: count(requests.id),
        weekGain: count(sql`case when ${requests.createdAt} >= ${weekAgo} then 1 end`),
      })
      .from(requests)
      .innerJoin(songs, eq(songs.id, requests.songId))
      .innerJoin(artists, eq(artists.id, songs.artistId))
      .where(
        and(
          ne(requests.status, "canceled"),
          gte(requests.createdAt, sql`now() - make_interval(days => ${TOP_DAYS})`),
          isNull(songs.mergedIntoId),
          inRegion,
        ),
      )
      .groupBy(songs.id, artists.name)
      .having(gte(count(requests.id), RANK_MIN))
      .orderBy(...rankOrder)
      .limit(limit),
    db
      .select({ id: songs.id })
      .from(requests)
      .innerJoin(songs, eq(songs.id, requests.songId))
      .where(
        and(
          lt(requests.createdAt, weekAgo),
          gte(requests.createdAt, sql`now() - make_interval(days => ${TOP_DAYS + WEEK_DAYS})`),
          or(ne(requests.status, "canceled"), gte(requests.canceledAt, weekAgo)),
          isNull(songs.mergedIntoId),
          inRegion,
        ),
      )
      .groupBy(songs.id)
      .having(gte(count(requests.id), RANK_MIN))
      .orderBy(...rankOrder)
      .limit(limit),
  ]);
  if (current.length === 0) return [];

  // "클래스 N개 열림"은 검색 결과와 같은 기준 (공개·모집중·마감 임박·시작 전)
  const ids = current.map((r) => r.id);
  const upcoming = await db
    .select({ songId: classSongs.songId, n: countDistinct(classes.id) })
    .from(classSongs)
    .innerJoin(classes, eq(classes.id, classSongs.classId))
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .where(and(inArray(classSongs.songId, ids), inArray(classes.status, ["open", "closing_soon"]), gt(classes.startsAt, sql`now()`), publiclyVisible))
    .groupBy(classSongs.songId);
  const upcomingOf = new Map(upcoming.map((r) => [r.songId, r.n]));
  const prevRankOf = new Map(previous.map((r, i) => [r.id, i + 1]));

  return current.map(({ id, ...r }, i) => {
    const rank = i + 1;
    const prev = prevRankOf.get(id);
    const change: RankChange =
      prev === undefined ? { kind: "new" } : prev > rank ? { kind: "up", by: prev - rank } : prev < rank ? { kind: "down", by: rank - prev } : { kind: "same" };
    return { ...r, rank, upcomingClasses: upcomingOf.get(id) ?? 0, change };
  });
}
