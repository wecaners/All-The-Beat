"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { withdraw, WithdrawError } from "@/server/account";

// 로그아웃: 이 기기의 로그인 세션을 끊고 홈으로 (specs/my-page FR-9)
export async function signOutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[signOutAction]", error.message);
  redirect("/");
}

// 회원 탈퇴 (F-09, specs/account-withdrawal). 로그인한 본인만. 다른 사람 id는 받지 않는다 (FR-5)
export async function withdrawAction(): Promise<{ ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  try {
    await withdraw(user.id);
  } catch (e) {
    if (e instanceof WithdrawError) return { ok: false, error: e.message };
    console.error("[withdrawAction]", e);
    return { ok: false, error: "탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }

  // 서버 세션은 계정과 함께 지워졌다. 이 기기 쿠키만 지운다
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("[withdrawAction] signOut", error.message);
  redirect("/bye");
}
