"use client";

import { usePathname, useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { LEVEL_LABEL } from "@/lib/format";
import type { AdminPlace, EncoreSource } from "@/server/admin/classes";
import type { AdminInstructorRow } from "@/server/admin/instructors";
import type { Region } from "@/server/regions";
import { type AdminActionState, createClassAction } from "../../actions";
import { StudioPicker } from "../../instructors/studio-forms";
import { SongPicker } from "./song-picker";
import { buttonClass, Field, inputClass, Result } from "../../ui";

const BOOKING_TYPE_LABEL = {
  naver: "네이버 예약",
  kakao_openchat: "카카오 오픈채팅",
  insta_dm: "인스타 DM",
  google_form: "구글폼",
  other: "기타",
} as const;

// 30분 단위 06:00 ~ 23:30 (F-12)
const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

type Props = {
  instructors: AdminInstructorRow[];
  instructorId: number | null;
  places: AdminPlace[];
  regions: Region[];
  today: string;
  /** 앵콜 클래스 등록이면 원 클래스 값. 날짜만 새로 넣는다 (specs/encore FR-15) */
  encore?: EncoreSource | null;
};

export function ClassForm({ instructors, instructorId, places, regions, today, encore = null }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(createClassAction, { ok: false });
  const encorePlace = encore && places.some((p) => p.id === encore.placeId) ? String(encore.placeId) : null;
  const [placeId, setPlaceId] = useState<string>(encorePlace ?? (places[0] ? String(places[0].id) : ""));
  const selected = instructors.find((i) => i.id === instructorId);

  return (
    <form action={action} className="mt-4 space-y-5">
      {encore && (
        <>
          <input type="hidden" name="encoreOfClassId" value={encore.classId} />
          {/* 고정한 강사 select는 disabled라 값이 안 가서 숨은 값으로 보낸다 */}
          <input type="hidden" name="instructorId" value={encore.instructorId} />
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">원 클래스 값을 채워 뒀어요. 날짜를 넣고 바뀐 것만 고쳐 주세요. 강사는 바꿀 수 없어요.</p>
        </>
      )}
      <Field label="강사 *" hint={selected?.isProxy && !selected.consentAt ? "⏸ 게재 동의 전 — 등록해도 아직 공개되지 않아요" : undefined}>
        <select
          name={encore ? undefined : "instructorId"}
          required
          disabled={!!encore}
          value={instructorId ?? ""}
          onChange={(e) => router.replace(`${pathname}?instructor=${e.target.value}`)}
          className={inputClass}
        >
          <option value="" disabled>
            강사를 골라 주세요
          </option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.displayName} (@{i.instagramHandle}){i.isProxy && !i.consentAt ? " · 동의 전" : ""}
            </option>
          ))}
        </select>
      </Field>

      <SongPicker initial={encore?.songs} />

      <Field label="클래스 이름" hint="비우면 '첫 곡명 원데이 클래스'">
        <input name="title" maxLength={30} defaultValue={encore?.title} className={inputClass} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="날짜 *">
          <input type="date" name="date" required min={today} className={inputClass} />
        </Field>
        <Field label="시작 *">
          <select name="startTime" required defaultValue={encore?.startTime ?? "19:00"} className={inputClass}>
            {TIMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="종료 *">
          <select name="endTime" required defaultValue={encore?.endTime ?? "21:00"} className={inputClass}>
            {TIMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">스튜디오 *</legend>
        {places.length > 0 && (
          <select name="placeId" value={placeId} onChange={(e) => setPlaceId(e.target.value)} className={inputClass}>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.studioName} · {p.address}
              </option>
            ))}
            <option value="">+ 새 스튜디오 찾기</option>
          </select>
        )}
        {(places.length === 0 || placeId === "") && (
          <>
            {/* 찾아서 고르면 이 강사의 스튜디오로 저장되고, 화면이 새로 그려지며 목록에 들어온다 (specs/instructor-studio FR-7) */}
            {instructorId && <StudioPicker instructorId={instructorId} onSaved={(id) => setPlaceId(String(id))} />}
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-500">카카오 검색 없이 직접 입력 (지도 미리보기 없음)</summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-[12rem_1fr]">
                <input name="studioName" placeholder="스튜디오 이름" maxLength={60} defaultValue={encorePlace ? undefined : encore?.studioName} className={inputClass} />
                <input name="address" placeholder="서울 마포구 양화로 100 3층" maxLength={200} defaultValue={encorePlace ? undefined : encore?.address} className={inputClass} />
              </div>
            </details>
          </>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="권역" hint="비우면 주소로 추정">
          <select name="regionId" defaultValue={encore ? String(encore.regionId) : ""} className={inputClass}>
            <option value="">주소로 자동</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.shortName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="가격(원) *">
          <input type="number" name="price" required min={0} step={1000} placeholder="30000" defaultValue={encore?.price} className={inputClass} />
        </Field>
        <Field label="정원">
          <input type="number" name="capacity" min={1} defaultValue={encore?.capacity ?? undefined} className={inputClass} />
        </Field>
      </div>

      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="mb-1 text-sm font-semibold">난이도 *</legend>
        {Object.entries(LEVEL_LABEL).map(([value, label]) => (
          <label key={value} className="flex items-center gap-1">
            <input type="radio" name="level" value={value} required defaultChecked={encore?.level === value} /> {label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="예약 링크 *" hint="http(s) 주소">
          <input type="url" name="bookingUrl" required placeholder="https://booking.naver.com/..." defaultValue={encore?.bookingUrl} className={inputClass} />
        </Field>
        <Field label="링크 유형">
          <select name="bookingType" defaultValue={encore?.bookingType ?? ""} className={inputClass}>
            <option value="">주소로 자동</option>
            {Object.entries(BOOKING_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="설명" hint="1,000자까지. 준비물·주의사항">
        <textarea name="description" maxLength={1000} rows={4} defaultValue={encore?.description ?? undefined} className={inputClass} />
      </Field>

      <Result state={state} />
      <button disabled={pending || !instructorId} className={buttonClass}>
        {pending ? "등록 중…" : encore ? "앵콜 클래스 등록" : "클래스 등록"}
      </button>
    </form>
  );
}
