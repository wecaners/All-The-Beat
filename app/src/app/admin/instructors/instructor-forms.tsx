"use client";

import { useActionState } from "react";
import type { Region } from "@/server/regions";
import { type AdminActionState, createInstructorAction, recordConsentAction } from "../actions";
import { buttonClass, Field, inputClass, Result } from "../ui";

export function InstructorForm({ regions }: { regions: Region[] }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(createInstructorAction, { ok: false });

  return (
    <form action={action} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="활동명 *">
          <input name="displayName" required maxLength={30} placeholder="댄서 김" className={inputClass} />
        </Field>
        <Field label="인스타그램 아이디 *" hint="@·주소를 붙여도 돼요">
          <input name="instagramHandle" required placeholder="@dance.kim" className={inputClass} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">주 활동 권역 *</legend>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {regions.map((r) => (
            <label key={r.id} className="flex items-center gap-1">
              <input type="checkbox" name="regionIds" value={r.id} /> {r.shortName}
            </label>
          ))}
        </div>
      </fieldset>
      <Result state={state} />
      <button disabled={pending} className={buttonClass}>
        {pending ? "저장 중…" : "강사 프로필 만들기"}
      </button>
    </form>
  );
}

export function ConsentForm({ instructorId, today, hasConsent }: { instructorId: number; today: string; hasConsent: boolean }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(recordConsentAction, { ok: false });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="instructorId" value={instructorId} />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="동의 날짜 *">
          <input type="date" name="consentDate" required max={today} defaultValue={today} className={inputClass} />
        </Field>
        <Field label="동의 방법 *" hint="나중에 확인할 수 있게">
          <input name="consentNote" required maxLength={200} placeholder="인스타 DM으로 동의, 캡처 저장 (드라이브/강사동의/댄서김.png)" className={inputClass} />
        </Field>
      </div>
      <Result state={state} />
      <button disabled={pending} className={buttonClass}>
        {pending ? "기록 중…" : hasConsent ? "동의 기록 고치기" : "동의 기록하고 공개하기"}
      </button>
    </form>
  );
}
