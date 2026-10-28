"use client";

import { useEffect, useRef } from "react";
import { buzz, centerOf, confetti, play } from "./motion";
import { StarBurst } from "./star-burst";
import { StickerButton } from "./sticker-button";

type Props = {
  /** 몇 번째로 기다리는지 (서버가 계산한 값, 원칙 6) */
  position: number;
  songTitle: string;
  onClose: () => void;
};

// 추가요 완료 순간: 스티커가 쾅 붙고, 화면이 살짝 흔들리고, 하트·별이 터지고, 순번이 올라간다
export function Celebration({ position, songTitle, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const slam = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLElement>(null);

  useEffect(() => {
    buzz([20, 40, 30]);
    play(root.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    const a = play(
      slam.current,
      [
        { transform: "scale(2.6) rotate(-40deg)", opacity: 0 },
        { transform: "scale(.9) rotate(-6deg)", opacity: 1, offset: 0.55 },
        { transform: "scale(1.05) rotate(-9deg)", offset: 0.8 },
        { transform: "scale(1) rotate(-8deg)" },
      ],
      { duration: 620, easing: "cubic-bezier(.2,.9,.3,1)", fill: "forwards" },
    );
    a?.finished.then(() => {
      play(document.body, [{ transform: "translate(0,0)" }, { transform: "translate(-4px,3px)" }, { transform: "translate(4px,-2px)" }, { transform: "translate(0,0)" }], { duration: 220, easing: "linear" });
      if (slam.current) {
        const { x, y } = centerOf(slam.current);
        confetti(x, y, 26, 1.2);
      }
      // 순번 카운트업
      const el = num.current;
      if (!el) return;
      const from = Math.max(1, position - 12);
      const start = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / 700);
        el.textContent = String(Math.round(from + (position - from) * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
        else play(el, [{ transform: "scale(1.5)" }, { transform: "scale(1)" }]);
      };
      requestAnimationFrame(step);
    });
  }, [position]);

  async function share() {
    const url = location.href.split("?")[0];
    const text = `${songTitle} 클래스 열어주세요! 나도 추가요 했어 🙌`;
    try {
      if (navigator.share) await navigator.share({ title: `${songTitle} 추가요! | 올빗`, text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
    } catch {
      // 공유 창을 닫은 경우
    }
  }

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label="추가요 완료" className="fixed inset-0 z-[70] flex items-center justify-center bg-paper/95 px-7">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div ref={slam} style={{ transform: "rotate(-8deg)" }}>
          <StarBurst size={210} tone="lime">
            <span className="text-[34px]">
              추가요
              <br />
              완료!
            </span>
          </StarBurst>
        </div>
        <p className="mt-7 text-[17px] font-black">
          <b ref={num} className="inline-block font-display text-[30px] font-normal text-pink [-webkit-text-stroke:1px_var(--color-ink)]">
            {position}
          </b>
          번째로 기다리는 중
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-relaxed text-sub">
          {songTitle} 클래스를 기다리는 사람이 늘수록
          <br />
          강사님 눈에 잘 띄어요
        </p>
        <div className="mt-7 flex w-full gap-2.5">
          <StickerButton variant="lime" size="md" onClick={share}>
            공유하기
          </StickerButton>
          <StickerButton variant="white" size="md" onClick={onClose} autoFocus>
            확인
          </StickerButton>
        </div>
      </div>
    </div>
  );
}
