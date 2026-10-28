import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artists, songs } from "@/db/schema";

// 화면에 보여줄 영상 id. 퍼가기가 막힌 영상은 숨긴다 (06 문서). 곡 상세·클래스 상세·홈이 같이 쓴다
export const visibleVideoId = sql<string | null>`case when ${songs.videoEmbeddable} is not false then ${songs.ytVideoId} end`;

export type SongDetail = {
  id: number;
  slug: string;
  title: string;
  artistName: string;
  releaseDate: string | null;
  video: { id: string; type: "dance_practice" | "performance" | "mv" | null; title: string | null; channel: string | null } | null;
};

// 병합된 곡이면 대상 곡의 slug를 돌려준다 (옛 URL 리다이렉트, 09 ERD 7절)
export type SongLookup = { kind: "found"; song: SongDetail } | { kind: "merged"; slug: string } | { kind: "missing" };

export async function getSongBySlug(slug: string): Promise<SongLookup> {
  const db = getDb();
  const [row] = await db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artistName: artists.name,
      releaseDate: songs.releaseDate,
      mergedIntoId: songs.mergedIntoId,
      videoId: visibleVideoId,
      videoType: songs.videoType,
      videoTitle: songs.videoTitle,
      videoChannel: songs.videoChannel,
    })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(eq(songs.slug, slug))
    .limit(1);

  if (!row) return { kind: "missing" };

  if (row.mergedIntoId) {
    const [target] = await db.select({ slug: songs.slug }).from(songs).where(eq(songs.id, row.mergedIntoId)).limit(1);
    return target ? { kind: "merged", slug: target.slug } : { kind: "missing" };
  }

  return {
    kind: "found",
    song: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      artistName: row.artistName,
      releaseDate: row.releaseDate,
      video: row.videoId ? { id: row.videoId, type: row.videoType, title: row.videoTitle, channel: row.videoChannel } : null,
    },
  };
}

// 추가요를 받을 수 있는 곡인지 (없는 곡·병합된 곡 제외)
export async function isRequestableSong(songId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ mergedIntoId: songs.mergedIntoId })
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);
  return Boolean(row) && !row.mergedIntoId;
}
