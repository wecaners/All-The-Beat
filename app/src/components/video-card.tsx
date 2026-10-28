"use client";

import { useRef, useState } from "react";
import { reducedMotion } from "./motion";
import { Tape } from "./tape";

type Props = {
  videoId: string;
  title: string;
  /** 포토카드 아래 팬진 라벨 (예: "DANCE PRACTICE", "LE SSERAFIM OFFICIAL") */
  leftLabel: string;
  rightLabel?: string;
};

// 안무 영상 포토카드. 누르기 전에는 썸네일만 (플레이어는 무거워서 누를 때 부른다, FR-3).
// 손가락·마우스를 따라 기울고 홀로그램 빛이 흐른다 (K-pop 홀로 포카)
export function VideoCard({ videoId, title, leftLabel, rightLabel }: Props) {
  const [playing, setPlaying] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent) {
    if (playing || reducedMotion() || !card.current || !sheen.current) return;
    const r = card.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.current.style.transform = `rotate(-1.4deg) rotateY(${px * 16}deg) rotateX(${-py * 12}deg) scale(1.02)`;
    sheen.current.style.opacity = "1";
    sheen.current.style.backgroundPosition = `${50 + px * 120}% ${50 + py * 120}%`;
  }
  function onLeave() {
    if (card.current) card.current.style.transform = "";
    if (sheen.current) sheen.current.style.opacity = "0";
  }

  return (
    <div className="[perspective:800px]">
      <div
        ref={card}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative rotate-[-1.4deg] rounded-[26px] border-2 border-ink bg-card p-[9px] pb-3.5 shadow-sticker-lg transition-transform duration-300 ease-[var(--ease-snap)] [transform-style:preserve-3d] touch-pan-y"
      >
        <Tape className="left-1/2 -top-3 -ml-[39px] rotate-3" />
        <div className="relative aspect-video overflow-hidden rounded-[18px] border-2 border-ink bg-ink">
          {playing ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label={`${title} 재생`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- YouTube 썸네일은 외부 이미지라 그대로 쓴다 */}
              <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-1/2 top-1/2 grid h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink bg-lime shadow-sticker-sm animate-breathe group-active:scale-90">
                <span className="ml-1 border-y-[10px] border-l-[17px] border-y-transparent border-l-ink" />
              </span>
            </button>
          )}
          <div
            ref={sheen}
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-color-dodge transition-opacity duration-300 [background-size:250%_250%] [background-image:linear-gradient(115deg,transparent_20%,rgba(255,111,181,.55)_35%,rgba(124,200,255,.55)_45%,rgba(207,242,58,.55)_55%,transparent_70%)]"
          />
        </div>
        <div className="flex items-center justify-between px-1 pt-2.5 font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">
          <span>▶ {leftLabel}</span>
          {rightLabel && <span>{rightLabel}</span>}
        </div>
      </div>
    </div>
  );
}
