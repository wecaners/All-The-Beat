import { and, count, desc, eq, gt, inArray, isNotNull, isNull, notExists, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { classes, encoreRounds, encores, instructorProfiles } from "@/db/schema";
import { activeEncoreCount, type EncoreStatus } from "@/server/encores";
import { AdminInputError, type Tx } from "./shared";

// 운영자가 강사를 대신해 앵콜을 전하고 답을 남긴다 (specs/encore). 강사 화면이 생기면 같은 함수를 쓴다

// 라운드 행 기준 지금 상태. 모으는 중·전달됨이 만료 시각을 넘으면 만료 (S-4, 검토 중은 만료 없음)
const roundStatus = sql<EncoreStatus>`case when ${encoreRounds.status} in ('collecting', 'delivered') and ${encoreRounds.expiresAt} <= now() then 'expired' else ${encoreRounds.status}::text end`;

export type AdminEncoreRow = {
  classId: number;
  title: string;
  startsAt: Date;
  instructorName: string;
  instagramHandle: string;
  isProxy: boolean;
  status: EncoreStatus;
  threshold: number;
  count: number;
  countAtReview: number | null;
  reachedAt: Date | null;
  reviewingAt: Date | null;
  expiresAt: Date;
};

export type AdminEncoreDetail = AdminEncoreRow & {
  timePrefs: { timePref: string; count: number }[];
  /** 최근 한마디 5개 (강사에게 전하는 용도. 누가 남겼는지는 보여주지 않는다) */
  messages: string[];
};

// 응답이 필요한 앵콜(전달됨·검토 중)과 모으는 중인 앵콜
export async function listEncoresForAdmin(): Promise<{ needsResponse: AdminEncoreDetail[]; collecting: AdminEncoreRow[] }> {
  const db = getDb();
  const rows: AdminEncoreRow[] = await db
    .select({
      classId: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      instructorName: instructorProfiles.displayName,
      instagramHandle: instructorProfiles.instagramHandle,
      isProxy: instructorProfiles.isProxy,
      status: roundStatus,
      threshold: encoreRounds.threshold,
      count: activeEncoreCount(classes.id),
      countAtReview: encoreRounds.countAtReview,
      reachedAt: encoreRounds.reachedAt,
      reviewingAt: encoreRounds.reviewingAt,
      expiresAt: encoreRounds.expiresAt,
    })
    .from(encoreRounds)
    .innerJoin(classes, eq(classes.id, encoreRounds.classId))
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .where(inArray(encoreRounds.status, ["collecting", "delivered", "reviewing"]))
    .orderBy(desc(encoreRounds.reachedAt), desc(classes.startsAt));

  const needs = rows.filter((r) => r.status === "delivered" || r.status === "reviewing");
  const collecting = rows.filter((r) => r.status === "collecting");

  const needsResponse = await Promise.all(
    needs.map(async (r) => {
      const active = and(eq(encores.classId, r.classId), isNull(encores.canceledAt));
      const [timePrefs, messages] = await Promise.all([
        db.select({ timePref: encores.timePref, count: count() }).from(encores).where(active).groupBy(encores.timePref).orderBy(desc(count())),
        db
          .select({ message: encores.message })
          .from(encores)
          .where(and(active, isNotNull(encores.message)))
          .orderBy(desc(encores.createdAt))
          .limit(5),
      ]);
      return { ...r, timePrefs, messages: messages.map((m) => m.message!) };
    }),
  );
  return { needsResponse, collecting };
}

// 기준에 닿았고 아직 답이 없는 앵콜 수 (운영 첫 화면)
export async function countEncoresAwaitingResponse(): Promise<number> {
  const [{ total }] = await getDb()
    .select({ total: count() })
    .from(encoreRounds)
    .where(and(eq(encoreRounds.status, "delivered"), gt(encoreRounds.expiresAt, sql`now()`)));
  return total;
}

async function lockRound(tx: Tx, classId: number) {
  const [round] = await tx
    .select({ status: roundStatus, instructorId: classes.instructorId })
    .from(encoreRounds)
    .innerJoin(classes, eq(classes.id, encoreRounds.classId))
    .where(eq(encoreRounds.classId, classId))
    .for("update", { of: encoreRounds });
  if (!round) throw new AdminInputError("앵콜이 없는 클래스예요");
  return round;
}

// 강사의 답을 대신 남긴다. 상태는 앞으로만 간다:
// 검토할게요 = 전달됨 → 검토 중 (그때 인원을 기준점으로 저장), 이번엔 어려워요 = 전달됨·검토 중 → 어려워요
export async function respondToEncore(classId: number, answer: "review" | "decline") {
  await getDb().transaction(async (tx) => {
    const round = await lockRound(tx, classId);
    if (answer === "review") {
      if (round.status !== "delivered") throw new AdminInputError("전달된 앵콜만 검토로 바꿀 수 있어요");
      await tx
        .update(encoreRounds)
        .set({ status: "reviewing", reviewingAt: sql`now()`, respondedAt: sql`now()`, countAtReview: activeEncoreCount(classId) })
        .where(eq(encoreRounds.classId, classId));
    } else {
      if (round.status !== "delivered" && round.status !== "reviewing") throw new AdminInputError("전달됐거나 검토 중인 앵콜만 답할 수 있어요");
      await tx.update(encoreRounds).set({ status: "declined", respondedAt: sql`now()` }).where(eq(encoreRounds.classId, classId));
    }
  });
}

// 앵콜 클래스를 등록할 때 원 라운드를 오픈으로 (클래스 등록과 같은 트랜잭션). 같은 강사만, 전달됨·검토 중에서만 (S-4)
export async function openEncoreRound(tx: Tx, originClassId: number, instructorId: number, encoreClassId: number) {
  const round = await lockRound(tx, originClassId);
  if (round.instructorId !== instructorId) throw new AdminInputError("앵콜 클래스는 원 클래스의 강사만 열 수 있어요");
  if (round.status !== "delivered" && round.status !== "reviewing") throw new AdminInputError("전달됐거나 검토 중인 앵콜만 앵콜 클래스로 이을 수 있어요");
  await tx
    .update(encoreRounds)
    .set({ status: "opened", encoreClassId, respondedAt: sql`now()` })
    .where(eq(encoreRounds.classId, originClassId));
}

// 운영자 마감 (F-17 일부). 다가오는 모집 중·마감 임박만 마감하고,
// 마감 풀기는 앵콜이 한 번도 없던 클래스만 (앵콜한 사람의 상태가 화면에서 사라지지 않게)
export async function setClassClosed(classId: number, closed: boolean) {
  const db = getDb();
  const notEnded = gt(classes.endsAt, sql`now()`);
  if (closed) {
    const updated = await db
      .update(classes)
      .set({ status: "closed", updatedAt: sql`now()` })
      .where(and(eq(classes.id, classId), inArray(classes.status, ["open", "closing_soon"]), notEnded))
      .returning({ id: classes.id });
    if (updated.length === 0) throw new AdminInputError("모집 중인 다가오는 클래스만 마감할 수 있어요");
  } else {
    const updated = await db
      .update(classes)
      .set({ status: "open", updatedAt: sql`now()` })
      .where(
        and(
          eq(classes.id, classId),
          eq(classes.status, "closed"),
          notEnded,
          notExists(db.select({ one: sql`1` }).from(encoreRounds).where(eq(encoreRounds.classId, classes.id))),
        ),
      )
      .returning({ id: classes.id });
    if (updated.length === 0) throw new AdminInputError("앵콜이 있었던 클래스나 끝난 클래스는 마감을 풀 수 없어요");
  }
}
