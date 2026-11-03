import { createHash, randomInt } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { classes, classSongs, instructorProfiles, instructorRegions, profiles, regions } from "@/db/schema";
import { AdminInputError, isUniqueViolation, kstDateTime, openRequestsForClass, type Tx } from "./shared";

// "@Dance.Kim " → "dance.kim". 인스타 아이디 규칙: 영문 소문자·숫자·마침표·밑줄 30자
export function normalizeInstagramHandle(input: string): string {
  return input.trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "").toLowerCase();
}

export const instructorInput = z.object({
  displayName: z.string().trim().min(1, "활동명을 입력해 주세요").max(30, "활동명은 30자까지예요"),
  instagramHandle: z
    .string()
    .transform(normalizeInstagramHandle)
    .pipe(z.string().regex(/^[a-z0-9._]{1,30}$/, "인스타그램 아이디를 확인해 주세요")),
  regionIds: z.array(z.number().int().positive()).min(1, "주 활동 권역을 하나 이상 골라 주세요"),
});

export const consentInput = z.object({
  instructorId: z.number().int().positive(),
  consentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "동의 날짜를 골라 주세요"),
  consentNote: z.string().trim().min(2, "동의 방법을 적어 주세요 (예: 인스타 DM 캡처)").max(200),
});

export type AdminInstructorRow = {
  id: number;
  displayName: string;
  instagramHandle: string;
  isProxy: boolean;
  consentAt: Date | null;
  classCount: number;
  /** 신청 상태 (F-14). 대리 강사는 approved로 만들어진다 */
  status: "pending" | "verified" | "approved" | "rejected" | "suspended";
  createdAt: Date;
  /** 가져오기 신청이 걸려 있는 대리 강사 (F-19) */
  hasClaim: boolean;
};

export async function listInstructorsForAdmin(): Promise<AdminInstructorRow[]> {
  return getDb()
    .select({
      id: instructorProfiles.id,
      displayName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      isProxy: instructorProfiles.isProxy,
      consentAt: instructorProfiles.consentAt,
      // 조인 없는 select라 drizzle이 칸에 테이블을 붙이지 않는다("id"가 classes.id로 풀림). 이름을 직접 쓴다
      classCount: sql<number>`(select count(*)::int from ${classes} c where c.instructor_id = ${instructorProfiles}.id)`,
      status: instructorProfiles.status,
      createdAt: instructorProfiles.createdAt,
      hasClaim: sql<boolean>`${instructorProfiles.claimUserId} is not null`,
    })
    .from(instructorProfiles)
    // 운영자 손이 필요한 것(승인 대기·확인됨, 가져오기 신청)이 위로 (F-14, F-19)
    .orderBy(
      sql`case when ${instructorProfiles.status} in ('pending', 'verified') or ${instructorProfiles.claimUserId} is not null then 0 else 1 end`,
      desc(instructorProfiles.createdAt),
    );
}

export type AdminInstructorDetail = AdminInstructorRow & {
  consentNote: string | null;
  regionNames: string[];
  bio: string | null;
  rejectedReason: string | null;
  approvedAt: Date | null;
  /** 발급된 코드가 아직 유효한가 */
  codeValid: boolean;
  /** 가져오기 신청 (F-19): 신청한 사람 닉네임과 시각 */
  claim: { nickname: string; requestedAt: Date } | null;
};

export async function getInstructorForAdmin(id: number): Promise<AdminInstructorDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: instructorProfiles.id,
      displayName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      isProxy: instructorProfiles.isProxy,
      consentAt: instructorProfiles.consentAt,
      consentNote: instructorProfiles.consentNote,
      status: instructorProfiles.status,
      createdAt: instructorProfiles.createdAt,
      bio: instructorProfiles.bio,
      rejectedReason: instructorProfiles.rejectedReason,
      approvedAt: instructorProfiles.approvedAt,
      codeValid: sql<boolean>`coalesce(${instructorProfiles.verifyCodeExpiresAt} > now(), false)`,
      hasClaim: sql<boolean>`${instructorProfiles.claimUserId} is not null`,
      claimNickname: profiles.nickname,
      claimRequestedAt: instructorProfiles.claimRequestedAt,
    })
    .from(instructorProfiles)
    .leftJoin(profiles, eq(profiles.id, instructorProfiles.claimUserId))
    .where(eq(instructorProfiles.id, id))
    .limit(1);
  if (!row) return null;
  const { claimNickname, claimRequestedAt, ...rest } = row;
  const claim = claimNickname && claimRequestedAt ? { nickname: claimNickname, requestedAt: claimRequestedAt } : null;

  const [regionRows, [{ classCount }]] = await Promise.all([
    db
      .select({ name: regions.shortName })
      .from(instructorRegions)
      .innerJoin(regions, eq(regions.id, instructorRegions.regionId))
      .where(eq(instructorRegions.instructorId, id))
      .orderBy(asc(regions.sortOrder)),
    db.select({ classCount: count() }).from(classes).where(eq(classes.instructorId, id)),
  ]);

  return { ...rest, claim, classCount, regionNames: regionRows.map((r) => r.name) };
}

// 대리 강사 프로필 (F-15). 운영자가 만든 프로필이라 승인 상태로 시작하고, 공개는 동의 기록으로만 갈린다
export async function createProxyInstructor(input: z.infer<typeof instructorInput>): Promise<number> {
  try {
    return await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(instructorProfiles)
        .values({
          displayName: input.displayName,
          instagramHandle: input.instagramHandle,
          isProxy: true,
          status: "approved",
          approvedAt: sql`now()`,
        })
        .returning({ id: instructorProfiles.id });
      const regionIds = [...new Set(input.regionIds)];
      await tx.insert(instructorRegions).values(regionIds.map((regionId) => ({ instructorId: created.id, regionId })));
      return created.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AdminInputError(`이미 등록된 인스타그램 아이디예요: @${input.instagramHandle}`);
    throw e;
  }
}

// 게재 동의 기록. 기록하는 순간 이 강사의 다가오는 클래스가 공개되므로, 그 곡들의 추가요도 함께 연다 (FR-14)
export async function recordConsent(input: z.infer<typeof consentInput>): Promise<{ publishedClasses: number; openedRequests: number }> {
  return getDb().transaction(async (tx) => {
    const [instructor] = await tx
      .update(instructorProfiles)
      .set({ consentAt: kstDateTime(input.consentDate, "00:00"), consentNote: input.consentNote })
      .where(eq(instructorProfiles.id, input.instructorId))
      .returning({ status: instructorProfiles.status });
    if (!instructor) throw new AdminInputError("없는 강사예요");
    if (instructor.status !== "approved") return { publishedClasses: 0, openedRequests: 0 };
    return openRequestsForUpcomingClasses(tx, input.instructorId);
  });
}

// 강사의 클래스가 막 공개됐을 때: 다가오는 클래스들의 곡에 기다리던 추가요를 연다 (게재 동의, F-19 가져오기)
export async function openRequestsForUpcomingClasses(tx: Tx, instructorId: number): Promise<{ publishedClasses: number; openedRequests: number }> {
  const upcoming = await tx
    .select({ id: classes.id })
    .from(classes)
    .where(
      and(
        eq(classes.instructorId, instructorId),
        eq(classes.isHidden, false),
        inArray(classes.status, ["open", "closing_soon"]),
        gt(classes.startsAt, sql`now()`),
      ),
    );

  let openedRequests = 0;
  for (const c of upcoming) {
    const songRows = await tx.select({ songId: classSongs.songId }).from(classSongs).where(eq(classSongs.classId, c.id));
    openedRequests += await openRequestsForClass(tx, c.id, songRows.map((s) => s.songId));
  }
  return { publishedClasses: upcoming.length, openedRequests };
}

// ── 강사 신청 승인 (F-14, specs/instructor-apply) ────────────────────────

export const VERIFY_CODE_HOURS = 24;

// 코드 해시: 원문은 저장하지 않는다. 강사 id를 섞어 같은 코드라도 해시가 다르게. 강사 쪽 확인(src/server/instructors)도 이 함수를 쓴다
export function hashVerifyCode(instructorId: number, code: string): string {
  return createHash("sha256").update(`${instructorId}:${code}`).digest("hex");
}

// 6자리 코드를 만들어 해시·만료(24시간)만 저장하고 원문을 돌려준다. 운영자가 인스타 DM으로 옮겨 적는다. 다시 발급하면 이전 코드는 무효
// 직접 신청한 대기 강사, 또는 가져오기 신청이 걸린 대리 강사(F-19)에게만
export async function issueVerifyCode(instructorId: number): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const [updated] = await getDb()
    .update(instructorProfiles)
    .set({ verifyCodeHash: hashVerifyCode(instructorId, code), verifyCodeExpiresAt: sql`now() + make_interval(hours => ${VERIFY_CODE_HOURS})` })
    .where(
      and(
        eq(instructorProfiles.id, instructorId),
        or(
          and(eq(instructorProfiles.isProxy, false), eq(instructorProfiles.status, "pending")),
          and(eq(instructorProfiles.isProxy, true), isNotNull(instructorProfiles.claimUserId)),
        ),
      ),
    )
    .returning({ id: instructorProfiles.id });
  if (!updated) throw new AdminInputError("승인 대기 중인 직접 신청 강사나 가져오기 신청이 있는 대리 강사에게만 코드를 발급할 수 있어요");
  return code;
}

// ── 대리 강사 가져오기 (F-19, specs/instructor-claim) ─────────────────────

// 운영 홈 배너용: 가져오기 신청이 걸린 대리 강사 (오래된 신청 먼저)
export async function listPendingClaims(): Promise<{ id: number; displayName: string; instagramHandle: string }[]> {
  return getDb()
    .select({ id: instructorProfiles.id, displayName: instructorProfiles.displayName, instagramHandle: instructorProfiles.instagramHandle })
    .from(instructorProfiles)
    .where(isNotNull(instructorProfiles.claimUserId))
    .orderBy(asc(instructorProfiles.claimRequestedAt));
}

// 운영자가 가져오기 신청을 취소한다. 발급한 코드도 무효
export async function cancelClaimByAdmin(instructorId: number): Promise<void> {
  const [updated] = await getDb()
    .update(instructorProfiles)
    .set({ claimUserId: null, claimRequestedAt: null, verifyCodeHash: null, verifyCodeExpiresAt: null })
    .where(and(eq(instructorProfiles.id, instructorId), isNotNull(instructorProfiles.claimUserId)))
    .returning({ id: instructorProfiles.id });
  if (!updated) throw new AdminInputError("가져오기 신청이 없는 강사예요");
}

// 승인: 대기·확인됨 → 승인. 확인 전에도 운영자 판단으로 할 수 있다
export async function approveInstructor(instructorId: number): Promise<void> {
  const [updated] = await getDb()
    .update(instructorProfiles)
    .set({ status: "approved", approvedAt: sql`now()`, rejectedReason: null, verifyCodeHash: null, verifyCodeExpiresAt: null })
    .where(and(eq(instructorProfiles.id, instructorId), inArray(instructorProfiles.status, ["pending", "verified"])))
    .returning({ id: instructorProfiles.id });
  if (!updated) throw new AdminInputError("대기·확인됨 상태의 강사만 승인할 수 있어요");
}

export const rejectInput = z.object({
  instructorId: z.number().int().positive(),
  reason: z.string().trim().min(2, "반려 사유를 적어 주세요").max(200, "사유는 200자까지예요"),
});

// 반려: 대기·확인됨 → 반려 + 사유. 강사가 고쳐 다시 신청할 수 있다
export async function rejectInstructor(input: z.infer<typeof rejectInput>): Promise<void> {
  const [updated] = await getDb()
    .update(instructorProfiles)
    .set({ status: "rejected", rejectedReason: input.reason, verifyCodeHash: null, verifyCodeExpiresAt: null })
    .where(and(eq(instructorProfiles.id, input.instructorId), inArray(instructorProfiles.status, ["pending", "verified"])))
    .returning({ id: instructorProfiles.id });
  if (!updated) throw new AdminInputError("대기·확인됨 상태의 강사만 반려할 수 있어요");
}
