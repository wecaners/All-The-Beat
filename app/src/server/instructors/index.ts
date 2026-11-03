import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { classes, instructorProfiles, instructorRegions, regions } from "@/db/schema";
import { hashVerifyCode, instructorInput, normalizeInstagramHandle, openRequestsForUpcomingClasses } from "@/server/admin/instructors";
import { isUniqueViolation } from "@/server/admin/shared";

// 강사 신청 (F-11, specs/instructor-apply). 운영자가 대신 만든 대리 강사와 같은 테이블을 쓰고,
// 직접 신청한 강사는 userId가 있고 isProxy가 false다. 사용자당 하나

export const applyInput = instructorInput.extend({
  bio: z
    .string()
    .trim()
    .max(50, "한 줄 소개는 50자까지예요")
    .transform((v) => v || null),
});
export type ApplyInput = z.infer<typeof applyInput>;

export class InstructorError extends Error {}

// 신청한 핸들이 운영자가 대신 등록해 둔(아직 아무 계정에도 연결 안 된) 강사다. 막는 대신 가져오기를 제안한다 (F-19)
export class ClaimOffer extends InstructorError {
  constructor(readonly offer: { handle: string; displayName: string; classCount: number }) {
    super(`@${offer.handle}은 운영자가 대신 등록해 둔 계정이에요`);
  }
}

export type MyInstructor = {
  id: number;
  status: "pending" | "verified" | "approved" | "rejected" | "suspended";
  displayName: string;
  instagramHandle: string;
  bio: string | null;
  regionIds: number[];
  regionNames: string[];
  rejectedReason: string | null;
  /** 코드 발급 상태: 없음 / 발급됨(유효) / 만료 */
  code: "none" | "issued" | "expired";
};

export async function getMyInstructor(userId: string): Promise<MyInstructor | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: instructorProfiles.id,
      status: instructorProfiles.status,
      displayName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      bio: instructorProfiles.bio,
      rejectedReason: instructorProfiles.rejectedReason,
      hasCode: sql<boolean>`${instructorProfiles.verifyCodeHash} is not null`,
      codeValid: sql<boolean>`${instructorProfiles.verifyCodeExpiresAt} > now()`,
    })
    .from(instructorProfiles)
    .where(eq(instructorProfiles.userId, userId))
    .limit(1);
  if (!row) return null;

  const regionRows = await db
    .select({ id: regions.id, name: regions.shortName })
    .from(instructorRegions)
    .innerJoin(regions, eq(regions.id, instructorRegions.regionId))
    .where(eq(instructorRegions.instructorId, row.id))
    .orderBy(asc(regions.sortOrder));

  const { hasCode, codeValid, ...rest } = row;
  return { ...rest, regionIds: regionRows.map((r) => r.id), regionNames: regionRows.map((r) => r.name), code: !hasCode ? "none" : codeValid ? "issued" : "expired" };
}

// 신청·재신청. 처음이면 만들고, 반려됐으면 같은 행을 고쳐 다시 대기로. 그 밖의 상태에선 고칠 수 없다 (FR-3, FR-9)
export async function applyInstructor(userId: string, input: ApplyInput): Promise<void> {
  const db = getDb();
  const regionIds = [...new Set(input.regionIds)];
  try {
    await db.transaction(async (tx) => {
      const [mine] = await tx.select({ id: instructorProfiles.id, status: instructorProfiles.status }).from(instructorProfiles).where(eq(instructorProfiles.userId, userId)).limit(1);
      let id: number;
      if (!mine) {
        const [created] = await tx
          .insert(instructorProfiles)
          .values({ userId, displayName: input.displayName, instagramHandle: input.instagramHandle, bio: input.bio, isProxy: false, status: "pending" })
          .returning({ id: instructorProfiles.id });
        id = created.id;
      } else if (mine.status === "rejected") {
        await tx
          .update(instructorProfiles)
          .set({ displayName: input.displayName, instagramHandle: input.instagramHandle, bio: input.bio, status: "pending", rejectedReason: null, verifyCodeHash: null, verifyCodeExpiresAt: null })
          .where(eq(instructorProfiles.id, mine.id));
        await tx.delete(instructorRegions).where(eq(instructorRegions.instructorId, mine.id));
        id = mine.id;
      } else {
        throw new InstructorError(mine.status === "approved" ? "이미 강사로 승인됐어요" : "이미 신청했어요. 승인을 기다려 주세요");
      }
      await tx.insert(instructorRegions).values(regionIds.map((regionId) => ({ instructorId: id, regionId })));
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      // 같은 핸들이 이미 있다. 아무 계정에도 연결 안 된 대리 강사면 가져오기를 제안한다 (F-19)
      const offer = await findClaimable(input.instagramHandle);
      if (offer) throw new ClaimOffer(offer);
      throw new InstructorError(`@${input.instagramHandle}은 이미 올빗에 있는 계정이에요`);
    }
    throw e;
  }
}

export const verifyCodeInput = z.string().trim().regex(/^\d{6}$/, "숫자 6자리를 넣어 주세요");

// 코드 확인 (FR-7). 본인(userId) 프로필만, 대기 상태에서만. 맞으면 확인됨이 되고 코드는 지운다
export async function verifyInstructorCode(userId: string, code: string): Promise<void> {
  const db = getDb();
  const [mine] = await db
    .select({
      id: instructorProfiles.id,
      status: instructorProfiles.status,
      hash: instructorProfiles.verifyCodeHash,
      valid: sql<boolean>`${instructorProfiles.verifyCodeExpiresAt} > now()`,
    })
    .from(instructorProfiles)
    .where(eq(instructorProfiles.userId, userId))
    .limit(1);
  if (!mine) throw new InstructorError("먼저 강사 신청을 해 주세요");
  if (mine.status !== "pending") throw new InstructorError(mine.status === "verified" ? "이미 확인됐어요" : "지금은 코드를 넣을 수 없어요");
  if (!mine.hash) throw new InstructorError("아직 코드가 발급되지 않았어요. 운영자가 인스타 DM으로 보내면 넣어 주세요");
  if (!mine.valid) throw new InstructorError("코드가 만료됐어요(24시간). 운영자에게 다시 받아 주세요");
  if (hashVerifyCode(mine.id, code) !== mine.hash) throw new InstructorError("코드가 맞지 않아요. 다시 확인해 주세요");

  await db
    .update(instructorProfiles)
    .set({ status: "verified", verifyCodeHash: null, verifyCodeExpiresAt: null })
    .where(and(eq(instructorProfiles.id, mine.id), eq(instructorProfiles.status, "pending")));
}

// ── 대리 강사 가져오기 (F-19, specs/instructor-claim) ─────────────────────
// 운영자가 대신 등록한 강사(isProxy, userId 없음)를 인스타 코드로 본인 확인한 뒤 내 계정에 연결한다.
// 확인 전에는 claimUserId에 신청만 적고, 소유(userId)와 공개 상태는 건드리지 않는다

const unclaimedProxy = and(eq(instructorProfiles.isProxy, true), isNull(instructorProfiles.userId));
// 테이블 하나만 읽는 select는 drizzle이 칸 이름에 테이블을 붙이지 않는다("id"가 classes.id로 풀린다). 하위 쿼리는 이름을 직접 쓴다
const classCountSql = sql<number>`(select count(*)::int from ${classes} c where c.instructor_id = ${instructorProfiles}.id)`;

async function findClaimable(handle: string): Promise<{ handle: string; displayName: string; classCount: number } | null> {
  const [row] = await getDb()
    .select({ handle: instructorProfiles.instagramHandle, displayName: instructorProfiles.displayName, classCount: classCountSql })
    .from(instructorProfiles)
    .where(and(eq(instructorProfiles.instagramHandle, handle), unclaimedProxy))
    .limit(1);
  return row ?? null;
}

// 강사 프로필이 없거나 반려된 사람만 가져올 수 있다 (userId가 unique라 프로필은 하나뿐)
async function assertCanClaim(tx: Pick<ReturnType<typeof getDb>, "select">, userId: string): Promise<{ id: number } | null> {
  const [mine] = await tx.select({ id: instructorProfiles.id, status: instructorProfiles.status }).from(instructorProfiles).where(eq(instructorProfiles.userId, userId)).limit(1);
  if (mine && mine.status !== "rejected") throw new InstructorError(mine.status === "approved" ? "이미 강사로 승인된 계정이에요" : "이미 강사 신청이 진행 중이에요");
  return mine ?? null;
}

export const claimHandleInput = z.string().transform(normalizeInstagramHandle).pipe(z.string().regex(/^[a-z0-9._]{1,30}$/, "인스타그램 아이디를 확인해 주세요"));

// 가져오기 신청. 같은 대리 강사에 먼저 걸린 신청과 코드는 지운다(코드는 인스타 주인에게만 가므로 바꿔치기로 가져갈 수 없다)
export async function requestClaim(userId: string, handle: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    await assertCanClaim(tx, userId);
    const [target] = await tx
      .select({ id: instructorProfiles.id })
      .from(instructorProfiles)
      .where(and(eq(instructorProfiles.instagramHandle, handle), unclaimedProxy))
      .limit(1);
    if (!target) throw new InstructorError("가져올 수 있는 계정이 아니에요. 인스타그램 아이디를 확인해 주세요");

    const cleared = { claimUserId: null, claimRequestedAt: null, verifyCodeHash: null, verifyCodeExpiresAt: null };
    // 한 사람은 한 대리 강사만: 다른 곳에 걸어 둔 내 신청은 지운다
    await tx.update(instructorProfiles).set(cleared).where(and(eq(instructorProfiles.claimUserId, userId), ne(instructorProfiles.id, target.id)));
    await tx.update(instructorProfiles).set({ ...cleared, claimUserId: userId, claimRequestedAt: sql`now()` }).where(eq(instructorProfiles.id, target.id));
  });
}

export type MyClaim = {
  instructorId: number;
  displayName: string;
  instagramHandle: string;
  classCount: number;
  /** 게재 동의가 없어 클래스가 숨어 있는 대리 강사인가 (가져오면 공개된다) */
  hidden: boolean;
  code: "none" | "issued" | "expired";
};

export async function getMyClaim(userId: string): Promise<MyClaim | null> {
  const [row] = await getDb()
    .select({
      instructorId: instructorProfiles.id,
      displayName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      classCount: classCountSql,
      hidden: sql<boolean>`${instructorProfiles.consentAt} is null`,
      hasCode: sql<boolean>`${instructorProfiles.verifyCodeHash} is not null`,
      codeValid: sql<boolean>`coalesce(${instructorProfiles.verifyCodeExpiresAt} > now(), false)`,
    })
    .from(instructorProfiles)
    .where(eq(instructorProfiles.claimUserId, userId))
    .limit(1);
  if (!row) return null;
  const { hasCode, codeValid, ...rest } = row;
  return { ...rest, code: !hasCode ? "none" : codeValid ? "issued" : "expired" };
}

// 코드가 맞으면 이전: 대리 프로필을 내 계정에 연결하고 직접 강사로 (상태는 승인 그대로, 05 플로우 9).
// 동의가 없어 숨어 있던 클래스는 이때 공개되므로 그 곡들의 추가요를 연다
export async function verifyClaimCode(userId: string, code: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: instructorProfiles.id,
        hash: instructorProfiles.verifyCodeHash,
        valid: sql<boolean>`coalesce(${instructorProfiles.verifyCodeExpiresAt} > now(), false)`,
        consented: sql<boolean>`${instructorProfiles.consentAt} is not null`,
      })
      .from(instructorProfiles)
      .where(and(eq(instructorProfiles.claimUserId, userId), unclaimedProxy))
      .limit(1)
      .for("update");
    if (!target) throw new InstructorError("가져오기 신청이 없어요. 강사 신청에서 다시 해 주세요");
    if (!target.hash) throw new InstructorError("아직 코드가 발급되지 않았어요. 운영자가 인스타 DM으로 보내면 넣어 주세요");
    if (!target.valid) throw new InstructorError("코드가 만료됐어요(24시간). 운영자에게 다시 받아 주세요");
    if (hashVerifyCode(target.id, code) !== target.hash) throw new InstructorError("코드가 맞지 않아요. 다시 확인해 주세요");

    // 반려된 내 신청이 있으면 지운다(클래스가 없는 프로필이다). userId unique 때문에 먼저
    const rejected = await assertCanClaim(tx, userId);
    if (rejected) await tx.delete(instructorProfiles).where(eq(instructorProfiles.id, rejected.id));

    await tx
      .update(instructorProfiles)
      .set({ userId, isProxy: false, claimUserId: null, claimRequestedAt: null, verifyCodeHash: null, verifyCodeExpiresAt: null })
      .where(eq(instructorProfiles.id, target.id));
    if (!target.consented) await openRequestsForUpcomingClasses(tx, target.id);
  });
}

// 강사가 가져오기 신청을 거둔다
export async function cancelMyClaim(userId: string): Promise<void> {
  const [updated] = await getDb()
    .update(instructorProfiles)
    .set({ claimUserId: null, claimRequestedAt: null, verifyCodeHash: null, verifyCodeExpiresAt: null })
    .where(eq(instructorProfiles.claimUserId, userId))
    .returning({ id: instructorProfiles.id });
  if (!updated) throw new InstructorError("가져오기 신청이 없어요");
}
