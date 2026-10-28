// 스크랩북 움직임 도구 (브라우저 전용). 라이브러리 없이 Web Animations API로 만든다 (specs/design-system findings)

export const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
export const SNAP = "cubic-bezier(0.22, 1, 0.36, 1)";

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 동작 줄이기면 즉시 끝나는 애니메이션
export function play(el: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions = {}) {
  if (!el) return null;
  return el.animate(keyframes, { duration: 400, easing: SPRING, ...options, ...(reducedMotion() ? { duration: 1, delay: 0 } : {}) });
}

// 안드로이드 짧은 진동. 사용자가 한 번이라도 누른 뒤에만 (브라우저 규칙)
export function buzz(pattern: number | number[] = 10) {
  if (typeof navigator === "undefined") return;
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activation?.hasBeenActive) navigator.vibrate?.(pattern);
}

const STAR = '<path d="M12 1 L14 10 L23 12 L14 14 L12 23 L10 14 L1 12 L10 10 Z" stroke="#161616" stroke-width="1.6" stroke-linejoin="round"/>';
const HEART = '<path d="M12 21 C5 15 1 11 1 6.5 A5 5 0 0 1 12 4.5 A5 5 0 0 1 23 6.5 C23 11 19 15 12 21 Z" stroke="#161616" stroke-width="1.8"/>';
const PIECES = [
  [HEART, "#ff6fb5"],
  [STAR, "#ffe15c"],
  [STAR, "#7cc8ff"],
  [STAR, "#cff23a"],
  [HEART, "#c9b6ff"],
] as const;

// 하트·별이 터진다. 감정 순간(추가요·앵콜·완료)에만 쓴다
export function confetti(x: number, y: number, count = 18, spread = 1, container: HTMLElement = document.body) {
  if (reducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const [shape, fill] = PIECES[i % PIECES.length];
    const piece = document.createElement("div");
    piece.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="${fill}">${shape}</svg>`;
    Object.assign(piece.style, { position: "fixed", left: `${x}px`, top: `${y}px`, zIndex: "80", pointerEvents: "none" });
    container.appendChild(piece);
    const angle = Math.random() * Math.PI * 2;
    const speed = (60 + Math.random() * 120) * spread;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 60;
    const rot = (Math.random() - 0.5) * 540;
    piece.animate(
      [
        { transform: "translate(-50%,-50%) scale(.2)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${dx * 1.3}px), calc(-50% + ${dy + 180}px)) scale(.8) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.4,1)" },
    ).onfinish = () => piece.remove();
  }
}

export function centerOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
