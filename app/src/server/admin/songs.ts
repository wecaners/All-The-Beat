import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { artistAliases, artists, songAliases, songs, videoType } from "@/db/schema";
import { normalizeAlias } from "@/lib/normalize";
import { lookupVideo, parseYouTubeVideoId } from "@/server/youtube";
import { AdminInputError, isUniqueViolation, type Tx } from "./shared";

const aliasList = z
  .string()
  .default("")
  .transform((v) =>
    v
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const songInput = z.object({
  id: z.number().int().positive().nullable(),
  title: z.string().trim().min(1, "곡명을 입력해 주세요").max(100),
  artistName: z.string().trim().min(1, "아티스트를 입력해 주세요").max(100),
  artistAliases: aliasList,
  songAliases: aliasList,
  slug: z.string().trim().max(120).default(""),
  releaseDate: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "발매일 형식을 확인해 주세요")
    .transform((v) => v || null),
});
export type SongInput = z.infer<typeof songInput>;

// "A2O LITE", "NEON" → "a2o-lite-neon". 한글은 그대로 둔다
export function slugify(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type AdminSongRow = { id: number; title: string; artistName: string; slug: string; hasVideo: boolean };

export async function listSongsForAdmin(): Promise<AdminSongRow[]> {
  return getDb()
    .select({
      id: songs.id,
      title: songs.title,
      artistName: artists.name,
      slug: songs.slug,
      hasVideo: sql<boolean>`${songs.ytVideoId} is not null`,
    })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(sql`${songs.mergedIntoId} is null`)
    .orderBy(desc(songs.createdAt));
}

export type AdminSongDetail = {
  id: number;
  title: string;
  slug: string;
  releaseDate: string | null;
  artistName: string;
  artistAliases: string[];
  songAliases: string[];
  video: { id: string; type: string | null; title: string | null; channel: string | null } | null;
};

export async function getSongForAdmin(id: number): Promise<AdminSongDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: songs.id,
      title: songs.title,
      slug: songs.slug,
      releaseDate: songs.releaseDate,
      artistId: artists.id,
      artistName: artists.name,
      ytVideoId: songs.ytVideoId,
      videoType: songs.videoType,
      videoTitle: songs.videoTitle,
      videoChannel: songs.videoChannel,
    })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(eq(songs.id, id))
    .limit(1);
  if (!row) return null;

  const [aAliases, sAliases] = await Promise.all([
    db.select({ alias: artistAliases.alias }).from(artistAliases).where(eq(artistAliases.artistId, row.artistId)).orderBy(asc(artistAliases.id)),
    db.select({ alias: songAliases.alias, isPrimary: songAliases.isPrimary }).from(songAliases).where(eq(songAliases.songId, id)).orderBy(asc(songAliases.id)),
  ]);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    releaseDate: row.releaseDate,
    artistName: row.artistName,
    artistAliases: aAliases.map((a) => a.alias).filter((a) => a !== row.artistName),
    songAliases: sAliases.filter((a) => !a.isPrimary).map((a) => a.alias),
    video: row.ytVideoId ? { id: row.ytVideoId, type: row.videoType, title: row.videoTitle, channel: row.videoChannel } : null,
  };
}

// 대표 이름이나 다른 이름이 같은 아티스트가 있으면 그 아티스트를 쓰고, 없으면 만든다
async function findOrCreateArtist(tx: Tx, name: string): Promise<number> {
  const [found] = await tx
    .select({ id: artistAliases.artistId })
    .from(artistAliases)
    .innerJoin(artists, eq(artists.id, artistAliases.artistId))
    .where(sql`${artistAliases.aliasNorm} = ${normalizeAlias(name)} and ${artists.mergedIntoId} is null`)
    .limit(1);
  if (found) return found.id;

  const base = slugify(name) || "artist";
  for (let n = 1; n <= 20; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [created] = await tx.insert(artists).values({ name, slug }).onConflictDoNothing({ target: artists.slug }).returning({ id: artists.id });
    if (created) return created.id;
  }
  throw new AdminInputError("아티스트 주소를 만들지 못했어요. 이름을 확인해 주세요");
}

async function addAliases<T extends "artist" | "song">(tx: Tx, kind: T, ownerId: number, primary: string, others: string[]) {
  const seen = new Set<string>();
  const rows = [primary, ...others]
    .map((alias, i) => ({ alias, aliasNorm: normalizeAlias(alias), isPrimary: i === 0 }))
    .filter((r) => r.aliasNorm && !seen.has(r.aliasNorm) && seen.add(r.aliasNorm));
  if (rows.length === 0) return;

  if (kind === "artist") {
    await tx
      .insert(artistAliases)
      .values(rows.map((r) => ({ ...r, artistId: ownerId })))
      .onConflictDoNothing({ target: [artistAliases.artistId, artistAliases.aliasNorm] });
  } else {
    await tx.insert(songAliases).values(rows.map((r) => ({ ...r, songId: ownerId })));
  }
}

// 곡 등록·수정 (F-16). 운영자가 만든 곡은 검수 완료 상태다
export async function saveSong(input: SongInput): Promise<{ id: number; slug: string; previousSlug: string | null }> {
  const slug = slugify(input.slug || `${input.artistName}-${input.title}`);
  if (!slug) throw new AdminInputError("곡 주소(slug)를 확인해 주세요");

  try {
    return await getDb().transaction(async (tx) => {
      const artistId = await findOrCreateArtist(tx, input.artistName);
      await addAliases(tx, "artist", artistId, input.artistName, input.artistAliases);

      const values = { artistId, title: input.title, slug, releaseDate: input.releaseDate, reviewStatus: "confirmed" as const };
      let id: number;
      let previousSlug: string | null = null;
      if (input.id) {
        const [before] = await tx.select({ slug: songs.slug }).from(songs).where(eq(songs.id, input.id)).limit(1);
        if (!before) throw new AdminInputError("없는 곡이에요");
        previousSlug = before.slug;
        await tx.update(songs).set(values).where(eq(songs.id, input.id));
        id = input.id;
      } else {
        const [created] = await tx.insert(songs).values(values).returning({ id: songs.id });
        id = created.id;
      }

      // 곡 다른 이름은 입력한 목록으로 바꾼다 (제목도 1행)
      await tx.delete(songAliases).where(eq(songAliases.songId, id));
      await addAliases(tx, "song", id, input.title, input.songAliases);

      return { id, slug, previousSlug };
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AdminInputError(`이미 쓰는 곡 주소예요: ${slug}`);
    throw e;
  }
}

export const videoInput = z.object({
  songId: z.number().int().positive(),
  url: z.string().trim().min(1, "YouTube 링크를 넣어 주세요"),
  type: z.enum(videoType.enumValues, { message: "영상 종류를 골라 주세요" }),
});

const VIDEO_ERROR = {
  embed_blocked: "다른 곳에 퍼가기가 막힌 영상이에요. 다른 영상을 골라 주세요",
  not_found: "영상을 찾을 수 없어요. 비공개이거나 삭제된 영상일 수 있어요",
  unavailable: "YouTube에서 영상 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요",
} as const;

// 대표 영상 지정. 퍼가기 가능한 영상만 받는다 (FR-4)
export async function setSongVideo(input: z.infer<typeof videoInput>): Promise<{ slug: string; title: string; channel: string }> {
  const videoId = parseYouTubeVideoId(input.url);
  if (!videoId) throw new AdminInputError("YouTube 영상 링크가 아니에요");

  const lookup = await lookupVideo(videoId);
  if (!lookup.ok) throw new AdminInputError(VIDEO_ERROR[lookup.reason]);

  const [updated] = await getDb()
    .update(songs)
    .set({
      ytVideoId: videoId,
      videoType: input.type,
      videoTitle: lookup.info.title,
      videoChannel: lookup.info.channel,
      videoThumbUrl: lookup.info.thumbnailUrl,
      videoEmbeddable: true,
      videoSyncedAt: sql`now()`,
    })
    .where(eq(songs.id, input.songId))
    .returning({ slug: songs.slug });
  if (!updated) throw new AdminInputError("없는 곡이에요");
  return { slug: updated.slug, title: lookup.info.title, channel: lookup.info.channel };
}

export async function clearSongVideo(songId: number): Promise<{ slug: string } | null> {
  const [updated] = await getDb()
    .update(songs)
    .set({
      ytVideoId: null,
      videoType: null,
      videoTitle: null,
      videoChannel: null,
      videoThumbUrl: null,
      videoEmbeddable: null,
      videoSyncedAt: null,
    })
    .where(eq(songs.id, songId))
    .returning({ slug: songs.slug });
  return updated ?? null;
}

// 클래스 등록 곡 고르기에서 바로 새 곡 만들기 (F-13, specs/search). 곡명·아티스트만 받고, 별칭·영상은 곡 화면에서 나중에 채운다
export const quickSongInput = z.object({
  title: z.string().trim().min(1, "곡명을 입력해 주세요").max(100, "곡명은 100자까지예요"),
  artistName: z.string().trim().min(1, "아티스트를 입력해 주세요").max(100, "아티스트는 100자까지예요"),
});

// 같은 아티스트(다른 이름 포함)에 같은 곡명(다른 이름 포함)이 이미 있으면 그 곡을 돌려준다. 표기만 다른 중복을 만들지 않는다
export async function findOrCreateSong(input: z.output<typeof quickSongInput>): Promise<{ id: number; title: string; artistName: string; existed: boolean }> {
  const db = getDb();
  const [same] = await db
    .select({ id: songs.id, title: songs.title, artistName: artists.name })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .innerJoin(songAliases, eq(songAliases.songId, songs.id))
    .innerJoin(artistAliases, eq(artistAliases.artistId, artists.id))
    .where(
      and(
        eq(songAliases.aliasNorm, normalizeAlias(input.title)),
        eq(artistAliases.aliasNorm, normalizeAlias(input.artistName)),
        isNull(songs.mergedIntoId),
      ),
    )
    .limit(1);
  if (same) return { ...same, existed: true };

  const saved = await saveSong({ id: null, title: input.title, artistName: input.artistName, artistAliases: [], songAliases: [], slug: "", releaseDate: null });
  // 아티스트는 다른 이름으로 쳐도 기존 아티스트로 묶이므로, 보여줄 이름은 저장된 대표 이름으로
  const [row] = await db
    .select({ title: songs.title, artistName: artists.name })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(eq(songs.id, saved.id))
    .limit(1);
  return { id: saved.id, title: row.title, artistName: row.artistName, existed: false };
}

