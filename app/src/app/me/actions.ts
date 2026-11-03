"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 로그아웃: 이 기기의 로그인 세션을 끊고 홈으로 (specs/my-page FR-9)
export async function signOutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[signOutAction]", error.message);
  redirect("/");
}
