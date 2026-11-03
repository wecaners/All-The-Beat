import type { CSSProperties } from "react";

// 응원봉 스티커 (앵콜). 핑크 별 머리 + 흰 손잡이 + 라임 띠. glow면 머리 뒤가 은은하게 빛난다 (시안 round-3)
export function Lightstick({ size = 46, glow = false, className = "", style }: { size?: number; glow?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden width={size} height={size * 2.1} viewBox="0 0 40 84" className={className} style={style}>
      {glow && <circle cx="20" cy="18" r="17" fill="#fff6a8" opacity=".55" />}
      <path
        d="M20 3 L23.5 12.5 L33.5 13 L25.6 19.2 L28.4 29 L20 23.4 L11.6 29 L14.4 19.2 L6.5 13 L16.5 12.5 Z"
        fill="var(--color-pink)"
        stroke="var(--color-ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="16" y="30" width="8" height="46" rx="4" fill="var(--color-card)" stroke="var(--color-ink)" strokeWidth="2" />
      <rect x="16" y="46" width="8" height="8" fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth="2" />
    </svg>
  );
}
