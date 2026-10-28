"use client";

import Link from "next/link";
import { play } from "./motion";

// 로고: 영문 "All the Beat" 오른쪽 위 모서리에 부르는 이름 "올빗"을 비스듬히 써 붙인다 (design/README.md, 로고 G2)
// 바깥에서 바로 들어온 사람도 누르면 홈으로 간다 (04 IA 6절). 모서리 글씨가 위로 튀어나오니 감싸는 쪽에 위 여백을 둔다
// 누르면 살짝 흔들린다 (design.md 인터랙션 "착착 붙어요"). 이동을 기다리게 하지 않는다
export function Logo() {
  return (
    <Link
      href="/"
      aria-label="올빗 All the Beat 홈"
      className="relative inline-block"
      onClick={(e) =>
        play(e.currentTarget, [
          { transform: "none" },
          { transform: "rotate(-8deg) scale(1.08)", offset: 0.2 },
          { transform: "rotate(6deg)", offset: 0.45 },
          { transform: "rotate(-3deg)", offset: 0.7 },
          { transform: "none" },
        ], { duration: 400, easing: "ease-out" })
      }
    >
      <span className="font-display text-[24px] leading-none whitespace-nowrap text-pink [-webkit-text-stroke:1px_var(--color-ink)] [text-shadow:2px_2px_0_var(--color-ink)]">
        All the Beat
      </span>
      <span
        aria-hidden
        className="absolute -top-[18px] -right-6 rotate-12 font-display text-[17px] leading-none whitespace-nowrap text-lime [-webkit-text-stroke:1px_var(--color-ink)] [text-shadow:1.5px_1.5px_0_var(--color-ink)]"
      >
        올빗
      </span>
    </Link>
  );
}
