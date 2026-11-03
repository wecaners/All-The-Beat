"use client";

import { useActionState, useState, useTransition } from "react";
import { StickerButton } from "@/components/sticker-button";
import type { MyClaim } from "@/server/instructors";
import { cancelClaimAction, type InstructorActionState, requestClaimAction, verifyClaimCodeAction } from "./actions";
import { Step } from "./status-view";

type Offer = NonNullable<InstructorActionState["claim"]>;

// 대리 강사 가져오기 제안 (F-19, 05 플로우 9). 신청한 핸들이 운영자가 대신 등록해 둔 계정일 때
export function ClaimOfferCard({ offer }: { offer: Offer }) {
  const [state, action, pending] = useActionState<InstructorActionState, FormData>(requestClaimAction, { ok: false });
  return (
    <form action={action} className="sticker-edge mt-5 rounded-2xl bg-butter p-4">
      <input type="hidden" name="instagramHandle" value={offer.handle} />
      <p className="font-display text-[19px] leading-snug">
        이미 올빗에 등록된 클래스가 {offer.classCount}개 있어요
        <br />내 계정으로 가져올까요?
      </p>
      <p className="mt-1.5 text-[13px] font-semibold">
        @{offer.handle}({offer.displayName})은 운영자가 대신 등록해 둔 계정이에요. 인스타 본인 확인을 거치면 클래스와 소개를 그대로 가져와서 직접 고치고 새로 올릴 수 있어요.
      </p>
      <p className="mt-1.5 text-[12px] font-semibold text-sub">가져오면 아직 공개 전이던 클래스도 수강생에게 보여요.</p>
      {state.error && <p className="mt-2 text-sm font-bold text-[#d6246e]">{state.error}</p>}
      <StickerButton variant="lime" size="md" className="mt-3.5" disabled={pending}>
        {pending ? "보내는 중…" : "가져오기 신청"}
      </StickerButton>
    </form>
  );
}

// 가져오기 진행 상태: 신청 → 인스타 본인 확인(코드) → 내 계정으로 연결. 걸리는 시간은 약속하지 않는다 (원칙 6)
export function ClaimStatusView({ claim }: { claim: MyClaim }) {
  const [canceling, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <ol className="mt-5 space-y-3">
        <Step n={1} state="done" title="가져오기 신청">
          @{claim.instagramHandle} · 클래스 {claim.classCount}개
        </Step>
        <Step n={2} state="now" title="인스타그램 본인 확인">
          <ClaimCodeForm claim={claim} />
        </Step>
        <Step n={3} state="todo" title="내 계정으로 연결">
          확인되면 바로 연결되고 내 클래스에서 관리할 수 있어요{claim.hidden ? ". 공개 전이던 클래스도 이때 수강생에게 보여요" : ""}
        </Step>
      </ol>
      {error && <p className="mt-3 text-sm font-bold text-[#d6246e]">{error}</p>}
      <StickerButton
        variant="soft"
        size="md"
        display={false}
        className="mt-5"
        disabled={canceling}
        onClick={() =>
          start(async () => {
            const result = await cancelClaimAction();
            setError(result.ok ? null : (result.error ?? "취소하지 못했어요"));
          })
        }
      >
        {canceling ? "취소하는 중…" : "가져오기 신청 취소"}
      </StickerButton>
    </>
  );
}

function ClaimCodeForm({ claim }: { claim: MyClaim }) {
  const [state, action, pending] = useActionState<InstructorActionState, FormData>(verifyClaimCodeAction, { ok: false });
  return (
    <form action={action}>
      <p>
        올빗 운영자가 @{claim.instagramHandle}로 6자리 코드를 DM으로 보내요.
        {claim.code === "expired" && " 지난 코드는 만료됐어요(24시간). 운영자에게 다시 받아 주세요."}
        {claim.code === "none" && " 아직 보내기 전이에요. 받으면 여기에 넣어 주세요."}
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
          {pending ? "확인 중…" : "확인하고 가져오기"}
        </StickerButton>
      </div>
      {state.error && <p className="mt-2 text-sm font-bold text-[#d6246e]">{state.error}</p>}
    </form>
  );
}
