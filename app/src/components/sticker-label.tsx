import type { ReactNode } from "react";

const TONE = { butter: "bg-butter", lime: "bg-lime", sky: "bg-sky", pink: "bg-pink text-white", white: "bg-card", lilac: "bg-lilac" } as const;

// 작은 스티커 라벨 ("HOT!", "마감 임박", "LIVE"). 살짝 기울여 붙인다
export function StickerLabel({ children, tone = "butter", tilt = -5, className = "" }: { children: ReactNode; tone?: keyof typeof TONE; tilt?: number; className?: string }) {
  return (
    <span
      style={{ transform: `rotate(${tilt}deg)` }}
      className={`inline-block rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-black leading-tight ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
