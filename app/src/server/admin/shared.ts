import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { profiles, requests } from "@/db/schema";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// 운영자가 고칠 수 있는 입력 오류. 메시지는 그대로 화면에 보여준다
export class AdminInputError extends Error {}

export async function isAdmin(userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ role: profiles.role, deletedAt: profiles.deletedAt })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row?.role === "admin" && !row.deletedAt;
}

// postgres 유니크 제약 위반(23505). drizzle이 원래 오류를 cause에 감싼다
export function isUniqueViolation(e: unknown): boolean {
  const code = (x: unknown) => (typeof x === "object" && x !== null && "code" in x ? (x as { code: unknown }).code : undefined);
  return code(e) === "23505" || code((e as { cause?: unknown })?.cause) === "23505";
}

// 클래스가 수강생에게 공개될 때, 그 곡들의 대기 중 추가요를 "열렸어요"로 (F-07, 권역 무관)
export async function openRequestsForClass(tx: Tx, classId: number, songIds: number[]): Promise<number> {
  if (songIds.length === 0) return 0;
  const opened = await tx
    .update(requests)
    .set({ status: "opened", fulfilledClassId: classId, updatedAt: sql`now()` })
    .where(and(inArray(requests.songId, songIds), eq(requests.status, "waiting")))
    .returning({ id: requests.id });
  return opened.length;
}

// "2026-11-02" (KST 기준 오늘)
export function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export function kstDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+09:00`);
}
