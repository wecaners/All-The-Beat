import { defineConfig } from "drizzle-kit";

// drizzle-kit은 Next.js 밖에서 돌아서 .env.local을 직접 읽는다
try {
  process.loadEnvFile(".env.local");
} catch {
  // Vercel·CI처럼 파일 없이 환경변수만 있는 곳
}

// 마이그레이션은 세션 풀러(5432)로. 없으면 앱용 주소로 시도한다
const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL 또는 DATABASE_URL이 없습니다 (app/.env.local)");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  casing: "snake_case",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
