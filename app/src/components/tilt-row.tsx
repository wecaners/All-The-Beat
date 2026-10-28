"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { reducedMotion } from "./motion";

// 가로로 넘기는 포토카드 줄. 가운데에서 멀어질수록 카드가 더 기울고 살짝 내려간다 (design.md 인터랙션 "포토카드 기울기").
// 카드 자체 기울기(transform)와 겹치지 않게 li의 rotate·translate 속성만 바꾼다
export function TiltRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const row = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = row.current;
    if (!el || reducedMotion()) return;
    let frame = 0;
    const tilt = () => {
      frame = 0;
      const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
      for (const item of Array.from(el.children) as HTMLElement[]) {
        const r = item.getBoundingClientRect();
        const off = Math.max(-1, Math.min(1, (r.left + r.width / 2 - mid) / el.clientWidth));
        item.style.rotate = `${(off * 6).toFixed(2)}deg`;
        item.style.translate = `0 ${(Math.abs(off) * 8).toFixed(1)}px`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(tilt);
    };
    tilt();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <ul ref={row} className={className}>
      {children}
    </ul>
  );
}
