"use client";

import { useActionState } from "react";
import { ChoiceChip } from "@/components/chip";
import { StickerButton } from "@/components/sticker-button";
import type { MyInstructor } from "@/server/instructors";
import type { Region } from "@/server/regions";
import { applyInstructorAction, type InstructorActionState } from "./actions";
import { ClaimOfferCard } from "./claim-view";

const inputClass = "mt-2 w-full rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-[16px] font-bold outline-none focus:shadow-sticker-pink";

// 신청 폼 (와이어프레임 T-01a): 필수 3개 + 선택 1개. 반려 뒤에는 이전 입력을 채워 두고 다시 신청한다
export function ApplyForm({ regions, previous }: { regions: Region[]; previous: MyInstructor | null }) {
  const [state, action, pending] = useActionState<InstructorActionState, FormData>(applyInstructorAction, { ok: false });

  return (
    <>
      <form action={action} className="mt-5 space-y-5">
        <label className="block">
          <span className="text-sm font-black">
            활동명 <small className="font-semibold text-sub">클래스에 표시돼요</small>
          </span>
          <input name="displayName" defaultValue={previous?.displayName ?? ""} required maxLength={30} autoComplete="off" placeholder="예: 민지" className={inputClass} />
        </label>

        <label className="block">
          <span className="text-sm font-black">
            인스타그램 계정 <small className="font-semibold text-sub">본인 확인에 써요</small>
          </span>
          <span className="relative block">
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 mt-1 -translate-y-1/2 font-display text-[18px] text-sub">
              @
            </span>
            <input
              name="instagramHandle"
              defaultValue={previous?.instagramHandle ?? ""}
              required
              maxLength={60}
              autoComplete="off"
              autoCapitalize="none"
              placeholder="minji.dance"
              className={`${inputClass} pl-8`}
            />
          </span>
          <span className="mt-1.5 block text-[12px] font-semibold text-sub">이 계정으로 인증 코드를 DM으로 보내요</span>
        </label>

        <fieldset>
          <legend className="text-sm font-black">
            주로 활동하는 지역 <small className="font-semibold text-sub">여러 개 골라도 돼요</small>
          </legend>
          <div className="mt-2 flex flex-wrap gap-[7px]">
            {regions.map((r) => (
              <ChoiceChip key={r.id} name="regionIds" value={String(r.id)} label={r.shortName} multiple defaultChecked={previous?.regionIds.includes(r.id)} />
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-black">
            한 줄 소개 <small className="font-semibold text-sub">(선택 · 50자)</small>
          </span>
          <input name="bio" defaultValue={previous?.bio ?? ""} maxLength={50} placeholder="예: 입문자도 1시간이면 완곡하는 K-pop 커버" className={inputClass} />
        </label>

        {state.error && <p className="text-sm font-bold text-[#d6246e]">{state.error}</p>}

        <StickerButton variant="lime" disabled={pending}>
          {pending ? "보내는 중…" : previous ? "다시 신청하기" : "신청하기"}
        </StickerButton>
      </form>
      {/* 운영자가 대신 등록해 둔 계정이면 가져오기를 제안한다 (F-19) */}
      {state.claim && <ClaimOfferCard key={state.claim.handle} offer={state.claim} />}
    </>
  );
}
