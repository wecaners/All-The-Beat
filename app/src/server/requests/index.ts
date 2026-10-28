import { and, count, desc, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { regions, requests, timePref } from "@/db/schema";
import { isRequestableSong } from "@/server/songs";

// 곡 상세의 추가요 수는 최근 90일 기준 (03 명세 F-04)
const SUMMARY_DAYS = 90;

export const requestInput = z.object({
  regionId: z.number().int().positive().nullable(), // null = 어디든 좋아요
  timePref: z.enum(timePref.enumValues).default("any"),
  message: z
    .string()
    .trim()
    .max(100, "한마디는 100자까지예요")
    .transform((v) => v || null)
    .nullable()
    .default(null),
});
export type RequestInput = z.infer<typeof requestInput>;

export type MyRequest = {
  status: "waiting" | "opened" | "canceled";
  regionId: number | null;
  timePref: RequestInput["timePref"];
  message: string | null;
};

export type RequestSummary = {
  total: number;
  topRegions: { name: string; count: number }[];
};

export async function getRequestSummary(songId: number): Promise<RequestSummary> {
  const db = getDb();
  const recent = and(
    eq(requests.songId, songId),
    ne(requests.status, "canceled"),
    gte(requests.createdAt, sql`now() - make_interval(days => ${SUMMARY_DAYS})`),
  );

  const [[{ total }], topRegions] = await Promise.all([
    db.select({ total: count() }).from(requests).where(recent),
    db
      .select({ name: regions.shortName, count: count() })
      .from(requests)
      .innerJoin(regions, eq(regions.id, requests.regionId))
      .where(and(recent, isNotNull(requests.regionId)))
      .groupBy(regions.id, regions.shortName)
      .orderBy(desc(count()), regions.sortOrder)
      .limit(3),
  ]);

  return { total, topRegions };
}

export async function getMyRequest(userId: string, songId: number): Promise<MyRequest | null> {
  const [row] = await getDb()
    .select({ status: requests.status, regionId: requests.regionId, timePref: requests.timePref, message: requests.message })
    .from(requests)
    .where(and(eq(requests.userId, userId), eq(requests.songId, songId)))
    .limit(1);
  return row ?? null;
}

export class RequestError extends Error {}

// 사용자 × 곡 = 1건 (UK). 처음이면 만들고, 있으면 권역·시간대·한마디를 고친다.
// 취소했던 걸 다시 하면 waiting으로 되돌리고 created_at을 지금으로 바꾼다: "최근 90일" 집계에 새 요청으로 잡히게
export async function saveRequest(userId: string, songId: number, input: RequestInput) {
  if (!(await isRequestableSong(songId))) throw new RequestError("없는 곡이에요");
  if (input.regionId !== null) {
    const [region] = await getDb().select({ id: regions.id }).from(regions).where(eq(regions.id, input.regionId)).limit(1);
    if (!region) throw new RequestError("없는 권역이에요");
  }

  return getDb().transaction(async (tx) => {
    // 첫 추가요(처음이거나 취소 후 다시)일 때만 완료 순간을 보여준다 (specs/design-system FR-4)
    const [before] = await tx
      .select({ status: requests.status })
      .from(requests)
      .where(and(eq(requests.userId, userId), eq(requests.songId, songId)))
      .limit(1);
    const isNew = !before || before.status === "canceled";

    await tx
      .insert(requests)
      .values({ userId, songId, ...input })
      .onConflictDoUpdate({
        target: [requests.userId, requests.songId],
        set: {
          regionId: input.regionId,
          timePref: input.timePref,
          message: input.message,
          // 열렸어요(opened)는 수정해도 유지한다
          status: sql`case when ${requests.status} = 'canceled' then 'waiting'::request_status else ${requests.status} end`,
          createdAt: sql`case when ${requests.status} = 'canceled' then now() else ${requests.createdAt} end`,
          canceledAt: null,
        },
      });

    // 순번: 곡 상세와 같은 기준(최근 90일, 취소 제외)에서 내 요청까지의 수.
    // 내 생성 시각은 DB 안에서 비교한다. JS Date로 가져오면 마이크로초가 잘려 내 요청이 빠진다 (findings Issues 2)
    const mine = sql`(select ${requests.createdAt} from ${requests} where ${requests.userId} = ${userId} and ${requests.songId} = ${songId})`;
    const [{ position }] = await tx
      .select({ position: count() })
      .from(requests)
      .where(
        and(
          eq(requests.songId, songId),
          ne(requests.status, "canceled"),
          gte(requests.createdAt, sql`now() - make_interval(days => ${SUMMARY_DAYS})`),
          lte(requests.createdAt, mine),
        ),
      );

    return { isNew, position };
  });
}

export async function cancelRequest(userId: string, songId: number) {
  await getDb()
    .update(requests)
    .set({ status: "canceled", canceledAt: sql`now()` })
    .where(and(eq(requests.userId, userId), eq(requests.songId, songId), ne(requests.status, "canceled")));
}
