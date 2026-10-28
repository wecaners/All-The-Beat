import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { classes, instructorProfiles } from "@/db/schema";
import { canBook, classEnded, classIdInput, displayStatusOf, publiclyVisible } from "@/server/classes";

// 같은 사람·같은 클래스의 예약 이동은 이 시간 안이면 1회로 센다 (03 명세 F-06)
const DEDUPE_MINUTES = 10;

const bookingInput = z.object({
  classId: classIdInput,
  userId: z.uuid().nullable(),
  sessionId: z.string().min(1).max(100),
  // 유입 경로는 길이만 잘라 저장한다
  referrer: z
    .string()
    .nullable()
    .transform((v) => (v ? v.slice(0, 500) : null)),
});
export type BookingInput = z.input<typeof bookingInput>;

export type BookingResult = { kind: "missing" } | { kind: "unavailable"; classId: number } | { kind: "go"; url: string };

// 예약 이동 (F-06): 공개된 예약 가능 클래스면 넘어간 1회를 기록하고 그 클래스의 예약 링크를 돌려준다.
// 리다이렉트 대상은 DB에 저장된 링크뿐이다 (08 문서 2.3, 오픈 리다이렉트 방지)
export async function goToBooking(raw: BookingInput): Promise<BookingResult> {
  const parsed = bookingInput.safeParse(raw);
  if (!parsed.success) return { kind: "missing" };
  const input = parsed.data;
  const db = getDb();

  const [row] = await db
    .select({ bookingUrl: classes.bookingUrl, status: classes.status, ended: classEnded })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .where(and(eq(classes.id, input.classId), publiclyVisible));
  if (!row) return { kind: "missing" };
  if (!canBook(displayStatusOf(row.status, row.ended))) return { kind: "unavailable", classId: input.classId };

  // 기록이 실패해도 수강생은 예약하러 가야 한다
  try {
    await recordBookingClick(input);
  } catch (e) {
    console.error("[bookings] click record failed", e);
  }
  return { kind: "go", url: row.bookingUrl };
}

// 10분 창은 유니크 제약으로 못 지켜서 한 문장으로 "없으면 넣기"를 한다.
// 동시에 두 번 눌러 2건이 되는 경합은 지표 오차로 받아들인다 (specs/class-detail findings)
async function recordBookingClick(input: z.output<typeof bookingInput>) {
  const sameVisitor = input.userId ? sql`user_id = ${input.userId}` : sql`session_id = ${input.sessionId}`;
  await getDb().execute(sql`
    insert into events (type, class_id, user_id, session_id, referrer)
    select 'booking_click'::event_type, ${input.classId}::bigint, ${input.userId}::uuid, ${input.sessionId}::text, ${input.referrer}::text
    where not exists (
      select 1 from events
      where type = 'booking_click'
        and class_id = ${input.classId}
        and ${sameVisitor}
        and created_at > now() - make_interval(mins => ${DEDUPE_MINUTES})
    )
  `);
}
