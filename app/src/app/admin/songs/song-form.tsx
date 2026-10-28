"use client";

import { useActionState } from "react";
import type { AdminSongDetail } from "@/server/admin/songs";
import { type AdminActionState, saveSongAction } from "../actions";
import { buttonClass, Field, inputClass, Result } from "../ui";

export function SongForm({ song }: { song?: AdminSongDetail }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(saveSongAction, { ok: false });

  return (
    <form action={action} className="mt-4 space-y-4">
      {song && <input type="hidden" name="id" value={song.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="곡명 *">
          <input name="title" required defaultValue={song?.title} placeholder="NEON" className={inputClass} />
        </Field>
        <Field label="아티스트 *" hint="같은 이름·다른 이름이 있으면 그 아티스트로 묶여요">
          <input name="artistName" required defaultValue={song?.artistName} placeholder="A2O LITE" className={inputClass} />
        </Field>
      </div>
      <Field label="곡 다른 이름" hint="검색용. 쉼표로 구분">
        <input name="songAliases" defaultValue={song?.songAliases.join(", ")} placeholder="네온" className={inputClass} />
      </Field>
      <Field label="아티스트 다른 이름" hint="검색용. 쉼표로 구분. 있는 이름은 그대로 두고 새 이름만 더해요">
        <input name="artistAliases" defaultValue={song?.artistAliases.join(", ")} placeholder="에이투오 라이트, 에이투오" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="주소(slug)" hint="비우면 아티스트-곡명으로 만들어요">
          <input name="slug" defaultValue={song?.slug} placeholder="a2o-lite-neon" className={inputClass} />
        </Field>
        <Field label="발매일">
          <input type="date" name="releaseDate" defaultValue={song?.releaseDate ?? ""} className={inputClass} />
        </Field>
      </div>
      <Result state={state} />
      <button disabled={pending} className={buttonClass}>
        {pending ? "저장 중…" : song ? "곡 정보 저장" : "곡 등록"}
      </button>
    </form>
  );
}
