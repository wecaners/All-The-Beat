"use client";

import { useActionState, useTransition } from "react";
import { VIDEO_TYPE_LABEL } from "@/lib/format";
import { type AdminActionState, clearVideoAction, setVideoAction } from "../actions";
import { buttonClass, Field, inputClass, Result } from "../ui";

type Video = { id: string; type: string | null; title: string | null; channel: string | null } | null;

export function VideoForm({ songId, video }: { songId: number; video: Video }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(setVideoAction, { ok: false });
  const [clearing, startClear] = useTransition();

  return (
    <div className="space-y-4">
      {video ? (
        <div className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p className="font-semibold">{video.title}</p>
          <p className="text-zinc-500">
            {video.channel} · {video.type ? VIDEO_TYPE_LABEL[video.type as keyof typeof VIDEO_TYPE_LABEL] : "종류 없음"} ·{" "}
            <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="underline">
              YouTube
            </a>
          </p>
          <button
            type="button"
            disabled={clearing}
            onClick={() => startClear(async () => void (await clearVideoAction(songId)))}
            className="mt-2 text-xs text-red-600 underline disabled:opacity-50"
          >
            영상 빼기
          </button>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">아직 대표 영상이 없어요. 곡 상세에는 그라데이션이 보여요.</p>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="songId" value={songId} />
        <Field label="YouTube 링크" hint="공식 채널 안무 연습 > 퍼포먼스 > MV 순으로 골라요">
          <input name="url" required placeholder="https://youtu.be/..." className={inputClass} />
        </Field>
        <fieldset className="flex flex-wrap gap-3 text-sm">
          {Object.entries(VIDEO_TYPE_LABEL).map(([value, label]) => (
            <label key={value} className="flex items-center gap-1">
              <input type="radio" name="type" value={value} defaultChecked={value === "dance_practice"} /> {label}
            </label>
          ))}
        </fieldset>
        <Result state={state} />
        <button disabled={pending} className={buttonClass}>
          {pending ? "확인 중…" : video ? "영상 바꾸기" : "영상 지정"}
        </button>
      </form>
    </div>
  );
}
