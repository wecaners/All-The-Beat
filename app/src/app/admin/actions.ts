"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { classInput, createClassByAdmin } from "@/server/admin/classes";
import { consentInput, createProxyInstructor, instructorInput, recordConsent } from "@/server/admin/instructors";
import { AdminInputError } from "@/server/admin/shared";
import { clearSongVideo, saveSong, setSongVideo, songInput, videoInput } from "@/server/admin/songs";

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
