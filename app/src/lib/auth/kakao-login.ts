import { createClient } from "@/lib/supabase/client";

// 카카오 로그인을 시작한다. 끝나면 /auth/callback을 거쳐 nextPath(상대 경로)로 돌아온다
export async function startKakaoLogin(nextPath: string) {
  const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { error } = await createClient().auth.signInWithOAuth({ provider: "kakao", options: { redirectTo } });
  if (error) throw error;
}
