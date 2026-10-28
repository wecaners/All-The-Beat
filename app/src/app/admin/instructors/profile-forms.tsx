"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import type { AdminInstructorMedia } from "@/server/admin/studios";
import { type AdminActionState, removeInstructorPhotoAction, saveInstructorProfileAction, setInstructorPhotoAction } from "../actions";
import { buttonClass, Field, inputClass, linkButtonClass, Result } from "../ui";
import { photoFormData } from "./image-upload";

// 강사 사진·소개·포트폴리오 (specs/instructor-studio). 대리 등록 강사는 사진·영상 게재 동의가 있어야 수강생에게 보인다
export function InstructorMediaForm({ instructorId, isProxy, media }: { instructorId: number; isProxy: boolean; media: AdminInstructorMedia }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(saveInstructorProfileAction, { ok: false });
  const [photoState, setPhotoState] = useState<AdminActionState>({ ok: false });
  const [busy, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const youtube = (id: string | undefined) => (id ? `https://youtu.be/${id}` : "");

  function upload(file: File | undefined) {
    if (!file) return;
    start(async () => {
      try {
        setPhotoState(await setInstructorPhotoAction(await photoFormData(file, { instructorId })));
      } catch (e) {
        setPhotoState({ ok: false, error: e instanceof Error ? e.message : "사진을 올리지 못했어요" });
      }
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {media.photoThumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage 공개 주소
          <img src={media.photoThumbUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-zinc-100 text-xs text-zinc-400">사진 없음</div>
        )}
        <label className={`${linkButtonClass} cursor-pointer`}>
          {busy ? "올리는 중…" : media.photoThumbUrl ? "사진 바꾸기" : "사진 올리기"}
          <input ref={fileInput} type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {media.photoThumbUrl && (
          <button type="button" disabled={busy} onClick={() => start(async () => setPhotoState(await removeInstructorPhotoAction(instructorId)))} className={linkButtonClass}>
            사진 지우기
          </button>
        )}
      </div>
      <Result state={photoState} />

      <form action={action} className="space-y-3">
        <input type="hidden" name="instructorId" value={instructorId} />
        <Field label="한 줄 소개" hint="50자까지">
          <input name="bio" defaultValue={media.bio ?? ""} maxLength={50} placeholder="K-pop 안무 8년차, 입문자도 완곡까지" className={inputClass} />
        </Field>
        <Field label="포트폴리오 영상" hint="YouTube 링크 2개까지, 퍼가기 허용 영상만">
          <div className="space-y-2">
            <input name="portfolioUrls" defaultValue={youtube(media.portfolioVideoIds[0])} placeholder="https://youtu.be/…" className={inputClass} />
            <input name="portfolioUrls" defaultValue={youtube(media.portfolioVideoIds[1])} placeholder="https://youtu.be/…" className={inputClass} />
          </div>
        </Field>
        {isProxy && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="mediaConsent" defaultChecked={media.mediaConsent} className="mt-0.5" />
            <span>
              강사가 사진·영상·소개와 연습실 사진 게재에 동의했어요
              <span className="block text-xs text-zinc-500">끄면 넣어 둔 사진·영상·소개가 수강생에게 보이지 않아요</span>
            </span>
          </label>
        )}
        <Result state={state} />
        <button disabled={pending} className={buttonClass}>
          {pending ? "저장 중…" : "저장"}
        </button>
      </form>
    </div>
  );
}
