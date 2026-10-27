import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// 카카오 → Supabase Auth → 여기로 돌아온다. 인가 코드를 세션으로 바꾸고 원래 화면으로 보낸다 (08 문서 2.2)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return redirectToError(url.origin, { reason: "exchange_failed", detail: error.message, next });
  }

  // 카카오 동의 거부, 스코프 오류(KOE205 등)는 Supabase가 error 파라미터를 붙여 돌려보낸다
  return redirectToError(url.origin, {
    reason: url.searchParams.get("error") ?? "missing_code",
    detail: url.searchParams.get("error_description") ?? "",
    next,
  });
}

function redirectToError(origin: string, params: Record<string, string>) {
  const target = new URL("/auth/error", origin);
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
  return NextResponse.redirect(target);
}
