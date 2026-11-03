import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { instructorProfiles, instructorRegions, regions } from "@/db/schema";
import { hashVerifyCode, instructorInput } from "@/server/admin/instructors";
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
      // 같은 핸들이 이미 있다. 대리 등록 계정이면 그렇다고 알린다 (F-19 클레임은 아직 없다)
      const [other] = await db.select({ isProxy: instructorProfiles.isProxy }).from(instructorProfiles).where(eq(instructorProfiles.instagramHandle, input.instagramHandle)).limit(1);
      throw new InstructorError(
        other?.isProxy
          ? `@${input.instagramHandle}은 운영자가 대신 등록해 둔 계정이에요. 내 계정으로 가져오는 기능은 아직 없어요`
          : `@${input.instagramHandle}은 이미 올빗에 있는 계정이에요`,
      );
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
