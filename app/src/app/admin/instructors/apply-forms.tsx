"use client";

import { useActionState, useState, useTransition } from "react";
import { ActionButton } from "../action-button";
import { type AdminActionState, issueVerifyCodeAction, rejectInstructorAction } from "../actions";
import { buttonClass, Field, inputClass, Result } from "../ui";

// 코드 발급: 결과(원문)는 이 자리에 한 번만 보인다. 서버는 해시만 둔다
export function IssueCodeButton({ instructorId, hasValidCode }: { instructorId: number; hasValidCode: boolean }) {
  const [busy, start] = useTransition();
  const [state, setState] = useState<AdminActionState | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => start(async () => setState(await issueVerifyCodeAction(instructorId)))}
        className={buttonClass}
      >
        {busy ? "발급 중…" : hasValidCode ? "코드 다시 발급 (이전 코드 무효)" : "인증 코드 발급"}
      </button>
      {state && <Result state={state} />}
    </div>
  );
}

export function ApproveButton({ instructorId, run }: { instructorId: number; run: (id: number) => Promise<AdminActionState> }) {
  return <ActionButton label="승인" confirm="이 강사를 승인할까요? 승인되면 클래스를 올릴 수 있어요" run={() => run(instructorId)} />;
}

export function RejectForm({ instructorId }: { instructorId: number }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(rejectInstructorAction, { ok: false });
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="instructorId" value={instructorId} />
      <Field label="반려 사유" hint="강사에게 그대로 보여요">
        <input name="reason" required minLength={2} maxLength={200} placeholder="예: 인스타 계정이 본인 계정이 아닌 것 같아요" className={inputClass} />
      </Field>
      <Result state={state} />
      <button disabled={pending} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-bold text-red-700 disabled:opacity-50">
        {pending ? "반려 중…" : "반려"}
      </button>
    </form>
  );
}
