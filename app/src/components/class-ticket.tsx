"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { formatTicketDate } from "@/lib/format";
import { play, reducedMotion } from "./motion";
import { StickerLabel } from "./sticker-label";

const STUB = ["bg-pink-soft", "bg-[#ddf0ff]", "bg-[#fff2b8]", "bg-[#ede6ff]"];

type Props = {
  href: string;
  title: string;
  startsAt: Date;
  /** "14:00 · 홍대·합정" */
  meta: string;
  /** "30,000원 · 입문" */
  detail: string;
  thumbnailUrl?: string | null;
  badge?: string | null;
  index?: number;
};

// 티켓 찢기 (design.md 인터랙션): 0.35초 안에 끝내고 이동한다. 흔들림 0.09초 + 날짜 조각이 떨어지는 0.26초.
// 진동은 감정 순간에만 쓰는 규칙이라 넣지 않는다
const SHAKE_MS = 90;
const TEAR_MS = 260;

// 클래스 = 날짜가 크게 찍힌 절취선 티켓. 날짜가 먼저 읽힌다. 누르면 절취선에서 찢기며 상세로 간다
export function ClassTicket({ href, title, startsAt, meta, detail, thumbnailUrl, badge, index = 0 }: Props) {
  const d = formatTicketDate(startsAt);
  const router = useRouter();
  const ticket = useRef<HTMLAnchorElement>(null);
  const stub = useRef<HTMLDivElement>(null);
  const tearing = useRef(false);

  // 뒤로 와서 화면이 다시 보일 때 찢긴 모양이 남지 않게 되돌린다
  useEffect(() => {
    const t = ticket.current;
    const s = stub.current;
    return () => {
      tearing.current = false;
      t?.getAnimations().forEach((a) => a.cancel());
      s?.getAnimations().forEach((a) => a.cancel());
    };
  }, []);

  async function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // 새 탭·새 창으로 여는 클릭은 브라우저에 맡긴다. 동작 줄이기면 바로 이동한다
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reducedMotion()) return;
    e.preventDefault();
    if (tearing.current) return;
    tearing.current = true;
    try {
      await play(ticket.current, [{ transform: "none" }, { transform: "translateX(-3px) rotate(-1deg)" }, { transform: "translateX(3px) rotate(1deg)" }, { transform: "none" }], {
        duration: SHAKE_MS,
        easing: "linear",
      })?.finished;
      await play(stub.current, [{ transform: "none", opacity: 1 }, { transform: "translate(-24px, 56px) rotate(-32deg)", opacity: 0 }], {
        duration: TEAR_MS,
        easing: "cubic-bezier(.5,0,.75,0)",
        fill: "forwards",
      })?.finished;
    } catch {
      // 화면을 떠나며 애니메이션이 취소됐다
      tearing.current = false;
      return;
    }
    router.push(href);
  }

  return (
    <Link
      ref={ticket}
      href={href}
      onClick={onClick}
      className="press sticker-edge relative flex rounded-2xl bg-card before:absolute before:-top-[9px] before:left-[69px] before:z-[2] before:h-4 before:w-4 before:rounded-full before:border-2 before:border-ink before:bg-paper before:[clip-path:inset(50%_0_0_0)] after:absolute after:-bottom-[9px] after:left-[69px] after:z-[2] after:h-4 after:w-4 after:rounded-full after:border-2 after:border-ink after:bg-paper after:[clip-path:inset(0_0_50%_0)]"
    >
      <div ref={stub} className={`flex w-[78px] flex-none flex-col items-center justify-center rounded-l-[14px] border-r-2 border-dashed border-ink ${STUB[index % STUB.length]}`}>
        <span className="font-zine text-[11px] font-extrabold uppercase">{d.month}</span>
        <span className="font-display text-[34px] leading-none">{d.day}</span>
        <span className="text-[11px] font-extrabold">{d.weekday}요일</span>
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3 pl-3.5">
        <h5 className="truncate text-[15px] font-extrabold tracking-tight">{title}</h5>
        <p className="mt-0.5 text-[13px] font-semibold text-sub">{meta}</p>
        <p className="mt-1.5 text-sm font-black">
          {detail}
          {badge && <StickerLabel tone="butter" tilt={0} className="ml-1.5 align-[1px]">{badge}</StickerLabel>}
        </p>
      </div>
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- YouTube 썸네일
        <img src={thumbnailUrl} alt="" className="m-2.5 ml-0 h-16 w-16 flex-none self-center rounded-xl border-2 border-ink object-cover" />
      )}
    </Link>
  );
}
