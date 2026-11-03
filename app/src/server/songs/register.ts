import { findOrCreateSong, quickSongInput } from "@/server/admin/songs";
import { AdminInputError } from "@/server/admin/shared";

// 수강생 신규 곡 등록 (F-13, specs/song-register). 운영자 곡 고르기와 같은 중복 규칙으로 만들고,
// 검수 대기 + 만든 사람을 남긴다. 같은 곡이 있으면 만들지 않고 그 곡을 돌려준다

export { quickSongInput as registerSongInput };

export class SongRegisterError extends Error {}

export async function registerSong(userId: string, input: { title: string; artistName: string }): Promise<{ slug: string; title: string; existed: boolean }> {
  const parsed = quickSongInput.safeParse(input);
  if (!parsed.success) throw new SongRegisterError(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요");
  try {
    const song = await findOrCreateSong(parsed.data, { reviewStatus: "pending", createdBy: userId });
    return { slug: song.slug, title: song.title, existed: song.existed };
  } catch (e) {
    if (e instanceof AdminInputError) throw new SongRegisterError(e.message);
    throw e;
  }
}
