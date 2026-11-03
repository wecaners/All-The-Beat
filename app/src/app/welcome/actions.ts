"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeNextPath } from "@/lib/safe-next";
import { saveConsent } from "@/server/consent";
import { ensureProfile } from "@/server/profiles";

export type ConsentActionState = { ok: boolean; error?: string };

// 동의 저장. 필수 둘이 모두 체크된 요청만 받고, 시각은 서버가 정한다 (specs/terms-consent FR-3)
export async function saveConsentAction(_prev: ConsentActionState, formData: FormData): Promise<ConsentActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const checked = (key: string) => formData.get(key) === "on";
  if (!checked("terms") || !checked("privacy")) return { ok: false, error: "필수 항목에 동의해야 시작할 수 있어요" };

  try {
    await ensureProfile(user.id, user.metadata);
    await saveConsent(user.id, { marketing: checked("marketing") });
  } catch (e) {
    console.error("[saveConsentAction]", e);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }

  redirect(safeNextPath(formData.get("next")?.toString()));
}
