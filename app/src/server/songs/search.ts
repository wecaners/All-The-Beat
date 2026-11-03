import { and, asc, count, countDistinct, eq, gt, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artists, classes, classSongs, instructorProfiles, requests, songs } from "@/db/schema";
import { normalizeAlias } from "@/lib/normalize";
import { publiclyVisible } from "@/server/classes";
import { visibleVideoId } from "./index";

// 곡 상세의 기다리는 수와 같은 기준 (03 명세 F-04)
const WAITING_DAYS = 90;

export type SongSearchResult = {
  id: number;
  slug: string;
  title: string;
  artistName: string;
  videoId: string | null;
  upcomingClasses: number;
  waiting: number;
};

// 검색어에 걸리는 곡 id → 점수. 검색 결과(F-02)와 클래스 목록의 검색어 필터(F-03)가 같이 쓴다.
// 제목·대표 이름도 별칭 행이라 곡 별칭과 아티스트 별칭만 보면 된다. 정규화 결과에는 %·_가 남지 않아 LIKE에 그대로 넣는다
export async function matchSongIds(raw: string): Promise<Map<number, number>> {
  const q = normalizeAlias(raw.slice(0, 50));
  if (!q) return new Map();

  // 점수: 곡 이름 정확 6 > 아티스트 정확 5 > 곡 앞부분 4 > 아티스트 앞부분 3 > 곡 포함 2 > 아티스트 포함 1
  const hits = await getDb().execute<{ song_id: string | number; score: number }>(sql`
    select song_id, max(score)::int as score from (
      select sa.song_id,
        case when sa.alias_norm = ${q} then 6 when sa.alias_norm like ${`${q}%`} then 4 else 2 end as score
      from song_aliases sa
      where sa.alias_norm like ${`%${q}%`}
      union all
      select s.id,
        case when aa.alias_norm = ${q} then 5 when aa.alias_norm like ${`${q}%`} then 3 else 1 end
      from artist_aliases aa join songs s on s.artist_id = aa.artist_id
      where aa.alias_norm like ${`%${q}%`}
    ) h
    group by song_id
  `);
  return new Map(hits.map((h) => [Number(h.song_id), h.score]));
}

// 곡 검색 (F-02, F-13). 수강생 검색 화면과 운영자 곡 고르기가 같이 쓴다 (specs/search)
export async function searchSongs(raw: string, limit = 20): Promise<SongSearchResult[]> {
  const scoreOf = await matchSongIds(raw);
  if (scoreOf.size === 0) return [];
  const db = getDb();
  const ids = [...scoreOf.keys()];

  const [rows, upcoming, waiting] = await Promise.all([
    db
      .select({ id: songs.id, slug: songs.slug, title: songs.title, artistName: artists.name, videoId: visibleVideoId })
      .from(songs)
      .innerJoin(artists, eq(artists.id, songs.artistId))
      .where(and(inArray(songs.id, ids), isNull(songs.mergedIntoId), isNull(artists.mergedIntoId))),
    db
      .select({ songId: classSongs.songId, n: countDistinct(classes.id) })
      .from(classSongs)
      .innerJoin(classes, eq(classes.id, classSongs.classId))
      .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
      .where(
        and(
          inArray(classSongs.songId, ids),
          inArray(classes.status, ["open", "closing_soon"]),
          gt(classes.startsAt, sql`now()`),
          publiclyVisible,
        ),
      )
      .groupBy(classSongs.songId),
    db
      .select({ songId: requests.songId, n: count() })
      .from(requests)
      .where(
        and(
          inArray(requests.songId, ids),
          ne(requests.status, "canceled"),
          gte(requests.createdAt, sql`now() - make_interval(days => ${WAITING_DAYS})`),
        ),
      )
      .groupBy(requests.songId)
      .orderBy(asc(requests.songId)),
  ]);

  const upcomingOf = new Map(upcoming.map((r) => [r.songId, r.n]));
  const waitingOf = new Map(waiting.map((r) => [r.songId, r.n]));
  return rows
    .map((r) => ({ ...r, upcomingClasses: upcomingOf.get(r.id) ?? 0, waiting: waitingOf.get(r.id) ?? 0 }))
    .sort(
      (a, b) =>
        (scoreOf.get(b.id) ?? 0) - (scoreOf.get(a.id) ?? 0) ||
        b.upcomingClasses - a.upcomingClasses ||
        b.waiting - a.waiting ||
        a.title.localeCompare(b.title, "ko"),
    )
    .slice(0, limit);
}
