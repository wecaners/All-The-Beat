"use client";

import { useCallback, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { StickerButton } from "@/components/sticker-button";
import type { MyPlace } from "@/server/instructors/classes";
import type { StudioCandidate } from "@/server/kakao";
import { saveMyStudioAction, searchMyStudiosAction } from "./actions";
import { pickChip } from "./time-sheet";

const inputClass = "w-full rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-[16px] font-bold outline-none focus:shadow-sticker-pink";

// 장소 (FR-5): 내 스튜디오 칩에서 고르거나 새로 찾아 저장한다. 고르면 권역을 그 장소로 맞춘다 (바꿀 수 있다)
export function StudioPicker({ places: initialPlaces, value, onChange }: { places: MyPlace[]; value: number | null; onChange: (placeId: number | null, regionId: number | null) => void }) {
  const [places, setPlaces] = useState(initialPlaces);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [manual, setManual] = useState(false);

  return (
    <fieldset>
      <legend className="text-sm font-black">장소</legend>
      <input type="hidden" name="placeId" value={manual ? "" : (value ?? "")} />
      {places.length > 0 && !manual && (
        <div className="mt-2 flex flex-wrap gap-2">
          {places.map((p) => (
            <button key={p.id} type="button" aria-pressed={p.id === value} onClick={() => onChange(p.id, p.regionId)} className={pickChip(p.id === value, "text-left")}>
              <span className="block">
                <span className="block text-[14px]">{p.studioName}</span>
                <span className={`block text-[11px] font-semibold ${p.id === value ? "text-white/80" : "text-sub"}`}>{p.address}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {!manual ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-2 text-[13px] font-bold text-sub underline underline-offset-2">
          {places.length === 0 ? "장소 찾기" : "다른 장소 찾기"}
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <input name="studioName" required maxLength={60} placeholder="스튜디오 이름" className={inputClass} />
          <input name="address" required maxLength={200} placeholder="주소 (예: 서울 마포구 양화로 100)" className={inputClass} />
          <p className="text-[12px] font-semibold text-sub">주소의 구로 권역을 정해요. 아래에서 바꿀 수 있어요.</p>
        </div>
      )}

      <BottomSheet open={open} onClose={close} label="장소 찾기">
        <StudioSearch
          onSaved={(p) => {
            setPlaces((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
            onChange(p.id, p.regionId);
            setOpen(false);
          }}
          onManual={() => {
            setManual(true);
            onChange(null, null);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </fieldset>
  );
}

// 카카오 장소·주소 검색 → 내 스튜디오로 저장 (specs/instructor-studio와 같은 규칙)
function StudioSearch({ onSaved, onManual }: { onSaved: (p: MyPlace) => void; onManual: () => void }) {
  const [mode, setMode] = useState<"place" | "address">("place");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<StudioCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function search() {
    start(async () => {
      const r = await searchMyStudiosAction(mode, query);
      setError(r.ok ? null : (r.error ?? "검색하지 못했어요"));
      setCandidates(r.candidates ?? null);
    });
  }

  function pick(c: StudioCandidate) {
    start(async () => {
      const r = await saveMyStudioAction(c);
      if (r.ok && r.placeId) onSaved({ id: r.placeId, studioName: c.name, address: c.address, regionId: r.regionId ?? 0 });
      else setError(r.error ?? "저장하지 못했어요");
    });
  }

  return (
    <div>
      <h3 className="font-display text-[26px]">어디서 열어요?</h3>
      <div className="mt-3 flex gap-2">
        <button type="button" aria-pressed={mode === "place"} onClick={() => setMode("place")} className={pickChip(mode === "place")}>
          연습실 이름
        </button>
        <button type="button" aria-pressed={mode === "address"} onClick={() => setMode("address")} className={pickChip(mode === "address")}>
          주소
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder={mode === "place" ? "예: 무브 스튜디오" : "예: 서울 마포구 양화로"}
          autoComplete="off"
          className={inputClass}
        />
        <StickerButton type="button" variant="lime" size="md" display={false} className="!w-auto flex-none px-4" disabled={pending} onClick={search}>
          찾기
        </StickerButton>
      </div>
      {error && <p className="mt-2 text-sm font-bold text-[#d6246e]">{error}</p>}
      {candidates && candidates.length === 0 && <p className="mt-3 text-sm font-semibold text-sub">찾은 곳이 없어요. 다른 이름이나 주소로 찾아 주세요.</p>}
      {candidates && candidates.length > 0 && (
        <ul className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto">
          {candidates.map((c, i) => (
            <li key={`${c.kakaoPlaceId ?? c.address}-${i}`}>
              <button type="button" disabled={pending} onClick={() => pick(c)} className="press w-full rounded-2xl border-2 border-ink bg-card px-3 py-2 text-left">
                <span className="block text-[14px] font-black">{c.name}</span>
                <span className="block text-[12px] font-semibold text-sub">{c.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onManual} className="mt-4 text-[13px] font-bold text-sub underline underline-offset-2">
        검색에 없어요. 이름과 주소를 직접 쓸게요
      </button>
    </div>
  );
}
