import type { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { recordVisit, visitDateKst } from "@/server/visits";

// 오늘 접속을 이미 남긴 브라우저 표시 "{userId}:{KST 날짜}". 요청마다 DB에 쓰지 않으려고 둔다 (specs/admin-metrics CON-5)
const VISIT_COOKIE = "ab_visit";
const VISIT_MAX_AGE = 60 * 60 * 24 * 2;

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  if (userId) await markVisit(request, response, userId);
  return response;
}

// 로그인 사용자의 접속 날짜 (F-18 재방문). 실패해도 화면은 그대로 연다 (CON-4)
async function markVisit(request: NextRequest, response: NextResponse, userId: string) {
  const today = visitDateKst();
  const mark = `${userId}:${today}`;
  if (request.cookies.get(VISIT_COOKIE)?.value === mark) return;
  try {
    await recordVisit(userId, today);
    response.cookies.set(VISIT_COOKIE, mark, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: VISIT_MAX_AGE,
      path: "/",
    });
  } catch (e) {
    console.error("접속 기록 실패", e);
  }
}

export const config = {
  matcher: [
    // 정적 파일·이미지 최적화·파비콘·이미지 파일은 제외
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
