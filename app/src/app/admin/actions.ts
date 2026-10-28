"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { classInput, createClassByAdmin } from "@/server/admin/classes";
import { consentInput, createProxyInstructor, instructorInput, recordConsent } from "@/server/admin/instructors";
import { AdminInputError } from "@/server/admin/shared";
import {
  addStudioPhoto,
  deleteStudioPhoto,
  profileInput,
  removeInstructorPhoto,
  saveInstructorProfile,
  saveStudio,
  setInstructorPhoto,
  setStudioArchived,
  studioCandidateInput,
  studioUpdateInput,
  updateStudio,
} from "@/server/admin/studios";
import { kakaoConfigured, searchKakaoAddresses, searchKakaoPlaces, type StudioCandidate } from "@/server/kakao";
import { MEDIA_BUCKET, type MediaStore } from "@/server/media";
import { searchSongs } from "@/server/songs/search";
import { createClient } from "@/lib/supabase/server";
import { clearSongVideo, findOrCreateSong, quickSongInput, saveSong, setSongVideo, songInput, videoInput } from "@/server/admin/songs";

export type AdminActionState = { ok: boolean; error?: string; message?: string };

// 모든 운영 액션은 첫 줄에서 운영자를 다시 확인한다. 화면 밖에서 POST로 불러도 막힌다 (FR-1)

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function numberOrNull(fd: FormData, key: string): number | null {
  const v = text(fd, key).trim();
  return v === "" ? null : Number(v);
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new AdminInputError(result.error.issues[0]?.message ?? "입력을 확인해 주세요");
  return result.data;
}

function toState(e: unknown, where: string): AdminActionState {
  if (e instanceof AdminInputError) return { ok: false, error: e.message };
  console.error(`[admin/${where}]`, e);
  return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요" };
}

export async function saveSongAction(_prev: AdminActionState, fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  let saved: Awaited<ReturnType<typeof saveSong>>;
  try {
    const input = parse(songInput, {
      id: numberOrNull(fd, "id"),
      title: text(fd, "title"),
      artistName: text(fd, "artistName"),
      artistAliases: text(fd, "artistAliases"),
      songAliases: text(fd, "songAliases"),
      slug: text(fd, "slug"),
      releaseDate: text(fd, "releaseDate"),
    });
    saved = await saveSong(input);
  } catch (e) {
    return toState(e, "saveSong");
  }

  // 곡 상세는 slug 단위로 캐시한다. 주소가 바뀌었으면 옛 주소도 갱신한다 (FR-6)
  updateTag(`song:${saved.slug}`);
  if (saved.previousSlug && saved.previousSlug !== saved.slug) updateTag(`song:${saved.previousSlug}`);

  if (!saved.previousSlug) redirect(`/admin/songs/${saved.id}`);
  refresh();
  return { ok: true, message: "저장했어요" };
}

export async function setVideoAction(_prev: AdminActionState, fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  try {
    const input = parse(videoInput, { songId: Number(text(fd, "songId")), url: text(fd, "url"), type: text(fd, "type") || undefined });
    const result = await setSongVideo(input);
    updateTag(`song:${result.slug}`);
    refresh();
    return { ok: true, message: `영상을 지정했어요: ${result.title} · ${result.channel}` };
  } catch (e) {
    return toState(e, "setVideo");
  }
}

export async function clearVideoAction(songId: number): Promise<AdminActionState> {
  await requireAdmin();
  try {
    const result = await clearSongVideo(songId);
    if (result) updateTag(`song:${result.slug}`);
    refresh();
    return { ok: true, message: "영상을 뺐어요" };
  } catch (e) {
    return toState(e, "clearVideo");
  }
}

export async function createInstructorAction(_prev: AdminActionState, fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  let id: number;
  try {
    const input = parse(instructorInput, {
      displayName: text(fd, "displayName"),
      instagramHandle: text(fd, "instagramHandle"),
      regionIds: fd.getAll("regionIds").map(Number),
    });
    id = await createProxyInstructor(input);
  } catch (e) {
    return toState(e, "createInstructor");
  }
  redirect(`/admin/instructors/${id}`);
}

export async function recordConsentAction(_prev: AdminActionState, fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  try {
    const input = parse(consentInput, {
      instructorId: Number(text(fd, "instructorId")),
      consentDate: text(fd, "consentDate"),
      consentNote: text(fd, "consentNote"),
    });
    const result = await recordConsent(input);
    refresh();
    return {
      ok: true,
      message: `동의를 기록했어요. 공개된 클래스 ${result.publishedClasses}개, "열렸어요"가 된 추가요 ${result.openedRequests}건`,
    };
  } catch (e) {
    return toState(e, "recordConsent");
  }
}

export async function createClassAction(_prev: AdminActionState, fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  let result: Awaited<ReturnType<typeof createClassByAdmin>>;
  try {
    const input = parse(classInput, {
      instructorId: Number(text(fd, "instructorId")),
      songIds: fd
        .getAll("songIds")
        .map((v) => String(v))
        .filter(Boolean)
        .map(Number),
      title: text(fd, "title"),
      date: text(fd, "date"),
      startTime: text(fd, "startTime"),
      endTime: text(fd, "endTime"),
      placeId: numberOrNull(fd, "placeId"),
      studioName: text(fd, "studioName"),
      address: text(fd, "address"),
      regionId: numberOrNull(fd, "regionId"),
      price: numberOrNull(fd, "price") ?? Number.NaN,
      level: text(fd, "level") || undefined,
      capacity: numberOrNull(fd, "capacity"),
      bookingUrl: text(fd, "bookingUrl"),
      bookingType: text(fd, "bookingType") || null,
      description: text(fd, "description"),
    });
    result = await createClassByAdmin(input);
  } catch (e) {
    return toState(e, "createClass");
  }

  refresh();
  return {
    ok: true,
    message: result.isPublic
      ? `클래스를 등록했어요 (#${result.id}). 바로 공개됐고, "열렸어요"가 된 추가요는 ${result.openedRequests}건이에요`
      : `클래스를 등록했어요 (#${result.id}). 강사의 게재 동의 기록이 없어 아직 수강생에게 보이지 않아요`,
  };
}

// ── 스튜디오·강사 사진 (specs/instructor-studio) ─────────────────────────

// 운영자 로그인 세션이 붙은 저장소. 버킷 정책이 운영자만 쓰게 막는다 (마이그레이션 0006)
async function mediaStore(): Promise<MediaStore> {
  const bucket = (await createClient()).storage.from(MEDIA_BUCKET);
  return {
    async upload(path, file, contentType) {
      const { error } = await bucket.upload(path, file, { contentType, upsert: false, cacheControl: "31536000" });
      if (error) throw error;
    },
    async remove(paths) {
      const { error } = await bucket.remove(paths);
      if (error) throw error;
    },
  };
}

export type StudioSearchState = { ok: boolean; error?: string; candidates?: StudioCandidate[] };

export async function searchStudiosAction(mode: "place" | "address", query: string): Promise<StudioSearchState> {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return { ok: false, error: "두 글자 이상 넣어 주세요" };
  if (!kakaoConfigured()) return { ok: false, error: "카카오 키(KAKAO_REST_API_KEY)가 없어 검색할 수 없어요" };
  try {
    const candidates = mode === "place" ? await searchKakaoPlaces(q) : await searchKakaoAddresses(q);
    return { ok: true, candidates };
  } catch (e) {
    console.error("[admin/searchStudios]", e);
    return { ok: false, error: "카카오 검색에 실패했어요. 잠시 후 다시 시도해 주세요" };
  }
}

export async function saveStudioAction(instructorId: number, candidate: StudioCandidate): Promise<AdminActionState & { id?: number }> {
  await requireAdmin();
  try {
    const input = parse(studioCandidateInput, { instructorId, ...candidate });
    const saved = await saveStudio(input);
    refresh();
    return { ok: true, id: saved.id, message: saved.existed ? "이미 있는 스튜디오예요. 그대로 쓸게요" : "스튜디오를 저장했어요" };
  } catch (e) {
    return toState(e, "saveStudio");
  }
}

export async function updateStudioAction(_prev: AdminActionState, fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  try {
    const input = parse(studioUpdateInput, {
      placeId: Number(text(fd, "placeId")),
      studioName: text(fd, "studioName"),
      regionId: Number(text(fd, "regionId")),
      facilities: fd.getAll("facilities").map(String),
    });
    await updateStudio(input);
    refresh();
    return { ok: true, message: "저장했어요" };
  } catch (e) {
    return toState(e, "updateStudio");
  }
}

export async function setStudioArchivedAction(placeId: number, archived: boolean): Promise<AdminActionState> {
  await requireAdmin();
  try {
    await setStudioArchived(placeId, archived);
    refresh();
    return { ok: true };
  } catch (e) {
    return toState(e, "setStudioArchived");
  }
}

// 브라우저가 화면용(full)·목록용(thumb) 두 크기로 줄여 보낸다
export async function addStudioPhotoAction(fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  try {
    await addStudioPhoto(await mediaStore(), Number(text(fd, "placeId")), fd.get("full"), fd.get("thumb"));
    refresh();
    return { ok: true };
  } catch (e) {
    return toState(e, "addStudioPhoto");
  }
}

export async function deleteStudioPhotoAction(photoId: number): Promise<AdminActionState> {
  await requireAdmin();
  try {
    await deleteStudioPhoto(await mediaStore(), photoId);
    refresh();
    return { ok: true };
  } catch (e) {
    return toState(e, "deleteStudioPhoto");
  }
}

export async function saveInstructorProfileAction(_prev: AdminActionState, fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  try {
    const input = parse(profileInput, {
      instructorId: Number(text(fd, "instructorId")),
      bio: text(fd, "bio"),
      portfolioUrls: fd.getAll("portfolioUrls").map(String).filter((v) => v.trim()),
      mediaConsent: fd.get("mediaConsent") === "on",
    });
    await saveInstructorProfile(input);
    refresh();
    return { ok: true, message: "강사 소개를 저장했어요" };
  } catch (e) {
    return toState(e, "saveInstructorProfile");
  }
}

export async function setInstructorPhotoAction(fd: FormData): Promise<AdminActionState> {
  await requireAdmin();
  try {
    await setInstructorPhoto(await mediaStore(), Number(text(fd, "instructorId")), fd.get("full"), fd.get("thumb"));
    refresh();
    return { ok: true };
  } catch (e) {
    return toState(e, "setInstructorPhoto");
  }
}

export async function removeInstructorPhotoAction(instructorId: number): Promise<AdminActionState> {
  await requireAdmin();
  try {
    await removeInstructorPhoto(await mediaStore(), instructorId);
    refresh();
    return { ok: true };
  } catch (e) {
    return toState(e, "removeInstructorPhoto");
  }
}

// ── 클래스 등록 곡 고르기 (specs/search FR-8) ─────────────────────────

export type SongOption = { id: number; label: string };

// 수강생 검색과 같은 곡 검색. 운영자만 (FR-9)
export async function searchSongsForClassAction(query: string): Promise<SongOption[]> {
  await requireAdmin();
  const results = await searchSongs(query, 8);
  return results.map((s) => ({ id: s.id, label: `${s.title} - ${s.artistName}` }));
}

export type QuickSongState = { ok: boolean; error?: string; song?: SongOption; existed?: boolean };

// 곡 고르기에서 찾는 곡이 없을 때 그 자리에서 만든다 (F-13). 같은 곡이 이미 있으면 그 곡을 고른다
export async function createSongForClassAction(title: string, artistName: string): Promise<QuickSongState> {
  await requireAdmin();
  try {
    const input = parse(quickSongInput, { title, artistName });
    const song = await findOrCreateSong(input);
    return { ok: true, existed: song.existed, song: { id: song.id, label: `${song.title} - ${song.artistName}` } };
  } catch (e) {
    const state = toState(e, "createSongForClass");
    return { ok: false, error: state.error };
  }
}

