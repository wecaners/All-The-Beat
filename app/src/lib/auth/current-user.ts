import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type CurrentUser = { id: string; metadata: Record<string, unknown> };

// 서버에서 로그인 사용자를 읽는다. 서명이 검증된 클레임(getClaims)만 믿는다 (getSession은 서버에서 쓰지 않음)
// 쿠키를 읽으므로 이 함수를 부르는 컴포넌트는 <Suspense> 안에 있어야 한다
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) return null;
  // 토큰 만료 검사가 현재 시각을 쓰므로 미리 렌더링하지 않고 요청 시점에 읽는다
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, metadata: (claims.user_metadata ?? {}) as Record<string, unknown> };
}
