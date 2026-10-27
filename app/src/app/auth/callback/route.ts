import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { upsertProfileOnLogin } from "@/server/profiles";

// 카카오 → Supabase Auth → 여기로 돌아온다. 인가 코드를 세션으로 바꾸고 원래 화면으로 보낸다 (08 문서 2.2)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectToError(url.origin, { reason: "exchange_failed", detail: error.message, next });
    }

    // 우리 DB의 사용자(profiles)를 만들거나 카카오 닉네임·사진을 최신으로 맞춘다
    try {
      await upsertProfileOnLogin(data.user.id, data.user.user_metadata ?? {});
    } catch (e) {
      console.error("[auth/callback] profile upsert failed", e);
      // 프로필 없이 로그인만 된 상태를 남기지 않는다
      await supabase.auth.signOut();
      return redirectToError(url.origin, { reason: "profile_failed", detail: "잠시 후 다시 로그인해 주세요", next });
    }

    return NextResponse.redirect(new URL(next, url.origin));
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
