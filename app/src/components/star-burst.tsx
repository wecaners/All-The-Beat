import type { CSSProperties, ReactNode } from "react";

const TONE = { butter: "#ffe15c", lime: "#cff23a", pink: "#ff6fb5", sky: "#7cc8ff" } as const;

// 끝이 둥근 별 경로 (꼭짓점 points개, 바깥·안쪽 반지름)
function starPath(points: number, outer: number, inner: number, c = 50) {
  const step = Math.PI / points;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = i * step - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)} `;
  }
  return d + "Z";
}
const PATH = starPath(12, 41, 33);

// 다이컷 별 스티커 ("추가요!", "앵콜!", 완료). SVG라 테두리가 매끈하고,
// 검은 외곽선 → 흰 여백 → 색 별 → 광택 순으로 겹쳐 실제 스티커처럼 보인다 (_agent/rules/design.md)
export function StarBurst({
  children,
  size = 84,
  tone = "butter",
  className = "",
  style,
}: {
  children: ReactNode;
  size?: number;
  tone?: keyof typeof TONE;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`relative grid place-items-center ${className}`} style={{ width: size, height: size, ...style }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {/* 딱 떨어지는 그림자 */}
        <path d={PATH} transform="translate(3.5 4)" fill="#161616" stroke="#161616" strokeWidth="13" strokeLinejoin="round" />
        {/* 검은 외곽선 + 흰 다이컷 여백 */}
        <path d={PATH} fill="#161616" stroke="#161616" strokeWidth="13" strokeLinejoin="round" />
        <path d={PATH} fill="#fff" stroke="#fff" strokeWidth="8.5" strokeLinejoin="round" />
        {/* 색 별 */}
        <path d={PATH} fill={TONE[tone]} stroke="#161616" strokeWidth="1.6" strokeLinejoin="round" />
        {/* 광택 */}
        <ellipse cx="36" cy="30" rx="9" ry="4.5" fill="#fff" opacity=".7" transform="rotate(-30 36 30)" />
      </svg>
      <span
        className={`relative text-center font-display leading-[1.05] ${tone === "pink" ? "text-white text-sticker [text-shadow:1px_1px_0_var(--color-ink)]" : "text-ink"}`}
        style={{ fontSize: Math.round(size / 5.4) }}
      >
        {children}
      </span>
    </div>
  );
}
