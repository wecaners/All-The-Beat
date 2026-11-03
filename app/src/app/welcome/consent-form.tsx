"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { StickerButton } from "@/components/sticker-button";
import { type ConsentActionState, saveConsentAction } from "./actions";

const ITEMS = [
  { key: "terms", label: "이용약관 동의", required: true, href: "/terms" },
  { key: "privacy", label: "개인정보 수집·이용 동의", required: true, href: "/privacy" },
  // 소식을 보내는 기능(F-20)이 아직 없어 "받을 수 있다"까지만 말한다 (원칙 6)
  { key: "marketing", label: "새 클래스·이벤트 소식 받기", required: false, href: null },
] as const;

type Key = (typeof ITEMS)[number]["key"];

// 동의 폼 (와이어프레임 U-09a): 전체 동의, 필수 2·선택 1, 각 약관 보기
export function ConsentForm({ next }: { next: string }) {
  const [checked, setChecked] = useState<Record<Key, boolean>>({ terms: false, privacy: false, marketing: false });
  const [state, action, pending] = useActionState<ConsentActionState, FormData>(saveConsentAction, { ok: false });
  const all = ITEMS.every((i) => checked[i.key]);
  const requiredDone = ITEMS.filter((i) => i.required).every((i) => checked[i.key]);

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="next" value={next} />

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-ink bg-card px-4 py-3">
        <Checkbox checked={all} onChange={(v) => setChecked({ terms: v, privacy: v, marketing: v })} />
        <span className="font-display text-[18px]">전체 동의</span>
      </label>

      <ul className="mt-3 space-y-2 px-1">
        {ITEMS.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <Checkbox name={item.key} checked={checked[item.key]} onChange={(v) => setChecked({ ...checked, [item.key]: v })} />
              <span className="text-[15px] font-bold">
                <span className="text-sub">({item.required ? "필수" : "선택"})</span> {item.label}
              </span>
            </label>
            {item.href && (
              <Link href={item.href} target="_blank" className="flex-none text-[13px] font-extrabold text-sub underline underline-offset-2">
                보기
              </Link>
            )}
          </li>
        ))}
      </ul>

      {state.error && <p className="mt-3 text-sm font-bold text-[#d6246e]">{state.error}</p>}

      <StickerButton variant="lime" className="mt-5" disabled={pending || !requiredDone}>
        {pending ? "시작하는 중…" : "동의하고 시작하기"}
      </StickerButton>
    </form>
  );
}

// 스티커 체크박스. 고르면 라임으로 칠해진다
function Checkbox({ name, checked, onChange }: { name?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className="relative flex-none">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-lg border-2 border-ink bg-card shadow-sticker-sm transition-colors peer-checked:bg-lime peer-focus-visible:ring-2 peer-focus-visible:ring-pink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" className={checked ? "opacity-100" : "opacity-0"}>
          <path d="M4 12.5 L9.5 18 L20 6.5" fill="none" stroke="var(--color-ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
