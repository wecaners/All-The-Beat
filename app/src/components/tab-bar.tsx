"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { play } from "./motion";

type Tab = { href: string; label: string; icon: React.ReactNode; isActive: (pathname: string) => boolean };

// 04 IA 1절: 홈 / 찾기(검색→목록) / 추가요(랭킹) / 마이. 아이콘은 round-3 시안의 집·돋보기·별·사람
const TABS: Tab[] = [
  {
    href: "/",
    label: "홈",
    isActive: (p) => p === "/",
    icon: <path d="M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />,
  },
  {
    href: "/search",
    label: "찾기",
    isActive: (p) => p.startsWith("/search") || p.startsWith("/classes"),
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/requests",
    label: "추가요",
    isActive: (p) => p.startsWith("/requests"),
    icon: (
      <path
        d="M12 2 L14.6 8.6 L21.5 9.2 L16.2 13.6 L17.9 20.5 L12 16.8 L6.1 20.5 L7.8 13.6 L2.5 9.2 L9.4 8.6 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/me",
    label: "마이",
    isActive: (p) => p.startsWith("/me"),
    icon: (
      <>
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
  },
];

// 하단 탭바 (design.md 인터랙션 "탭바 알약"): 라임 알약이 켜진 탭 아래 있고, 누르면 스프링으로 따라가며 아이콘이 뛴다.
// 이동은 Link가 하고 움직임은 기다리게 하지 않는다. 탭바가 보이는 화면(홈·목록·랭킹·마이)이 각자 붙인다.
// 감싸는 main에는 pb-32를 둬 내용 끝이 가려지지 않게 한다
export function TabBar() {
  const pathname = usePathname();
  const current = TABS.findIndex((t) => t.isActive(pathname));
  // 누른 탭은 이동이 끝나기 전까지만 켜 둔다. 경로가 바뀌면(from ≠ current) 경로가 정한다
  const [pressed, setPressed] = useState<{ index: number; from: number } | null>(null);
  const active = pressed && pressed.from === current ? pressed.index : current;

  return (
    <nav aria-label="주요 화면" className="fixed inset-x-0 bottom-0 z-40 px-3.5 pb-[max(22px,env(safe-area-inset-bottom))]">
      <div className="sticker-edge relative mx-auto grid h-[66px] max-w-md grid-cols-4 items-center rounded-3xl bg-card">
        {active >= 0 && (
          <span
            aria-hidden
            style={{ left: `calc(${(active * 2 + 1) * 12.5}% - 21px)` }}
            className="absolute top-[9px] h-[30px] w-[42px] rounded-[11px] border-2 border-ink bg-lime motion-safe:transition-[left] motion-safe:duration-[450ms] motion-safe:ease-[var(--ease-spring)]"
          />
        )}
        {TABS.map((t, i) => {
          const on = i === active;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`relative z-[1] flex flex-col items-center gap-1 pt-1 text-[11px] font-extrabold ${on ? "text-ink" : "text-sub"}`}
              onClick={(e) => {
                setPressed({ index: i, from: current });
                play(e.currentTarget.querySelector("svg"), [{ transform: "none" }, { transform: "translateY(-6px) scale(1.15)", offset: 0.4 }, { transform: "none" }], {
                  duration: 450,
                });
              }}
            >
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24">
                {t.icon}
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
