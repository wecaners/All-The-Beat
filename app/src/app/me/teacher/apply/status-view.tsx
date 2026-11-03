"use client";

import { useActionState } from "react";
import { StickerButton } from "@/components/sticker-button";
import type { MyInstructor } from "@/server/instructors";
import { type InstructorActionState, verifyInstructorCodeAction } from "./actions";

// 신청 뒤 상태 (와이어프레임 T-01b): 3단계 중 지금 어디인지. 걸리는 시간은 약속하지 않는다 (원칙 6)
export function StatusView({ me }: { me: MyInstructor }) {
  const step = me.status === "pending" ? 2 : me.status === "verified" ? 3 : me.status === "approved" ? 4 : 0;
  return (
    <ol className="mt-5 space-y-3">
      <Step n={1} state="done" title="신청 완료">
        @{me.instagramHandle} · {me.regionNames.join(", ")}
      </Step>
      <Step n={2} state={step === 2 ? "now" : step > 2 ? "done" : "todo"} title="인스타그램 본인 확인">
        {step === 2 ? <CodeForm me={me} /> : step > 2 ? "확인됐어요" : null}
      </Step>
      <Step n={3} state={step === 3 ? "now" : step > 3 ? "done" : "todo"} title="운영자 승인">
        {step === 4 ? "강사로 승인됐어요!" : step === 3 ? "확인이 끝났어요. 운영자가 보고 승인해요" : "확인이 끝나면 운영자가 승인해요"}
      </Step>
    </ol>
  );
}

export function Step({ n, state, title, children }: { n: number; state: "done" | "now" | "todo"; title: string; children: React.ReactNode }) {
  const badge = state === "done" ? "bg-lime" : state === "now" ? "bg-pink text-white" : "bg-card text-sub";
  return (
    <li className={`flex gap-3 rounded-2xl border-2 p-3.5 ${state === "now" ? "border-ink bg-card shadow-sticker" : "border-ink/30 bg-card/60"}`}>
      <span className={`grid h-8 w-8 flex-none place-items-center rounded-full border-2 border-ink font-display text-[15px] leading-none ${badge}`}>{n}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-black ${state === "todo" ? "text-sub" : ""}`}>{title}</p>
        {children && <div className="mt-1 text-[13px] font-semibold text-sub">{children}</div>}
      </div>
    </li>
  );
}

// 코드 6자리 입력. 운영자가 DM으로 보낸 뒤에만 맞는다
function CodeForm({ me }: { me: MyInstructor }) {
  const [state, action, pending] = useActionState<InstructorActionState, FormData>(verifyInstructorCodeAction, { ok: false });
  return (
    <form action={action}>
      <p>
        올빗 운영자가 이 계정으로 6자리 코드를 DM으로 보내요.
        {me.code === "expired" && " 지난 코드는 만료됐어요(24시간). 운영자에게 다시 받아 주세요."}
        {me.code === "none" && " 아직 보내기 전이에요. 받으면 여기에 넣어 주세요."}
      </p>
      <div className="mt-2.5 space-y-2">
        <input
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          placeholder="000000"
          aria-label="인증 코드 6자리"
          className="w-full rounded-2xl border-2 border-ink bg-paper px-3 py-2 text-center font-display text-[24px] tracking-[0.3em] text-ink outline-none focus:shadow-sticker-pink"
        />
        <StickerButton variant="lime" size="md" display={false} disabled={pending}>
          {pending ? "확인 중…" : "확인하기"}
        </StickerButton>
      </div>
      {state.error && <p className="mt-2 text-sm font-bold text-[#d6246e]">{state.error}</p>}
    </form>
  );
}
