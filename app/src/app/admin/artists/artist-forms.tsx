"use client";

import { useActionState, useState, useTransition } from "react";
import type { AdminArtistRow } from "@/server/admin/songs";
import { type AdminActionState, mergeArtistAction, renameArtistAction } from "../actions";
import { buttonClass, inputClass, Result } from "../ui";

export function RenameArtistForm({ artist }: { artist: AdminArtistRow }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(renameArtistAction, { ok: false });
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="artistId" value={artist.id} />
      <input name="name" defaultValue={artist.name} required maxLength={100} className={`${inputClass} !w-56`} />
      <button disabled={pending} className={`${buttonClass} !h-9`}>
        {pending ? "저장 중…" : "이름 저장"}
      </button>
      <Result state={state} />
    </form>
  );
}

// 아티스트 병합: 대상을 고르고 한 번 더 묻는다 (F-16)
export function MergeArtistForm({ artist, others }: { artist: AdminArtistRow; others: AdminArtistRow[] }) {
  const [intoId, setIntoId] = useState<string>("");
  const [state, setState] = useState<AdminActionState | null>(null);
  const [busy, start] = useTransition();
  const target = others.find((o) => String(o.id) === intoId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={intoId} onChange={(e) => setIntoId(e.target.value)} className={`${inputClass} !w-56`}>
        <option value="">합칠 대상 아티스트…</option>
        {others.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} (곡 {o.songCount})
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || !target}
        onClick={() => {
          if (!target || !window.confirm(`"${artist.name}"을(를) "${target.name}"(으)로 합칠까요? 곡 ${artist.songCount}개와 별칭이 옮겨지고 되돌릴 수 없어요.`)) return;
          start(async () => setState(await mergeArtistAction(artist.id, target.id)));
        }}
        className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-bold text-red-700 disabled:opacity-50"
      >
        {busy ? "합치는 중…" : "합치기"}
      </button>
      {state && <Result state={state} />}
    </div>
  );
}
