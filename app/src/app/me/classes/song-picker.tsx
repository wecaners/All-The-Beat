"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { StickerButton } from "@/components/sticker-button";
import { createSongForMyClassAction, searchSongsForMyClassAction, type SongOption } from "./actions";

const MAX_SONGS = 3;
const inputClass = "w-full rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-[16px] font-bold outline-none focus:shadow-sticker-pink";

// 배우는 곡 (F-13): 수강생 검색과 같은 검색. 기본 한 곡, 최대 세 곡. 첫 곡이 대표. 없으면 그 자리에서 새 곡
export function SongPicker({ initial = [] }: { initial?: SongOption[] }) {
  const [picked, setPicked] = useState<SongOption[]>(initial);
  const [searching, setSearching] = useState(initial.length === 0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongOption[] | null>(null);
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onQuery(q: string) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setResults(null);
      return;
    }
    timer.current = setTimeout(() => start(async () => setResults(await searchSongsForMyClassAction(q))), 250);
  }

  function add(s: SongOption) {
    if (picked.some((p) => p.id === s.id) || picked.length >= MAX_SONGS) return;
    setPicked([...picked, s]);
    setSearching(false);
    setQuery("");
    setResults(null);
  }

  return (
    <fieldset>
      <legend className="text-sm font-black">
        배우는 곡 <small className="font-semibold text-sub">첫 곡이 대표 · 최대 3곡</small>
      </legend>
      {picked.map((s) => (
        <input key={s.id} type="hidden" name="songIds" value={s.id} />
      ))}
      {picked.length > 0 && (
        <ol className="mt-2 space-y-2">
          {picked.map((s, i) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl border-2 border-ink bg-sky px-3 py-2 text-[14px] font-black">
              <span className="min-w-0 truncate">
                <span className="mr-1.5 rounded-full bg-card px-1.5 text-[11px]">{i === 0 ? "대표" : `${i + 1}곡`}</span>
                {s.label}
              </span>
              <button type="button" aria-label={`${s.label} 빼기`} onClick={() => setPicked(picked.filter((p) => p.id !== s.id))} className="press flex-none rounded-full border-2 border-ink bg-card px-2 text-[12px]">
                빼기
              </button>
            </li>
          ))}
        </ol>
      )}
      {!searching && picked.length < MAX_SONGS && (
        <button type="button" onClick={() => setSearching(true)} className="mt-2 text-[13px] font-bold text-sub underline underline-offset-2">
          {picked.length === 0 ? "곡 찾기" : "다른 곡도 배워요 (메들리)"}
        </button>
      )}
      {searching && picked.length < MAX_SONGS && (
        <div className="mt-2 space-y-2">
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="곡 이름이나 아티스트" autoComplete="off" className={inputClass} />
          {results && results.length > 0 && (
            <ul className="space-y-1.5">
              {results.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => add(s)} className="press w-full rounded-2xl border-2 border-ink bg-card px-3 py-2 text-left text-[14px] font-bold">
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && results && <NewSong defaultTitle={query} noResults={results.length === 0} onCreated={add} />}
        </div>
      )}
    </fieldset>
  );
}

// 찾는 곡이 없으면 그 자리에서 만든다 (F-13). 새 곡은 검수 대기
function NewSong({ defaultTitle, noResults, onCreated }: { defaultTitle: string; noResults: boolean; onCreated: (s: SongOption) => void }) {
  const [open, setOpen] = useState(noResults);
  const [title, setTitle] = useState(defaultTitle);
  const [artist, setArtist] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-bold text-sub underline underline-offset-2">
        찾는 곡이 없나요? 새 곡으로 추가
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border-2 border-dashed border-ink/40 p-3">
      <p className="text-[14px] font-black">{noResults ? "아직 올빗에 없는 곡이에요. 새로 추가할까요?" : "새 곡으로 추가"}</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="곡명 (예: NEON)" className={inputClass} />
      <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={100} placeholder="아티스트 (예: A2O LITE)" className={inputClass} />
      {error && <p className="text-sm font-bold text-[#d6246e]">{error}</p>}
      <StickerButton
        type="button"
        variant="white"
        size="md"
        display={false}
        disabled={pending || !title.trim() || !artist.trim()}
        onClick={() =>
          start(async () => {
            const r = await createSongForMyClassAction(title, artist);
            if (r.ok && r.song && r.song.id) onCreated(r.song);
            else setError(r.error ?? "곡을 만들지 못했어요");
          })
        }
      >
        {pending ? "추가하는 중…" : "추가하고 고르기"}
      </StickerButton>
    </div>
  );
}
