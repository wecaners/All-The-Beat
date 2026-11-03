import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles, userVisits } from "@/db/schema";

// "2026-11-04" (KST 기준 오늘). 접속 날짜와 Proxy 쿠키가 같은 값을 쓴다
export function visitDateKst(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

// 로그인 사용자의 오늘 접속을 남긴다 (F-18 재방문). 하루 1행은 PK가 지킨다.
// 프로필이 아직 없는 사용자(첫 로그인 직후)는 건너뛴다
export async function recordVisit(userId: string, visitedOn: string): Promise<void> {
  await getDb().execute(sql`
    insert into ${userVisits} (user_id, visited_on)
    select ${profiles.id}, ${visitedOn}::date from ${profiles} where ${profiles.id} = ${userId}::uuid
    on conflict do nothing
  `);
}
