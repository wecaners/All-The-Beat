"use client";

import { centerOf, confetti, play } from "./motion";

// 고르는 칩 (라디오). 고르면 톡 튀고 작은 하트·별이 난다
export function ChoiceChip({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
        onChange={(e) => {
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
