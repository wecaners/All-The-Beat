"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ActionButton } from "../action-button";
import { type AdminActionState, confirmSongAction, mergeSongAction, searchSongsForClassAction, type SongOption } from "../actions";
import { buttonClass, inputClass, Result } from "../ui";

export function ConfirmSongButton({ songId }: { songId: number }) {
  return <ActionButton label="확인 (검수 끝)" run={() => confirmSongAction(songId)} />;
}

// 이 곡을 다른 곡으로 합치기 (F-16). 대상을 검색해 고르면 옮겨질 수를 보여주고 한 번 더 묻는다. 되돌리지 않는다
export function MergeSongForm({ songId, classCount, requestCount }: { songId: number; classCount: number; requestCount: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongOption[]>([]);
  const [target, setTarget] = useState<SongOption | null>(null);
  const [state, setState] = useState<AdminActionState | null>(null);
  const [busy, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onQuery(q: string) {
    setQuery(q);
    setTarget(null);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => start(async () => setResults((await searchSongsForClassAction(q)).filter((s) => s.id !== songId))), 250);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        이 곡의 클래스 <b>{classCount}개</b>, 추가요 <b>{requestCount}건</b>, 별칭이 대상 곡으로 옮겨지고 이 곡은 대상 곡으로 넘어가요. 같은 사람이 양쪽에 추가요했으면 대상 곡 것만 남아요. 되돌릴 수 없어요.
      </p>
      <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="합칠 대상 곡 검색 (곡명·아티스트)" className={inputClass} />
      {results.length > 0 && !target && (
        <ul className="space-y-1">
          {results.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setTarget(s)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50">
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {target && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <b>{target.label}</b>(으)로 합쳐요.
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`정말 "${target.label}"(으)로 합칠까요? 되돌릴 수 없어요.`)) return;
                start(async () => setState(await mergeSongAction(songId, target.id)));
              }}
              className={buttonClass}
            >
              {busy ? "합치는 중…" : "합치기"}
            </button>
            <button type="button" onClick={() => setTarget(null)} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm">
              다시 고르기
            </button>
          </div>
        </div>
      )}
      {state && <Result state={state} />}
    </div>
  );
}
