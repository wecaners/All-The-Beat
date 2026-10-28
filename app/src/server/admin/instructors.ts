import { and, asc, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { classes, classSongs, instructorProfiles, instructorRegions, regions } from "@/db/schema";
import { AdminInputError, isUniqueViolation, kstDateTime, openRequestsForClass } from "./shared";

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
};

export async function listInstructorsForAdmin(): Promise<AdminInstructorRow[]> {
  return getDb()
    .select({
      id: instructorProfiles.id,
      displayName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      isProxy: instructorProfiles.isProxy,
      consentAt: instructorProfiles.consentAt,
      classCount: sql<number>`(select count(*)::int from ${classes} where ${classes.instructorId} = ${instructorProfiles.id})`,
    })
    .from(instructorProfiles)
    .orderBy(desc(instructorProfiles.createdAt));
}

export type AdminInstructorDetail = AdminInstructorRow & {
  consentNote: string | null;
  regionNames: string[];
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
    })
    .from(instructorProfiles)
    .where(eq(instructorProfiles.id, id))
    .limit(1);
  if (!row) return null;

  const [regionRows, [{ classCount }]] = await Promise.all([
    db
      .select({ name: regions.shortName })
      .from(instructorRegions)
      .innerJoin(regions, eq(regions.id, instructorRegions.regionId))
      .where(eq(instructorRegions.instructorId, id))
      .orderBy(asc(regions.sortOrder)),
    db.select({ classCount: count() }).from(classes).where(eq(classes.instructorId, id)),
  ]);

  return { ...row, classCount, regionNames: regionRows.map((r) => r.name) };
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

    const upcoming = await tx
      .select({ id: classes.id })
      .from(classes)
      .where(
        and(
          eq(classes.instructorId, input.instructorId),
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
  });
}
