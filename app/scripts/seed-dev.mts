// dev DB에만 넣는 샘플 곡. 운영 곡은 운영자 화면(F-16)에서 등록한다: pnpm db:seed:dev
// Node가 TypeScript를 직접 실행한다 (타입만 지우고 실행, 빌드 없음)
import postgres from "postgres";
import { normalizeAlias } from "../src/lib/normalize.ts";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL 또는 DATABASE_URL이 없습니다 (app/.env.local)");
if (!url.includes("ap-northeast-2") && !process.argv.includes("--force")) {
  // 실수로 다른 DB에 넣지 않게 한 번 더 막는다
  throw new Error("dev DB가 아닌 것 같아요. 확실하면 --force");
}

type SeedSong = { title: string; slug: string; aliases: string[] };
type SeedArtist = { name: string; slug: string; aliases: string[]; songs: SeedSong[] };

const ARTISTS: SeedArtist[] = [
  {
    name: "A2O LITE",
    slug: "a2o-lite",
    aliases: ["에이투오 라이트", "에이투오"],
    songs: [{ title: "NEON", slug: "a2o-lite-neon", aliases: ["네온"] }],
  },
];

const sql = postgres(url, { max: 1 });

await sql.begin(async (tx) => {
  for (const artist of ARTISTS) {
    const [{ id: artistId }] = await tx`
      insert into artists (name, slug) values (${artist.name}, ${artist.slug})
      on conflict (slug) do update set name = excluded.name
      returning id`;

    for (const [i, alias] of [artist.name, ...artist.aliases].entries()) {
      await tx`
        insert into artist_aliases (artist_id, alias, alias_norm, is_primary)
        values (${artistId}, ${alias}, ${normalizeAlias(alias)}, ${i === 0})
        on conflict (artist_id, alias_norm) do nothing`;
    }

    for (const song of artist.songs) {
      const [{ id: songId }] = await tx`
        insert into songs (artist_id, title, slug, review_status) values (${artistId}, ${song.title}, ${song.slug}, 'confirmed')
        on conflict (slug) do update set title = excluded.title
        returning id`;

      for (const [i, alias] of [song.title, ...song.aliases].entries()) {
        await tx`
          insert into song_aliases (song_id, alias, alias_norm, is_primary)
          values (${songId}, ${alias}, ${normalizeAlias(alias)}, ${i === 0})
          on conflict (song_id, alias_norm) do nothing`;
      }
      console.log(`✓ ${artist.name} - ${song.title} → /song/${song.slug}`);
    }
  }
});

await sql.end();
