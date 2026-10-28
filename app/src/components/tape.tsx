import type { CSSProperties } from "react";

const TONE = { butter: "bg-butter/80", pink: "bg-pink/60", sky: "bg-sky/65" } as const;

// 마스킹 테이프. 포토카드·티켓 위에 비스듬히 붙인다 (장식이라 스크린리더에서 숨김)
export function Tape({ tone = "butter", style, className = "" }: { tone?: keyof typeof TONE; style?: CSSProperties; className?: string }) {
  return <span aria-hidden className={`pointer-events-none absolute z-[3] h-[22px] w-[78px] border-[1.5px] border-black/20 ${TONE[tone]} ${className}`} style={style} />;
}
