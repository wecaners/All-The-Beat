"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasConsented } from "@/server/consent";
import { applyInput, applyInstructor, InstructorError, verifyCodeInput, verifyInstructorCode } from "@/server/instructors";
import { ensureProfile } from "@/server/profiles";

export type InstructorActionState = { ok: boolean; error?: string };

// 강사 신청·재신청 (F-11). 로그인·동의·입력을 여기서 다시 확인한다
export async function applyInstructorAction(_prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const parsed = applyInput.safeParse({
    displayName: formData.get("displayName") ?? "",
    instagramHandle: formData.get("instagramHandle") ?? "",
    regionIds: formData.getAll("regionIds").map(Number),
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력을 확인해 주세요" };

  try {
    await ensureProfile(user.id, user.metadata);
    if (!(await hasConsented(user.id))) return { ok: false, error: "약관 동의가 필요해요. 마이에서 다시 로그인해 주세요" };
    await applyInstructor(user.id, parsed.data);
  } catch (e) {
    if (e instanceof InstructorError) return { ok: false, error: e.message };
    console.error("[applyInstructorAction]", e);
    return { ok: false, error: "신청하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  refresh();
  return { ok: true };
}

// 인스타 DM으로 받은 코드 확인 (F-11 2단계). 본인 프로필만
export async function verifyInstructorCodeAction(_prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  const code = verifyCodeInput.safeParse(String(formData.get("code") ?? ""));
  if (!code.success) return { ok: false, error: code.error.issues[0]?.message ?? "코드를 확인해 주세요" };
  try {
    await verifyInstructorCode(user.id, code.data);
  } catch (e) {
    if (e instanceof InstructorError) return { ok: false, error: e.message };
    console.error("[verifyInstructorCodeAction]", e);
    return { ok: false, error: "확인하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  refresh();
  return { ok: true };
}
