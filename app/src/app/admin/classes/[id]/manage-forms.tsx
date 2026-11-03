"use client";

import { useActionState, useState, useTransition } from "react";
import { type AdminActionState, cancelClassByAdminAction, updateBookingUrlAction } from "../../actions";
import { buttonClass, Field, inputClass, Result } from "../../ui";

export function BookingUrlForm({ classId, current }: { classId: number; current: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(updateBookingUrlAction, { ok: false });
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="classId" value={classId} />
      <Field label="예약 링크" hint="http(s) 주소. 유형은 주소로 다시 정해요">
        <input name="bookingUrl" type="url" required defaultValue={current} className={inputClass} />
      </Field>
      <Result state={state} />
      <button disabled={pending} className={buttonClass}>
        {pending ? "저장 중…" : "링크 저장"}
      </button>
    </form>
  );
}

const REASONS = [
  { value: "instructor_request", label: "강사 요청" },
  { value: "error", label: "등록 오류" },
  { value: "other", label: "기타" },
];

// 운영자 취소: 사유를 고르고 한 번 더 묻는다. 되돌리지 않는다
export function AdminCancelForm({ classId, title }: { classId: number; title: string }) {
  const [reason, setReason] = useState("");
  const [state, setState] = useState<AdminActionState | null>(null);
  const [busy, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputClass} !w-44`}>
        <option value="">취소 사유…</option>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || !reason}
        onClick={() => {
          if (!window.confirm(`"${title}"을(를) 취소할까요? 되돌릴 수 없고 수강생 화면에 취소로 보여요.`)) return;
          start(async () => setState(await cancelClassByAdminAction(classId, reason)));
        }}
        className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-bold text-red-700 disabled:opacity-50"
      >
        {busy ? "취소 중…" : "클래스 취소"}
      </button>
      {state && <Result state={state} />}
    </div>
  );
}
