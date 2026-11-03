"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { ChoiceChip } from "@/components/chip";
import { StickerButton } from "@/components/sticker-button";
import { LEVEL_LABEL } from "@/lib/format";
import type { ClassFormSource, MyPlace } from "@/server/instructors/classes";
import type { Region } from "@/server/regions";
import { createMyClassAction, type MyClassActionState, type SongOption, updateMyClassAction } from "./actions";
import { SongPicker } from "./song-picker";
import { StudioPicker } from "./studio-picker";
import { DateField, pickChip, TimeField } from "./time-sheet";

const inputClass = "mt-2 w-full rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-[16px] font-bold outline-none focus:shadow-sticker-pink";

type Props = {
  regions: Region[];
  places: MyPlace[];
  /** 수정·복사·앵콜이면 초기값 */
  source?: ClassFormSource | null;
  /** 곡 상세에서 들어왔을 때 미리 고른 곡 */
  presetSong?: SongOption | null;
  /** 앵콜 클래스면 원 클래스 id */
  encoreOfClassId?: number | null;
  /** 수정이면 클래스 id */
  editId?: number | null;
};

// 클래스 등록·수정 폼 (T-02). 필수 7개를 한 화면에. 저장하면 바로 공개되고 클래스 상세로 간다
export function ClassForm({ regions, places, source = null, presetSong = null, encoreOfClassId = null, editId = null }: Props) {
  const router = useRouter();
  const initialPlace = source?.placeId && places.some((p) => p.id === source.placeId) ? source.placeId : (places[0]?.id ?? null);
  const [placeId, setPlaceId] = useState<number | null>(initialPlace);
  const [regionId, setRegionId] = useState<number | null>(source?.regionId ?? places.find((p) => p.id === initialPlace)?.regionId ?? null);
  const [date, setDate] = useState<string | null>(source?.date ?? null);
  const [startTime, setStartTime] = useState(source?.startTime ?? "");
  const [endTime, setEndTime] = useState(source?.endTime ?? "");

  const [state, action, pending] = useActionState<MyClassActionState, FormData>(
    async (prev, fd) => {
      const result = editId ? await updateMyClassAction(editId, prev, fd) : await createMyClassAction(prev, fd);
      if (result.ok && result.classId) router.push(`/class/${result.classId}`);
      return result;
    },
    { ok: false },
  );

  const initialSongs: SongOption[] = source?.songs ?? (presetSong ? [presetSong] : []);

  return (
    <form action={action} className="mt-5 space-y-6">
      {encoreOfClassId && <input type="hidden" name="encoreOfClassId" value={encoreOfClassId} />}
      <input type="hidden" name="regionId" value={regionId ?? ""} />

      <SongPicker initial={initialSongs} />

      <label className="block">
        <span className="text-sm font-black">
          클래스 이름 <small className="font-semibold text-sub">(선택 · 비우면 &ldquo;곡명 원데이 클래스&rdquo;)</small>
        </span>
        <input name="title" defaultValue={source?.title ?? ""} maxLength={30} placeholder="예: NEON 원데이" className={inputClass} />
      </label>

      <DateField value={date} onChange={setDate} />
      <div className="flex gap-3">
        <TimeField name="startTime" label="시작" value={startTime} onChange={(v) => { setStartTime(v); if (endTime && endTime <= v) setEndTime(""); }} />
        <TimeField name="endTime" label="종료" value={endTime} onChange={setEndTime} min={startTime || undefined} />
      </div>

      <StudioPicker
        places={places}
        value={placeId}
        onChange={(p, r) => {
          setPlaceId(p);
          if (r) setRegionId(r);
        }}
      />

      <fieldset>
        <legend className="text-sm font-black">
          권역 <small className="font-semibold text-sub">장소로 정해져요 · 바꿀 수 있어요</small>
        </legend>
        <div className="mt-2 flex flex-wrap gap-[7px]">
          {regions.map((r) => (
            <button key={r.id} type="button" aria-pressed={r.id === regionId} onClick={() => setRegionId(r.id)} className={`${pickChip(r.id === regionId)} !rounded-full !px-3 !py-1.5 !text-[13px]`}>
              {r.shortName}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-3">
        <label className="block min-w-0 flex-1">
          <span className="text-sm font-black">가격 (원)</span>
          <input name="price" type="number" inputMode="numeric" min={0} step={1000} required defaultValue={source?.price ?? ""} placeholder="35000" className={inputClass} />
        </label>
        <label className="block min-w-0 flex-1">
          <span className="text-sm font-black">
            정원 <small className="font-semibold text-sub">(선택)</small>
          </span>
          <input name="capacity" type="number" inputMode="numeric" min={1} defaultValue={source?.capacity ?? ""} placeholder="12" className={inputClass} />
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-black">난이도</legend>
        <div className="mt-2 flex flex-wrap gap-[7px]">
          {(Object.keys(LEVEL_LABEL) as (keyof typeof LEVEL_LABEL)[]).map((l) => (
            <ChoiceChip key={l} name="level" value={l} label={LEVEL_LABEL[l]} defaultChecked={(source?.level ?? "intro") === l} />
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-black">
          예약 링크 <small className="font-semibold text-sub">네이버 예약·오픈채팅·구글 폼·인스타 DM</small>
        </span>
        <input name="bookingUrl" type="url" required defaultValue={source?.bookingUrl ?? ""} placeholder="https://booking.naver.com/…" autoCapitalize="none" className={inputClass} />
        <span className="mt-1.5 block text-[12px] font-semibold text-sub">예약은 지금 쓰는 곳에서 그대로 받아요. 올빗은 이 링크로 보내기만 해요.</span>
      </label>

      <label className="block">
        <span className="text-sm font-black">
          설명 <small className="font-semibold text-sub">(선택 · 1,000자)</small>
        </span>
        <textarea name="description" defaultValue={source?.description ?? ""} maxLength={1000} rows={3} placeholder="준비물, 주차, 레벨 안내…" className={`${inputClass} resize-none`} />
      </label>

      {state.error && <p className="text-sm font-bold text-[#d6246e]">{state.error}</p>}

      <StickerButton variant="lime" disabled={pending}>
        {pending ? "올리는 중…" : editId ? "저장하기" : "등록하고 바로 공개"}
      </StickerButton>
    </form>
  );
}
