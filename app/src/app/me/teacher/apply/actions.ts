"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasConsented } from "@/server/consent";
import {
  applyInput,
  applyInstructor,
  cancelMyClaim,
  ClaimOffer,
  claimHandleInput,
  InstructorError,
  requestClaim,
  verifyClaimCode,
  verifyCodeInput,
  verifyInstructorCode,
} from "@/server/instructors";
import { ensureProfile } from "@/server/profiles";

// claim: 신청한 핸들이 가져올 수 있는 대리 강사면 그 정보 (F-19)
export type InstructorActionState = { ok: boolean; error?: string; claim?: ClaimOffer["offer"] };

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
    if (e instanceof ClaimOffer) return { ok: false, claim: e.offer };
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

// ── 대리 강사 가져오기 (F-19, specs/instructor-claim). 모두 로그인한 본인 것만 ──

export async function requestClaimAction(_prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  const handle = claimHandleInput.safeParse(String(formData.get("instagramHandle") ?? ""));
  if (!handle.success) return { ok: false, error: handle.error.issues[0]?.message ?? "인스타그램 아이디를 확인해 주세요" };
  try {
    await ensureProfile(user.id, user.metadata);
    if (!(await hasConsented(user.id))) return { ok: false, error: "약관 동의가 필요해요. 마이에서 다시 로그인해 주세요" };
    await requestClaim(user.id, handle.data);
  } catch (e) {
    if (e instanceof InstructorError) return { ok: false, error: e.message };
    console.error("[requestClaimAction]", e);
    return { ok: false, error: "신청하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  refresh();
  return { ok: true };
}

export async function verifyClaimCodeAction(_prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  const code = verifyCodeInput.safeParse(String(formData.get("code") ?? ""));
  if (!code.success) return { ok: false, error: code.error.issues[0]?.message ?? "코드를 확인해 주세요" };
  try {
    await verifyClaimCode(user.id, code.data);
  } catch (e) {
    if (e instanceof InstructorError) return { ok: false, error: e.message };
    console.error("[verifyClaimCodeAction]", e);
    return { ok: false, error: "확인하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  refresh();
  return { ok: true };
}

export async function cancelClaimAction(): Promise<InstructorActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  try {
    await cancelMyClaim(user.id);
  } catch (e) {
    if (e instanceof InstructorError) return { ok: false, error: e.message };
    console.error("[cancelClaimAction]", e);
    return { ok: false, error: "취소하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  refresh();
  return { ok: true };
}
