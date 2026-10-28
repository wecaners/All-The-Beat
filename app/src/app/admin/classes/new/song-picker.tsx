"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createSongForClassAction, searchSongsForClassAction, type SongOption } from "../../actions";
import { inputClass, linkButtonClass } from "../../ui";

const MAX_SONGS = 3;

// 배우는 곡 고르기 (specs/search FR-8). 수강생 검색과 같은 검색으로 찾는다.
// 기본은 한 곡, 메들리 같은 클래스만 "다른 곡도 배워요"로 최대 세 곡. 첫 곡이 대표. 고른 곡은 숨은 값 songIds로 보낸다.
// 찾는 곡이 없으면 그 자리에서 새 곡을 만든다 (F-13)
export function SongPicker() {
  const [picked, setPicked] = useState<SongOption[]>([]);
  const [searching, setSearching] = useState(true);

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">배우는 곡 *</legend>
      {picked.map((s) => (
        <input key={s.id} type="hidden" name="songIds" value={s.id} />
      ))}
      {picked.length > 0 && (
        <ol className="space-y-1.5">
          {picked.map((s, i) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
              <span>
                <span className="mr-2 text-xs font-bold text-zinc-500">{i === 0 ? "대표" : `${i + 1}곡`}</span>
                {s.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  const rest = picked.filter((p) => p.id !== s.id);
                  setPicked(rest);
                  if (rest.length === 0) setSearching(true);
                }}
                className={linkButtonClass}
              >
                빼기
              </button>
            </li>
          ))}
        </ol>
      )}
      {searching && picked.length < MAX_SONGS ? (
        <SongSearch
          exclude={picked.map((p) => p.id)}
          onPick={(s) => {
            setPicked([...picked, s]);
            setSearching(false);
          }}
        />
      ) : (
        picked.length > 0 &&
        picked.length < MAX_SONGS && (
          <button type="button" onClick={() => setSearching(true)} className={linkButtonClass}>
            + 다른 곡도 배워요 (최대 {MAX_SONGS}곡)
          </button>
        )
      )}
    </fieldset>
  );
}

function SongSearch({ exclude, onPick }: { exclude: number[]; onPick: (s: SongOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongOption[] | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function search(q: string) {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    start(async () => setResults(await searchSongsForClassAction(q)));
  }

  const shown = results?.filter((r) => !exclude.includes(r.id)) ?? null;

  return (
    <div className="space-y-2">
      <input
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          const q = e.target.value;
          timer.current = setTimeout(() => search(q), 250);
        }}
        onKeyDown={(e) => {
          // 클래스 등록 폼이 엔터로 제출되지 않게
          if (e.key === "Enter") {
            e.preventDefault();
            search(query);
          }
        }}
        placeholder="곡 이름이나 아티스트 (예: neon, 네온, 에이투오)"
        className={inputClass}
      />
      {pending && <p className="text-xs text-zinc-500">찾는 중…</p>}
      {shown && shown.length > 0 && (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm">
          {shown.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>{s.label}</span>
              <button type="button" onClick={() => onPick(s)} className={linkButtonClass}>
                고르기
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown && !pending && (
        <NewSong key={query} defaultTitle={query.trim()} noResults={shown.length === 0} onCreated={onPick} />
      )}
    </div>
  );
}

// 찾는 곡이 없으면 그 자리에서 곡명·아티스트만으로 만든다 (F-13). 별칭·영상은 곡 화면에서 나중에 채운다
function NewSong({ defaultTitle, noResults, onCreated }: { defaultTitle: string; noResults: boolean; onCreated: (s: SongOption) => void }) {
  const [open, setOpen] = useState(noResults);
  const [title, setTitle] = useState(defaultTitle);
  const [artist, setArtist] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-zinc-600 underline">
        찾는 곡이 없나요? 새 곡으로 추가
      </button>
    );
  }

  function create() {
    start(async () => {
      const r = await createSongForClassAction(title, artist);
      if (r.ok && r.song) onCreated(r.song);
      else setError(r.error ?? "곡을 만들지 못했어요");
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-zinc-300 p-3">
      <p className="text-sm font-semibold">{noResults ? "찾는 곡이 없어요. 새 곡으로 추가할까요?" : "새 곡으로 추가"}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="곡명 (예: NEON)" className={inputClass} />
        <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={100} placeholder="아티스트 (예: A2O LITE, 에이투오)" className={inputClass} />
      </div>
      <p className="text-xs text-zinc-500">아티스트는 다른 이름으로 써도 기존 아티스트로 묶여요. 같은 곡이 이미 있으면 그 곡을 골라요. 별칭·영상은 곡 화면에서 나중에 넣어요.</p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={pending || !title.trim() || !artist.trim()}
        onClick={create}
        className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "추가하는 중…" : "추가하고 고르기"}
      </button>
    </div>
  );
}
