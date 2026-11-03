import { and, count, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { classes, encoreRounds, encores, encoreRoundStatus, instructorProfiles, timePref } from "@/db/schema";
import { classEnded, type ClassDisplayStatus, displayStatusOf, publiclyVisible } from "@/server/classes";

// 앵콜 (F-24, specs/encore). 인원은 저장하지 않고 유효 앵콜(canceled_at NULL)에서 센다

export type EncoreStatus = (typeof encoreRoundStatus.enumValues)[number];

// 원 클래스 종료 후 이 기간까지 앵콜을 받는다 (F-24 [가정])
export const ENCORE_DAYS = 30;

// 기준 인원: 정원의 30% 올림(최소 3명), 정원이 없으면 5명. 소수 곱셈 오차를 피해 정수로 계산한다
export function encoreThreshold(capacity: number | null): number {
  return capacity ? Math.max(3, Math.ceil((capacity * 3) / 10)) : 5;
}

// 앵콜을 받을 수 있는 클래스 표시 상태 (마감·종료)
export function isEncoreTarget(status: ClassDisplayStatus): boolean {
  return status === "closed" || status === "ended";
}

// 앵콜을 더 남길 수 있는 진행 상태. 오픈·어려워요·만료는 끝난 상태다 (S-4)
export function acceptsEncore(status: EncoreStatus): boolean {
  return status === "collecting" || status === "delivered" || status === "reviewing";
}

// 지금 보이는 진행 상태. 만료는 저장하지 않고 읽을 때 정한다: 모으는 중·전달됨이 만료 시각을 넘으면 만료.
// 검토 중은 만료되지 않는다. 라운드 행이 없으면(아직 앵콜이 없으면) 원 클래스 종료 + 30일로 판단한다
// encore_rounds를 left join한 쿼리에서 쓴다
export const effectiveEncoreStatus = sql<EncoreStatus>`case
  when ${encoreRounds.status} is null then
    case when ${classes.endsAt} + make_interval(days => ${ENCORE_DAYS}) <= now() then 'expired' else 'collecting' end
  when ${encoreRounds.status} in ('collecting', 'delivered') and ${encoreRounds.expiresAt} <= now() then 'expired'
  else ${encoreRounds.status}::text
end`;

export const activeEncoreCount = (classId: number | typeof classes.id) =>
  sql<number>`(select count(*)::int from ${encores} where ${encores.classId} = ${classId} and ${encores.canceledAt} is null)`;

export const encoreInput = z.object({
  timePref: z.enum(timePref.enumValues).default("any"),
  message: z
    .string()
    .trim()
    .max(100, "한마디는 100자까지예요")
    .transform((v) => v || null)
    .nullable()
    .default(null),
});
export type EncoreInput = z.infer<typeof encoreInput>;

export type EncoreSummary = {
  status: EncoreStatus;
  count: number;
  threshold: number;
  /** 앵콜 클래스가 열렸고 수강생에게 공개됐을 때만 */
  encoreClassId: number | null;
};

// 클래스 상세의 앵콜 패널. 마감·종료 클래스에서만 부른다
export async function getEncoreSummary(classId: number): Promise<EncoreSummary | null> {
  const db = getDb();
  const [row] = await db
    .select({
      capacity: classes.capacity,
      threshold: encoreRounds.threshold,
      status: effectiveEncoreStatus,
      encoreClassId: encoreRounds.encoreClassId,
      count: activeEncoreCount(classes.id),
    })
    .from(classes)
    .leftJoin(encoreRounds, eq(encoreRounds.classId, classes.id))
    .where(eq(classes.id, classId));
  if (!row) return null;

  let encoreClassId: number | null = null;
  if (row.status === "opened" && row.encoreClassId) {
    const [visible] = await db
      .select({ id: classes.id })
      .from(classes)
      .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
      .where(and(eq(classes.id, row.encoreClassId), publiclyVisible));
    encoreClassId = visible?.id ?? null;
  }

  return {
    status: row.status,
    count: row.count,
    threshold: row.threshold ?? encoreThreshold(row.capacity),
    encoreClassId,
  };
}

export type MyEncore = { timePref: EncoreInput["timePref"]; message: string | null };

export async function getMyEncore(userId: string, classId: number): Promise<MyEncore | null> {
  const [row] = await getDb()
    .select({ timePref: encores.timePref, message: encores.message })
    .from(encores)
    .where(and(eq(encores.userId, userId), eq(encores.classId, classId), isNull(encores.canceledAt)))
    .limit(1);
  return row ?? null;
}

export class EncoreError extends Error {}

// 사용자 × 클래스 = 1건 (UK). 처음이면 만들고, 있으면 시간대·한마디만 고친다.
// 취소했던 걸 다시 하면 살리고 created_at을 지금으로 (추가요와 같은 규칙).
// 라운드 행을 잠근 채 세어서, 기준 도달(모으는 중 → 전달됨)이 동시에 들어와도 한 번만 일어난다
export async function saveEncore(userId: string, classId: number, input: EncoreInput) {
  return getDb().transaction(async (tx) => {
    const [c] = await tx
      .select({ capacity: classes.capacity, status: classes.status, ended: classEnded })
      .from(classes)
      .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
      .where(and(eq(classes.id, classId), publiclyVisible));
    if (!c) throw new EncoreError("없는 클래스예요");
    if (!isEncoreTarget(displayStatusOf(c.status, c.ended))) throw new EncoreError("마감되거나 끝난 클래스만 앵콜할 수 있어요");

    // 첫 앵콜 때 라운드를 만든다. 기준 인원과 만료 시각은 이때 정해져 바뀌지 않는다
    await tx
      .insert(encoreRounds)
      .values({
        classId,
        threshold: encoreThreshold(c.capacity),
        expiresAt: sql`(select ${classes.endsAt} + make_interval(days => ${ENCORE_DAYS}) from ${classes} where ${classes.id} = ${classId})`,
      })
      .onConflictDoNothing();

    const [round] = await tx
      .select({
        status: sql<EncoreStatus>`case when ${encoreRounds.status} in ('collecting', 'delivered') and ${encoreRounds.expiresAt} <= now() then 'expired' else ${encoreRounds.status}::text end`,
        threshold: encoreRounds.threshold,
      })
      .from(encoreRounds)
      .where(eq(encoreRounds.classId, classId))
      .for("update");
    if (!acceptsEncore(round.status)) throw new EncoreError("이 클래스는 지금 앵콜을 받지 않아요");

    const [before] = await tx
      .select({ canceledAt: encores.canceledAt })
      .from(encores)
      .where(and(eq(encores.userId, userId), eq(encores.classId, classId)))
      .limit(1);
    const isNew = !before || before.canceledAt !== null;

    await tx
      .insert(encores)
      .values({ userId, classId, ...input })
      .onConflictDoUpdate({
        target: [encores.userId, encores.classId],
        set: {
          timePref: input.timePref,
          message: input.message,
          createdAt: sql`case when ${encores.canceledAt} is not null then now() else ${encores.createdAt} end`,
          canceledAt: null,
        },
      });

    const [{ total }] = await tx
      .select({ total: count() })
      .from(encores)
      .where(and(eq(encores.classId, classId), isNull(encores.canceledAt)));

    // 상태는 앞으로만 간다: 모으는 중에서 기준에 닿을 때만 전달됨
    const delivered = round.status === "collecting" && total >= round.threshold;
    if (delivered) {
      await tx.update(encoreRounds).set({ status: "delivered", reachedAt: sql`now()` }).where(eq(encoreRounds.classId, classId));
    }

    return { isNew, count: total, delivered };
  });
}

// 취소는 어느 상태에서든 막지 않는다. 진행 상태는 그대로 둔다 (F-24 규칙)
export async function cancelEncore(userId: string, classId: number) {
  await getDb()
    .update(encores)
    .set({ canceledAt: sql`now()` })
    .where(and(eq(encores.userId, userId), eq(encores.classId, classId), isNull(encores.canceledAt)));
}
