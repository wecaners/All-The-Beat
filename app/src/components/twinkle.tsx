// 반짝이는 별 낙서 (design.md 인터랙션 "작은 생활 움직임"). 장식이라 스크린리더에서 숨긴다. 동작 줄이기면 멈춘다(globals.css)
export function Twinkle({ size = 18, color = "var(--color-butter)", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className={`inline-block animate-twinkle ${className}`}>
      <path d="M12 1 L14 10 L23 12 L14 14 L12 23 L10 14 L1 12 L10 10 Z" fill={color} stroke="#161616" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
