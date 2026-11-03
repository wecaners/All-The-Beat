"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { saveStudio, studioCandidateInput } from "@/server/admin/studios";
import { cancelMyClass, cancelReason, createMyClass, getApprovedInstructorId, MyClassError, respondToMyEncore, setMyClassStatus, statusChange, updateMyClass } from "@/server/instructors/classes";
import { kakaoConfigured, searchKakaoAddresses, searchKakaoPlaces, type StudioCandidate } from "@/server/kakao";
import { registerSong, SongRegisterError } from "@/server/songs/register";
import { searchSongs } from "@/server/songs/search";
import { AdminInputError } from "@/server/admin/shared";

export type MyClassActionState = { ok: boolean; error?: string; classId?: number };

// 모든 액션은 승인된 강사인지 다시 확인한다 (FR-12)
async function myInstructorId(): Promise<number | null> {
  const user = await getCurrentUser();
  return user ? getApprovedInstructorId(user.id) : null;
}

function fail(e: unknown, where: string): MyClassActionState {
  if (e instanceof MyClassError || e instanceof AdminInputError) return { ok: false, error: e.message };
  console.error(`[me/classes/${where}]`, e);
  return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요" };
}

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numberOrNull = (fd: FormData, k: string) => {
  const v = text(fd, k);
  return v ? Number(v) : null;
};

// 폼 → 등록 입력. 검증은 서버 스키마가 한다
function readForm(fd: FormData) {
  return {
    songIds: fd.getAll("songIds").map(Number),
    title: text(fd, "title"),
    date: text(fd, "date"),
    startTime: text(fd, "startTime"),
    endTime: text(fd, "endTime"),
    placeId: numberOrNull(fd, "placeId"),
    studioName: text(fd, "studioName"),
    address: text(fd, "address"),
    regionId: numberOrNull(fd, "regionId"),
    price: Number(text(fd, "price")),
    level: text(fd, "level"),
    capacity: numberOrNull(fd, "capacity"),
    bookingUrl: text(fd, "bookingUrl"),
    bookingType: null,
    description: text(fd, "description"),
    teaserUrl: text(fd, "teaserUrl"),
    encoreOfClassId: numberOrNull(fd, "encoreOfClassId"),
  };
}

export async function createMyClassAction(_prev: MyClassActionState, fd: FormData): Promise<MyClassActionState> {
  const instructorId = await myInstructorId();
  if (!instructorId) return { ok: false, error: "승인된 강사만 클래스를 올릴 수 있어요" };
  try {
    const result = await createMyClass(instructorId, readForm(fd));
    refresh();
    return { ok: true, classId: result.id };
  } catch (e) {
    return fail(e, "create");
  }
}

export async function updateMyClassAction(classId: number, _prev: MyClassActionState, fd: FormData): Promise<MyClassActionState> {
  const instructorId = await myInstructorId();
  if (!instructorId) return { ok: false, error: "승인된 강사만 고칠 수 있어요" };
  try {
    const result = await updateMyClass(instructorId, classId, readForm(fd));
    refresh();
    return { ok: true, classId: result.id };
  } catch (e) {
    return fail(e, "update");
  }
}

export async function setMyClassStatusAction(classId: number, to: string): Promise<MyClassActionState> {
  const instructorId = await myInstructorId();
  if (!instructorId) return { ok: false, error: "승인된 강사만 바꿀 수 있어요" };
  const parsed = statusChange.safeParse(to);
  if (!parsed.success) return { ok: false, error: "알 수 없는 상태예요" };
  try {
    await setMyClassStatus(instructorId, classId, parsed.data);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "status");
  }
}

export async function cancelMyClassAction(classId: number, reason: string): Promise<MyClassActionState> {
  const instructorId = await myInstructorId();
  if (!instructorId) return { ok: false, error: "승인된 강사만 취소할 수 있어요" };
  const parsed = cancelReason.safeParse(reason);
  if (!parsed.success) return { ok: false, error: "취소 사유를 골라 주세요" };
  try {
    await cancelMyClass(instructorId, classId, parsed.data);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "cancel");
  }
}

export async function respondToMyEncoreAction(classId: number, answer: "review" | "decline"): Promise<MyClassActionState> {
  const instructorId = await myInstructorId();
  if (!instructorId) return { ok: false, error: "승인된 강사만 답할 수 있어요" };
  try {
    await respondToMyEncore(instructorId, classId, answer === "review" ? "review" : "decline");
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "encore");
  }
}

// ── 곡·장소 고르기 (읽기·저장) ─────────────────────────────────────────

export type SongOption = { id: number; label: string };

export async function searchSongsForMyClassAction(query: string): Promise<SongOption[]> {
  if (!(await getCurrentUser())) return [];
  const results = await searchSongs(query, 8);
  return results.map((s) => ({ id: s.id, label: `${s.title} - ${s.artistName}` }));
}

export async function createSongForMyClassAction(title: string, artistName: string): Promise<{ ok: boolean; error?: string; song?: SongOption }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  try {
    const song = await registerSong(user.id, { title, artistName });
    const [found] = await searchSongs(song.title, 1);
    return { ok: true, song: { id: found?.id ?? 0, label: `${song.title}${found ? ` - ${found.artistName}` : ""}` } };
  } catch (e) {
    if (e instanceof SongRegisterError) return { ok: false, error: e.message };
    console.error("[me/classes/createSong]", e);
    return { ok: false, error: "곡을 만들지 못했어요" };
  }
}

export type StudioSearchResult = { ok: boolean; error?: string; candidates?: StudioCandidate[] };

export async function searchMyStudiosAction(mode: "place" | "address", query: string): Promise<StudioSearchResult> {
  if (!(await myInstructorId())) return { ok: false, error: "승인된 강사만 찾을 수 있어요" };
  const q = query.trim();
  if (q.length < 2) return { ok: false, error: "두 글자 이상 넣어 주세요" };
  if (!kakaoConfigured()) return { ok: false, error: "지금은 장소 검색을 쓸 수 없어요. 스튜디오 이름과 주소를 직접 써 주세요" };
  try {
    return { ok: true, candidates: mode === "place" ? await searchKakaoPlaces(q) : await searchKakaoAddresses(q) };
  } catch (e) {
    console.error("[me/classes/searchStudios]", e);
    return { ok: false, error: "장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요" };
  }
}

export async function saveMyStudioAction(candidate: StudioCandidate): Promise<MyClassActionState & { placeId?: number; regionId?: number }> {
  const instructorId = await myInstructorId();
  if (!instructorId) return { ok: false, error: "승인된 강사만 저장할 수 있어요" };
  const parsed = studioCandidateInput.safeParse({ instructorId, ...candidate });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "장소를 확인해 주세요" };
  try {
    const saved = await saveStudio(parsed.data);
    const { listMyPlaces } = await import("@/server/instructors/classes");
    const place = (await listMyPlaces(instructorId)).find((p) => p.id === saved.id);
    refresh();
    return { ok: true, placeId: saved.id, regionId: place?.regionId };
  } catch (e) {
    return fail(e, "saveStudio");
  }
}
