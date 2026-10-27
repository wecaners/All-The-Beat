import { sql } from "drizzle-orm";
import { type AnyPgColumn, bigint, boolean, date, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { createdAt, timestamptz } from "./columns";
import { reviewStatus, videoType } from "./enums";
import { profiles } from "./users";

export const artists = pgTable("artists", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(), // 대표 표기 "A2O LITE"
  slug: text().notNull().unique(), // a2o-lite
  mergedIntoId: bigint({ mode: "number" }).references((): AnyPgColumn => artists.id),
  createdAt: createdAt(),
}).enableRLS();

// 아티스트 검색어. 대표 이름도 여기 1행
export const artistAliases = pgTable(
  "artist_aliases",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    artistId: bigint({ mode: "number" })
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    alias: text().notNull(), // "에이투오 라이트"
    aliasNorm: text().notNull(), // src/lib/normalize.ts (09 ERD 5절)
    isPrimary: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique().on(t.artistId, t.aliasNorm),
    index("artist_aliases_alias_norm_trgm").using("gin", t.aliasNorm.op("gin_trgm_ops")),
  ],
).enableRLS();

export const songs = pgTable(
  "songs",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    artistId: bigint({ mode: "number" })
      .notNull()
      .references(() => artists.id),
    title: text().notNull(), // "NEON"
    slug: text().notNull().unique(), // a2o-lite-neon
    releaseDate: date(),
    reviewStatus: reviewStatus().notNull().default("pending"),
    // 병합되면 대상 곡. 옛 slug 리다이렉트용으로 행은 남긴다
    mergedIntoId: bigint({ mode: "number" }).references((): AnyPgColumn => songs.id),
    createdBy: uuid().references(() => profiles.id, { onDelete: "set null" }),
    // 대표 영상 (06 문서). YouTube API 값
    ytVideoId: text(),
    videoType: videoType(),
    videoTitle: text(),
    videoChannel: text(),
    videoThumbUrl: text(),
    videoEmbeddable: boolean(), // false면 화면에서 숨김
    videoSyncedAt: timestamptz(), // 30일 지나면 배치가 갱신
    createdAt: createdAt(),
  },
  (t) => [index("songs_video_synced_at_idx").on(t.videoSyncedAt).where(sql`${t.ytVideoId} is not null`)],
).enableRLS();

// 곡 검색어. 제목도 여기 1행
export const songAliases = pgTable(
  "song_aliases",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    songId: bigint({ mode: "number" })
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    alias: text().notNull(), // "네온"
    aliasNorm: text().notNull(),
    isPrimary: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique().on(t.songId, t.aliasNorm),
    index("song_aliases_alias_norm_trgm").using("gin", t.aliasNorm.op("gin_trgm_ops")),
  ],
).enableRLS();
