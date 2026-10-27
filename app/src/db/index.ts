import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DB는 서버에서만 쓴다 (08 문서 3절). DATABASE_URL은 NEXT_PUBLIC_이 아니라 브라우저 번들에 들어가지 않는다
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL이 없습니다 (app/.env.local)");

  // Supabase 트랜잭션 풀러(6543)는 prepared statement를 지원하지 않는다
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;

// 개발 중 핫 리로드마다 연결이 새로 생기지 않게 하나만 둔다
const globalForDb = globalThis as unknown as { allbeatDb?: Db };

export function getDb(): Db {
  globalForDb.allbeatDb ??= createDb();
  return globalForDb.allbeatDb;
}
