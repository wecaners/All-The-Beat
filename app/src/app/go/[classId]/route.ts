import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { goToBooking } from "@/server/bookings";

// 비로그인 예약 이동의 중복을 거르는 브라우저 식별값. 예약 이동 때만 만든다 (specs/class-detail CON-4)
const SESSION_COOKIE = "ab_sid";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

// 예약하러 가기 (F-06): 넘어간 1회를 기록하고 강사의 예약 채널로 보낸다. 화면 없음
export async function GET(request: NextRequest, ctx: RouteContext<"/go/[classId]">) {
  const { classId } = await ctx.params;
  const user = await getCurrentUser();
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existingSession || crypto.randomUUID();

  const result = await goToBooking({
    classId,
    userId: user?.id ?? null,
    sessionId,
    referrer: request.headers.get("referer"),
  });

  if (result.kind === "missing") {
    return new NextResponse("클래스를 찾을 수 없어요", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  // 마감·종료·취소: 예약 채널로 보내지 않고 클래스 상세에서 이유를 보여준다
  if (result.kind === "unavailable") {
    return NextResponse.redirect(new URL(`/class/${result.classId}`, request.url), 302);
  }

  const response = NextResponse.redirect(result.url, 302);
  if (!existingSession) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }
  return response;
}
