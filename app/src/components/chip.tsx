"use client";

import { centerOf, confetti, play } from "./motion";

// 고르는 칩. 기본은 라디오(하나), multiple이면 체크박스(여러 개). 고르면 톡 튀고 작은 하트·별이 난다
export function ChoiceChip({ name, value, label, defaultChecked, multiple }: { name: string; value: string; label: string; defaultChecked?: boolean; multiple?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input
        type={multiple ? "checkbox" : "radio"}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
        onChange={(e) => {
          if (!e.currentTarget.checked) return; // 체크박스를 끌 때는 조용히
          const chip = e.currentTarget.nextElementSibling;
          play(chip, [{ transform: "scale(.85) rotate(-4deg)" }, { transform: "scale(1.12) rotate(3deg)" }, { transform: "none" }], { duration: 380 });
          if (chip) {
            const { x, y } = centerOf(chip);
            confetti(x, y, 4, 0.35);
          }
        }}
      />
      <span className="inline-block rounded-full border-2 border-ink bg-card px-3 py-1.5 text-[13px] font-extrabold shadow-sticker-sm transition-colors peer-checked:bg-pink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-pink">
        {label}
      </span>
    </label>
  );
}

// 보기만 하는 칩 (권역별 인원 등)
export function InfoChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-full border-2 border-ink bg-card px-3 py-1 text-[13px] font-extrabold">{children}</span>;
}
