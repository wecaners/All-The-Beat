"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { hasConsented } from "@/server/consent";
import { ensureProfile } from "@/server/profiles";
import { registerSong, SongRegisterError } from "@/server/songs/register";
import { searchArtists } from "@/server/songs/search";

// consentRequired: 약관 동의 전이라 만들지 않았다. 화면이 동의 화면으로 보낸다 (specs/terms-consent)
export type RegisterSongState = { ok: boolean; error?: string; consentRequired?: boolean; slug?: string; existed?: boolean };

// 신규 곡 만들기 (F-13). 로그인·동의를 여기서 다시 확인한다. 만든 뒤 화면이 곡 상세의 추가요 시트로 보낸다
export async function registerSongAction(_prev: RegisterSongState, formData: FormData): Promise<RegisterSongState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  try {
    await ensureProfile(user.id, user.metadata);
    if (!(await hasConsented(user.id))) return { ok: false, consentRequired: true, error: "약관 동의가 필요해요" };
    const song = await registerSong(user.id, { title: String(formData.get("title") ?? ""), artistName: String(formData.get("artistName") ?? "") });
    return { ok: true, slug: song.slug, existed: song.existed };
  } catch (e) {
    if (e instanceof SongRegisterError) return { ok: false, error: e.message };
    console.error("[registerSongAction]", e);
    return { ok: false, error: "곡을 만들지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
}

// 아티스트 칸의 제안. 읽기만이라 로그인은 필요 없다
export async function searchArtistsAction(query: string): Promise<string[]> {
  return searchArtists(query.slice(0, 50));
}
