"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ensureProfile } from "@/server/profiles";
import { cancelRequest, RequestError, requestInput, saveRequest } from "@/server/requests";

// isNew: 첫 추가요(완료 순간을 보여줄지), position: 몇 번째로 기다리는지 (서버 계산)
export type RequestActionState = { ok: boolean; error?: string; isNew?: boolean; position?: number };

// 서버 액션은 화면 밖에서도 POST로 호출될 수 있다. 로그인·입력은 여기서 다시 검사한다
export async function saveRequestAction(
  songId: number,
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const region = formData.get("regionId");
  if (!region) return { ok: false, error: "희망 권역을 골라 주세요" };

  const parsed = requestInput.safeParse({
    regionId: region === "any" ? null : Number(region),
    timePref: formData.get("timePref") || undefined,
    message: formData.get("message") ?? null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력을 확인해 주세요" };

  let saved: Awaited<ReturnType<typeof saveRequest>>;
  try {
    await ensureProfile(user.id, user.metadata);
    saved = await saveRequest(user.id, songId, parsed.data);
  } catch (e) {
    if (e instanceof RequestError) return { ok: false, error: e.message };
    console.error("[saveRequestAction]", e);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }

  refresh();
  return { ok: true, isNew: saved.isNew, position: saved.position };
}

export async function cancelRequestAction(songId: number): Promise<RequestActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  try {
    await cancelRequest(user.id, songId);
  } catch (e) {
    console.error("[cancelRequestAction]", e);
    return { ok: false, error: "취소하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }

  refresh();
  return { ok: true };
}
