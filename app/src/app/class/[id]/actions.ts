"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasConsented } from "@/server/consent";
import { cancelEncore, EncoreError, encoreInput, saveEncore } from "@/server/encores";
import { ensureProfile } from "@/server/profiles";

// isNew: 첫 앵콜(응원봉을 흔들지), delivered: 이 앵콜로 기준에 닿아 강사님께 전달됐는지 (서버 계산)
// consentRequired: 약관 동의 전이라 저장하지 않았다. 화면이 동의 화면으로 보낸다 (specs/terms-consent FR-5)
export type EncoreActionState = { ok: boolean; error?: string; consentRequired?: boolean; isNew?: boolean; delivered?: boolean };

const validId = (id: number) => Number.isSafeInteger(id) && id > 0;

// 서버 액션은 화면 밖에서도 POST로 호출될 수 있다. 로그인·클래스 조건·입력은 여기와 src/server에서 다시 검사한다
export async function saveEncoreAction(classId: number, _prev: EncoreActionState, formData: FormData): Promise<EncoreActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  if (!validId(classId)) return { ok: false, error: "없는 클래스예요" };

  const parsed = encoreInput.safeParse({
    timePref: formData.get("timePref") || undefined,
    message: formData.get("message") ?? null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력을 확인해 주세요" };

  let saved: Awaited<ReturnType<typeof saveEncore>>;
  try {
    await ensureProfile(user.id, user.metadata);
    if (!(await hasConsented(user.id))) return { ok: false, consentRequired: true, error: "약관 동의가 필요해요" };
    saved = await saveEncore(user.id, classId, parsed.data);
  } catch (e) {
    if (e instanceof EncoreError) return { ok: false, error: e.message };
    console.error("[saveEncoreAction]", e);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }

  refresh();
  return { ok: true, isNew: saved.isNew, delivered: saved.delivered };
}

export async function cancelEncoreAction(classId: number): Promise<EncoreActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  if (!validId(classId)) return { ok: false, error: "없는 클래스예요" };

  try {
    await cancelEncore(user.id, classId);
  } catch (e) {
    console.error("[cancelEncoreAction]", e);
    return { ok: false, error: "취소하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }

  refresh();
  return { ok: true };
}
