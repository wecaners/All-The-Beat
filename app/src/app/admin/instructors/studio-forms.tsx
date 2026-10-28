"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { FACILITIES, type Facility } from "@/lib/facilities";
import type { AdminStudio } from "@/server/admin/studios";
import type { StudioCandidate } from "@/server/kakao";
import type { Region } from "@/server/regions";
import {
  type AdminActionState,
  addStudioPhotoAction,
  deleteStudioPhotoAction,
  saveStudioAction,
  searchStudiosAction,
  setStudioArchivedAction,
  updateStudioAction,
} from "../actions";
import { buttonClass, Field, inputClass, linkButtonClass, Result } from "../ui";
import { photoFormData } from "./image-upload";

// 스튜디오 찾기: 카카오맵 장소 이름 또는 주소로 검색해 고른다 (specs/instructor-studio FR-1)
export function StudioPicker({ instructorId, onSaved }: { instructorId: number; onSaved?: (id: number, label: string) => void }) {
  const [mode, setMode] = useState<"place" | "address">("place");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<StudioCandidate[] | null>(null);
  const [picked, setPicked] = useState<StudioCandidate | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState<AdminActionState>({ ok: false });
  const [pending, start] = useTransition();

  function search() {
    start(async () => {
      setPicked(null);
      const r = await searchStudiosAction(mode, query);
      setCandidates(r.candidates ?? null);
      setState({ ok: r.ok, error: r.error });
    });
  }

  function save(c: StudioCandidate) {
    start(async () => {
      const r = await saveStudioAction(instructorId, c);
      setState(r);
      if (r.ok && r.id) {
        onSaved?.(r.id, `${c.name} · ${c.address}`);
        setCandidates(null);
        setPicked(null);
        setQuery("");
        setName("");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
      <div className="flex gap-3 text-sm">
        {(["place", "address"] as const).map((m) => (
          <label key={m} className="flex items-center gap-1">
            <input type="radio" checked={mode === m} onChange={() => setMode(m)} /> {m === "place" ? "카카오맵 장소 이름" : "주소"}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder={mode === "place" ? "무브 스튜디오 합정" : "서울 마포구 양화로 12"}
          className={inputClass}
        />
        <button type="button" onClick={search} disabled={pending} className={buttonClass}>
          찾기
        </button>
      </div>
      <Result state={state} />
      {candidates && candidates.length === 0 && <p className="text-sm text-zinc-500">찾은 곳이 없어요. 다른 이름이나 주소로 찾아 주세요</p>}
      {candidates && candidates.length > 0 && (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm">
          {candidates.map((c, i) => (
            <li key={`${c.kakaoPlaceId ?? c.address}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                {c.name && <p className="font-semibold">{c.name}</p>}
                <p className="text-zinc-600">{c.address}</p>
                {c.category && <p className="text-xs text-zinc-400">{c.category}</p>}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => (mode === "place" ? save(c) : setPicked(c))}
                className={linkButtonClass}
              >
                고르기
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && (
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="스튜디오 이름" className={inputClass} />
          <button type="button" disabled={pending || !name.trim()} onClick={() => save({ ...picked, name: name.trim() })} className={buttonClass}>
            저장
          </button>
        </div>
      )}
    </div>
  );
}

// 스튜디오 하나: 이름·권역·시설 고치기, 사진, 목록에서 빼기
export function StudioCard({ studio, regions }: { studio: AdminStudio; regions: Region[] }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(updateStudioAction, { ok: false });
  const [photoState, setPhotoState] = useState<AdminActionState>({ ok: false });
  const [busy, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function upload(files: FileList | null) {
    if (!files?.length) return;
    start(async () => {
      for (const file of Array.from(files)) {
        try {
          const r = await addStudioPhotoAction(await photoFormData(file, { placeId: studio.id }));
          setPhotoState(r);
          if (!r.ok) break;
        } catch (e) {
          setPhotoState({ ok: false, error: e instanceof Error ? e.message : "사진을 올리지 못했어요" });
          break;
        }
      }
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  return (
    <div className={`rounded-lg border p-3 ${studio.archived ? "border-dashed border-zinc-300 opacity-60" : "border-zinc-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm">
          <p className="text-zinc-600">{studio.address}</p>
          <p className="text-xs text-zinc-400">
            {studio.hasLocation ? "위치 있음" : "위치 없음(지도 미리보기 안 나옴)"}
            {studio.kakaoPlaceUrl && " · 카카오맵 장소"}
            {studio.archived && " · 목록에서 뺌"}
          </p>
        </div>
        <button type="button" disabled={busy} onClick={() => start(async () => setPhotoState(await setStudioArchivedAction(studio.id, !studio.archived)))} className={linkButtonClass}>
          {studio.archived ? "목록에 되돌리기" : "목록에서 빼기"}
        </button>
      </div>

      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="placeId" value={studio.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="스튜디오 이름">
            <input name="studioName" defaultValue={studio.studioName} maxLength={60} required className={inputClass} />
          </Field>
          <Field label="권역">
            <select name="regionId" defaultValue={studio.regionId} className={inputClass}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.shortName}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">시설</legend>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {(Object.keys(FACILITIES) as Facility[]).map((f) => (
              <label key={f} className="flex items-center gap-1">
                <input type="checkbox" name="facilities" value={f} defaultChecked={studio.facilities.includes(f)} /> {FACILITIES[f]}
              </label>
            ))}
          </div>
        </fieldset>
        <Result state={state} />
        <button disabled={pending} className={buttonClass}>
          {pending ? "저장 중…" : "저장"}
        </button>
      </form>

      <div className="mt-4">
        <p className="text-sm font-semibold">
          사진 <span className="font-normal text-zinc-500">{studio.photos.length}/8 · 강사가 직접 찍은 사진만</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {studio.photos.map((p) => (
            <div key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- Storage 공개 주소 */}
              <img src={p.thumbUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
              <button
                type="button"
                disabled={busy}
                onClick={() => start(async () => setPhotoState(await deleteStudioPhotoAction(p.id)))}
                className="absolute top-1 right-1 rounded bg-black/70 px-1.5 text-xs text-white"
              >
                지우기
              </button>
            </div>
          ))}
          {studio.photos.length < 8 && (
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-md border border-dashed border-zinc-300 text-xs text-zinc-500">
              {busy ? "올리는 중…" : "+ 사진"}
              <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
            </label>
          )}
        </div>
        <div className="mt-2">
          <Result state={photoState} />
        </div>
      </div>
    </div>
  );
}
