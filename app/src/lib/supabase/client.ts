import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./env";

// 클라이언트 컴포넌트용. 로그인 시작(signInWithOAuth)과 로그아웃에만 쓴다
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
