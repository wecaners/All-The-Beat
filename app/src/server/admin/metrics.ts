import { and, asc, count, countDistinct, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artists, classes, encoreRounds, events, profiles, requests, songs, userVisits } from "@/db/schema";

// 운영자 지표 (F-18, specs/admin-metrics). 기획서 6절 성공 지표를 화면을 열 때마다 DB에서 센다

// 기획서 6절 목표 (출시 후 8주)
export const METRIC_TARGETS = { classes: 30, selfServeInstructors: 3, clicks: 50, convertedSongs: 1, revisits: 10 } as const;

const TOP_LIMIT = 10;

export type MetricSong = { songId: number; title: string; artistName: string };

export type AdminMetrics = {
  /** 취소·숨김 제외. 이번 주 = KST 월요일 0시부터 올린 것 */
  classes: { total: number; byAdmin: number; byInstructor: number; thisWeek: number };
  /** 클래스를 직접 올린 적이 있는 강사 수 */
  selfServeInstructors: number;
  /** 숨김·취소 클래스 포함 */
  clicks: { total: number; thisWeek: number; top: { classId: number; title: string; clicks: number }[] };
  /** 취소 아닌 추가요 */
  requests: { total: number; top: (MetricSong & { count: number })[] };
  /** 클래스 공개로 추가요가 열렸어요가 된 적이 있는 곡 */
  convertedSongs: MetricSong[];
  /** 기준 인원에 닿은 클래스 수 / 그중 앵콜 클래스가 열린 수 */
  encore: { reached: number; opened: number };
  /** since = 접속 기록을 시작한 날(KST, "2026-11-04"). 기록이 없으면 null */
  revisit: { since: string | null; signups: number; returned: number };
};

// 이번 주 시작 = KST 월요일 0시. 경계는 DB 안에서 계산한다 (JS Date로 오가면 시간대·정밀도가 어긋난다)
const weekStart = sql`(date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')`;
const isBookingClick = eq(events.type, "booking_click");

// 재방문 (기획서 6절): 접속 기록을 시작한 날 이후 가입한 사람(운영자·탈퇴자 제외) 중
// 가입한 KST 날짜 다음 날부터 14일 안에 접속한 날이 있는 사람
const REVISIT_DAYS = 14;
const recordingSince = sql`(select min(${userVisits.visitedOn}) from ${userVisits})`;
const signupDate = sql`(${profiles.createdAt} at time zone 'Asia/Seoul')::date`;
const returnedSql = sql`exists (select 1 from ${userVisits} where ${userVisits.userId} = ${profiles.id} and ${userVisits.visitedOn} between ${signupDate} + 1 and ${signupDate} + ${REVISIT_DAYS}::int)`;

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const db = getDb();
  const [[classRow], [instructorRow], [clickRow], clickTop, [requestRow], requestTop, converted, [encoreRow], [revisitRow]] = await Promise.all([
    db
      .select({
        total: count(),
        byAdmin: sql<number>`count(*) filter (where ${classes.createdByAdmin})::int`,
        thisWeek: sql<number>`count(*) filter (where ${classes.createdAt} >= ${weekStart})::int`,
      })
      .from(classes)
      .where(and(ne(classes.status, "canceled"), eq(classes.isHidden, false))),
    // 직접 올린 사실은 나중에 취소·숨김해도 남는다
    db.select({ n: countDistinct(classes.instructorId) }).from(classes).where(eq(classes.createdByAdmin, false)),
    db
      .select({ total: count(), thisWeek: sql<number>`count(*) filter (where ${events.createdAt} >= ${weekStart})::int` })
      .from(events)
      .where(isBookingClick),
    db
      .select({ classId: classes.id, title: classes.title, clicks: count() })
      .from(events)
      .innerJoin(classes, eq(classes.id, events.classId))
      .where(isBookingClick)
      .groupBy(classes.id)
      .orderBy(desc(count()), asc(classes.id))
      .limit(TOP_LIMIT),
    db.select({ total: count() }).from(requests).where(ne(requests.status, "canceled")),
    db
      .select({ songId: songs.id, title: songs.title, artistName: artists.name, count: count() })
      .from(requests)
      .innerJoin(songs, eq(songs.id, requests.songId))
      .innerJoin(artists, eq(artists.id, songs.artistId))
      .where(ne(requests.status, "canceled"))
      .groupBy(songs.id, artists.name)
      .orderBy(desc(count()), asc(songs.id))
      .limit(TOP_LIMIT),
    // openRequestsForClass가 남긴 fulfilledClassId는 추가요를 취소해도 남는다
    db
      .selectDistinct({ songId: songs.id, title: songs.title, artistName: artists.name })
      .from(requests)
      .innerJoin(songs, eq(songs.id, requests.songId))
      .innerJoin(artists, eq(artists.id, songs.artistId))
      .where(isNotNull(requests.fulfilledClassId))
      .orderBy(asc(songs.id)),
    db
      .select({
        reached: sql<number>`count(*) filter (where ${encoreRounds.reachedAt} is not null)::int`,
        opened: sql<number>`count(*) filter (where ${encoreRounds.reachedAt} is not null and ${encoreRounds.status} = 'opened')::int`,
      })
      .from(encoreRounds),
    db
      .select({
        since: sql<string | null>`${recordingSince}::text`,
        signups: count(),
        returned: sql<number>`count(*) filter (where ${returnedSql})::int`,
      })
      .from(profiles)
      .where(and(ne(profiles.role, "admin"), isNull(profiles.deletedAt), sql`${signupDate} >= ${recordingSince}`)),
  ]);

  return {
    classes: {
      total: classRow.total,
      byAdmin: classRow.byAdmin,
      byInstructor: classRow.total - classRow.byAdmin,
      thisWeek: classRow.thisWeek,
    },
    selfServeInstructors: instructorRow.n,
    clicks: { total: clickRow.total, thisWeek: clickRow.thisWeek, top: clickTop },
    requests: { total: requestRow.total, top: requestTop },
    convertedSongs: converted,
    encore: encoreRow,
    revisit: revisitRow,
  };
}
