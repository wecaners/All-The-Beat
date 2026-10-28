"use client";

import { useEffect, useRef } from "react";
import { play } from "./motion";

// 짧은 안내. 잉크 배경 + 핑크 그림자 스티커
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const a = play(
      el.current,
      [
        { opacity: 0, transform: "translate(-50%, 20px) scale(.9)" },
        { opacity: 1, transform: "translate(-50%, 0) scale(1)", offset: 0.12 },
        { opacity: 1, transform: "translate(-50%, 0)", offset: 0.85 },
        { opacity: 0, transform: "translate(-50%, 10px)" },
      ],
      { duration: 2200, easing: "ease-out", fill: "forwards" },
    );
    const t = setTimeout(onDone, 2300);
    return () => {
      a?.cancel();
      clearTimeout(t);
    };
  }, [message, onDone]);
  return (
    <div
      ref={el}
      role="status"
      className="fixed bottom-10 left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-4 py-2.5 text-[13px] font-extrabold text-white shadow-sticker-pink"
    >
      {message}
    </div>
  );
}
