import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { artistAliases, artists, classSongs, events, instructorProfiles, profiles, requests, songAliases, songs, videoType } from "@/db/schema";
import { normalizeAlias } from "@/lib/normalize";
import { lookupVideo, parseYouTubeVideoId, VIDEO_ERROR } from "@/server/youtube";
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

export type SongCreator = "admin" | "member" | "instructor";
export type AdminSongRow = { id: number; title: string; artistName: string; slug: string; hasVideo: boolean; pendingReview: boolean; creator: SongCreator; createdAt: Date };

// 만든 사람 종류: 운영자(createdBy 없음) / 강사(승인된 강사 프로필) / 수강생
const creatorKind = sql<SongCreator>`case when ${songs.createdBy} is null then 'admin' when exists (select 1 from ${instructorProfiles} where ${instructorProfiles.userId} = ${songs.createdBy} and ${instructorProfiles.status} = 'approved') then 'instructor' else 'member' end`;

// 병합된 곡은 뺀다. pendingOnly면 검수 대기만 (F-16)
export async function listSongsForAdmin(pendingOnly = false): Promise<AdminSongRow[]> {
  return getDb()
    .select({
      id: songs.id,
      title: songs.title,
      artistName: artists.name,
      slug: songs.slug,
      hasVideo: sql<boolean>`${songs.ytVideoId} is not null`,
      pendingReview: sql<boolean>`${songs.reviewStatus} = 'pending'`,
      creator: creatorKind,
      createdAt: songs.createdAt,
    })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(and(isNull(songs.mergedIntoId), pendingOnly ? eq(songs.reviewStatus, "pending") : undefined))
    .orderBy(desc(songs.createdAt));
}

export async function countPendingSongs(): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(songs).where(and(isNull(songs.mergedIntoId), eq(songs.reviewStatus, "pending")));
  return n;
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
  pendingReview: boolean;
  creator: SongCreator;
  creatorNickname: string | null;
  createdAt: Date;
  merged: boolean;
  /** 병합하면 옮겨질 것 (미리보기) */
  classCount: number;
  requestCount: number;
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
      pendingReview: sql<boolean>`${songs.reviewStatus} = 'pending'`,
      creator: creatorKind,
      creatorNickname: profiles.nickname,
      createdAt: songs.createdAt,
      merged: sql<boolean>`${songs.mergedIntoId} is not null`,
      classCount: sql<number>`(select count(*)::int from ${classSongs} where ${classSongs.songId} = ${songs.id})`,
      requestCount: sql<number>`(select count(*)::int from ${requests} where ${requests.songId} = ${songs.id})`,
    })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .leftJoin(profiles, eq(profiles.id, songs.createdBy))
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
    pendingReview: row.pendingReview,
    creator: row.creator,
    creatorNickname: row.creatorNickname,
    createdAt: row.createdAt,
    merged: row.merged,
    classCount: row.classCount,
    requestCount: row.requestCount,
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
    // 병합처럼 이미 별칭이 있는 곡에 더할 때도 쓴다 (specs/song-review)
    await tx
      .insert(songAliases)
      .values(rows.map((r) => ({ ...r, songId: ownerId })))
      .onConflictDoNothing({ target: [songAliases.songId, songAliases.aliasNorm] });
  }
}

// 수강생이 만든 곡은 검수 대기 + 만든 사람 (F-13, specs/song-register). 운영자가 만든 곡은 검수 완료
export type SongOrigin = { reviewStatus?: "pending" | "confirmed"; createdBy?: string | null };

// 곡 등록·수정 (F-16). 기본은 운영자가 만든 검수 완료 곡. 수정할 때는 검수 상태·만든 사람을 건드리지 않는다
export async function saveSong(input: SongInput, origin: SongOrigin = {}): Promise<{ id: number; slug: string; previousSlug: string | null }> {
  const slug = slugify(input.slug || `${input.artistName}-${input.title}`);
  if (!slug) throw new AdminInputError("곡 주소(slug)를 확인해 주세요");

  try {
    return await getDb().transaction(async (tx) => {
      const artistId = await findOrCreateArtist(tx, input.artistName);
      await addAliases(tx, "artist", artistId, input.artistName, input.artistAliases);

      const values = { artistId, title: input.title, slug, releaseDate: input.releaseDate };
      let id: number;
      let previousSlug: string | null = null;
      if (input.id) {
        const [before] = await tx.select({ slug: songs.slug }).from(songs).where(eq(songs.id, input.id)).limit(1);
        if (!before) throw new AdminInputError("없는 곡이에요");
        previousSlug = before.slug;
        await tx.update(songs).set({ ...values, reviewStatus: "confirmed" }).where(eq(songs.id, input.id));
        id = input.id;
      } else {
        const [created] = await tx
          .insert(songs)
          .values({ ...values, reviewStatus: origin.reviewStatus ?? "confirmed", createdBy: origin.createdBy ?? null })
          .returning({ id: songs.id });
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

// 대표 영상 지정. 퍼가기 가능한 영상만 받는다 (FR-4)
export async function setSongVideo(input: z.infer<typeof videoInput>): Promise<{ slug: string; title: string; channel: string }> {
  const videoId = parseYouTubeVideoId(input.url);
  if (!videoId) throw new AdminInputError(VIDEO_ERROR.not_youtube);

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

// 같은 아티스트(다른 이름 포함)에 같은 곡명(다른 이름 포함)이 이미 있으면 그 곡을 돌려준다. 표기만 다른 중복을 만들지 않는다.
// 수강생이 만들 때는 origin으로 검수 대기·만든 사람을 남긴다 (specs/song-register)
export async function findOrCreateSong(
  input: z.output<typeof quickSongInput>,
  origin: SongOrigin = {},
): Promise<{ id: number; slug: string; title: string; artistName: string; existed: boolean }> {
  const db = getDb();
  const [same] = await db
    .select({ id: songs.id, slug: songs.slug, title: songs.title, artistName: artists.name })
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

  const saved = await saveSong({ id: null, title: input.title, artistName: input.artistName, artistAliases: [], songAliases: [], slug: "", releaseDate: null }, origin);
  // 아티스트는 다른 이름으로 쳐도 기존 아티스트로 묶이므로, 보여줄 이름은 저장된 대표 이름으로
  const [row] = await db
    .select({ title: songs.title, artistName: artists.name })
    .from(songs)
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(eq(songs.id, saved.id))
    .limit(1);
  return { id: saved.id, slug: saved.slug, title: row.title, artistName: row.artistName, existed: false };
}

// ── 검수·병합 (F-16, specs/song-review) ────────────────────────────────

// 검수 확인: 운영자가 봤다는 표시만 남긴다
export async function confirmSong(songId: number): Promise<{ slug: string }> {
  const [updated] = await getDb()
    .update(songs)
    .set({ reviewStatus: "confirmed" })
    .where(and(eq(songs.id, songId), isNull(songs.mergedIntoId)))
    .returning({ slug: songs.slug });
  if (!updated) throw new AdminInputError("없거나 이미 합쳐진 곡이에요");
  return updated;
}

export type MergeSongResult = { fromSlug: string; intoSlug: string; movedClasses: number; movedRequests: number; droppedRequests: number; movedAliases: number };

// 곡 병합 A→B. 클래스 연결·추가요·별칭·이벤트를 B로 옮기고 A는 "합쳐짐"으로 남긴다(옛 주소 리다이렉트).
// 겹치는 것(같은 클래스·같은 사용자·같은 별칭)은 B 것을 남긴다. 되돌리지 않는다
export async function mergeSong(fromId: number, intoId: number): Promise<MergeSongResult> {
  if (fromId === intoId) throw new AdminInputError("자기 자신으로는 합칠 수 없어요");
  return getDb().transaction(async (tx) => {
    const rows = await tx
      .select({ id: songs.id, slug: songs.slug, title: songs.title, mergedIntoId: songs.mergedIntoId })
      .from(songs)
      .where(inArray(songs.id, [fromId, intoId]))
      .for("update");
    const from = rows.find((r) => r.id === fromId);
    const into = rows.find((r) => r.id === intoId);
    if (!from || !into) throw new AdminInputError("없는 곡이에요");
    if (from.mergedIntoId) throw new AdminInputError("이미 합쳐진 곡이에요");
    if (into.mergedIntoId) throw new AdminInputError("이미 다른 곡으로 합쳐진 곡으로는 합칠 수 없어요");

    // 클래스: B를 이미 배우는 클래스의 A 행은 버린다
    await tx.delete(classSongs).where(and(eq(classSongs.songId, fromId), inArray(classSongs.classId, tx.select({ id: classSongs.classId }).from(classSongs).where(eq(classSongs.songId, intoId)))));
    const movedClassRows = await tx.update(classSongs).set({ songId: intoId }).where(eq(classSongs.songId, fromId)).returning({ id: classSongs.classId });

    // 추가요: B에 이미 있는 사용자의 A 행은 버린다 (사용자 × 곡 1건)
    const dropped = await tx
      .delete(requests)
      .where(and(eq(requests.songId, fromId), inArray(requests.userId, tx.select({ id: requests.userId }).from(requests).where(eq(requests.songId, intoId)))))
      .returning({ id: requests.id });
    const movedRequestRows = await tx.update(requests).set({ songId: intoId }).where(eq(requests.songId, fromId)).returning({ id: requests.id });

    // 별칭: B에 같은 것이 있으면 버리고, 나머지는 B의 보조 별칭으로. A 제목도 별칭으로
    await tx.delete(songAliases).where(and(eq(songAliases.songId, fromId), inArray(songAliases.aliasNorm, tx.select({ n: songAliases.aliasNorm }).from(songAliases).where(eq(songAliases.songId, intoId)))));
    const movedAliasRows = await tx.update(songAliases).set({ songId: intoId, isPrimary: false }).where(eq(songAliases.songId, fromId)).returning({ id: songAliases.id });
    await addAliases(tx, "song", intoId, into.title, [from.title]);

    await tx.update(events).set({ songId: intoId }).where(eq(events.songId, fromId));
    await tx.update(songs).set({ mergedIntoId: intoId, reviewStatus: "confirmed" }).where(eq(songs.id, fromId));

    return { fromSlug: from.slug, intoSlug: into.slug, movedClasses: movedClassRows.length, movedRequests: movedRequestRows.length, droppedRequests: dropped.length, movedAliases: movedAliasRows.length };
  });
}

// ── 아티스트 (F-16) ─────────────────────────────────────────────────────

export type AdminArtistRow = { id: number; name: string; slug: string; songCount: number; aliases: string[] };

export async function listArtistsForAdmin(): Promise<AdminArtistRow[]> {
  const db = getDb();
  const base = await db.select({ id: artists.id, name: artists.name, slug: artists.slug }).from(artists).where(isNull(artists.mergedIntoId)).orderBy(asc(artists.name));
  if (base.length === 0) return [];
  // 곡 수는 따로 묶어 센다 (병합된 곡 제외). sql 템플릿의 상관 서브쿼리가 바깥 artists와 묶이지 않아 전체 수가 나왔다 (findings Issues 1)
  const counts = await db
    .select({ artistId: songs.artistId, n: count() })
    .from(songs)
    .where(and(inArray(songs.artistId, base.map((r) => r.id)), isNull(songs.mergedIntoId)))
    .groupBy(songs.artistId);
  const countOf = new Map(counts.map((c) => [c.artistId, c.n]));
  const rows = base.map((r) => ({ ...r, songCount: countOf.get(r.id) ?? 0 }));
  const aliasRows = await db
    .select({ artistId: artistAliases.artistId, alias: artistAliases.alias, isPrimary: artistAliases.isPrimary })
    .from(artistAliases)
    .where(inArray(artistAliases.artistId, rows.map((r) => r.id)))
    .orderBy(asc(artistAliases.id));
  return rows.map((r) => ({ ...r, aliases: aliasRows.filter((a) => a.artistId === r.id && !a.isPrimary).map((a) => a.alias) }));
}

export const renameArtistInput = z.object({
  artistId: z.number().int().positive(),
  name: z.string().trim().min(1, "이름을 넣어 주세요").max(100, "이름은 100자까지예요"),
});

// 대표 이름 수정: artists.name과 대표 별칭 행을 같이 바꾼다. 다른 별칭과 같아지면 그 별칭을 대표로 올린다
export async function renameArtist(input: z.infer<typeof renameArtistInput>): Promise<string[]> {
  return getDb().transaction(async (tx) => {
    const [artist] = await tx.select({ id: artists.id, mergedIntoId: artists.mergedIntoId }).from(artists).where(eq(artists.id, input.artistId)).limit(1);
    if (!artist || artist.mergedIntoId) throw new AdminInputError("없거나 합쳐진 아티스트예요");
    const norm = normalizeAlias(input.name);
    if (!norm) throw new AdminInputError("이름을 확인해 주세요");
    await tx.update(artists).set({ name: input.name }).where(eq(artists.id, input.artistId));
    await tx.update(artistAliases).set({ isPrimary: false }).where(eq(artistAliases.artistId, input.artistId));
    const [existing] = await tx.select({ id: artistAliases.id }).from(artistAliases).where(and(eq(artistAliases.artistId, input.artistId), eq(artistAliases.aliasNorm, norm))).limit(1);
    if (existing) await tx.update(artistAliases).set({ alias: input.name, isPrimary: true }).where(eq(artistAliases.id, existing.id));
    else await tx.insert(artistAliases).values({ artistId: input.artistId, alias: input.name, aliasNorm: norm, isPrimary: true });
    // 곡 상세 캐시를 비울 slug 목록
    const slugs = await tx.select({ slug: songs.slug }).from(songs).where(eq(songs.artistId, input.artistId));
    return slugs.map((s) => s.slug);
  });
}

export type MergeArtistResult = { movedSongs: number; movedAliases: number; slugs: string[] };

// 아티스트 병합 A→B: 곡·별칭을 B로. 곡 slug는 그대로 (주소 안정). A는 "합쳐짐"
export async function mergeArtist(fromId: number, intoId: number): Promise<MergeArtistResult> {
  if (fromId === intoId) throw new AdminInputError("자기 자신으로는 합칠 수 없어요");
  return getDb().transaction(async (tx) => {
    const rows = await tx.select({ id: artists.id, name: artists.name, mergedIntoId: artists.mergedIntoId }).from(artists).where(inArray(artists.id, [fromId, intoId])).for("update");
    const from = rows.find((r) => r.id === fromId);
    const into = rows.find((r) => r.id === intoId);
    if (!from || !into) throw new AdminInputError("없는 아티스트예요");
    if (from.mergedIntoId) throw new AdminInputError("이미 합쳐진 아티스트예요");
    if (into.mergedIntoId) throw new AdminInputError("이미 다른 아티스트로 합쳐진 아티스트로는 합칠 수 없어요");

    const moved = await tx.update(songs).set({ artistId: intoId }).where(eq(songs.artistId, fromId)).returning({ slug: songs.slug });
    await tx.delete(artistAliases).where(and(eq(artistAliases.artistId, fromId), inArray(artistAliases.aliasNorm, tx.select({ n: artistAliases.aliasNorm }).from(artistAliases).where(eq(artistAliases.artistId, intoId)))));
    const movedAliases = await tx.update(artistAliases).set({ artistId: intoId, isPrimary: false }).where(eq(artistAliases.artistId, fromId)).returning({ id: artistAliases.id });
    await addAliases(tx, "artist", intoId, into.name, [from.name]);
    await tx.update(artists).set({ mergedIntoId: intoId }).where(eq(artists.id, fromId));
    return { movedSongs: moved.length, movedAliases: movedAliases.length, slugs: moved.map((m) => m.slug) };
  });
}
