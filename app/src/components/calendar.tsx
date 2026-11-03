"use client";

import { useState } from "react";
import { play } from "./motion";

// 달력 (스크랩북 다이어리의 월간 페이지). 날짜는 KST 문자열(YYYY-MM-DD)로만 주고받는다.
// 오늘 전은 고를 수 없고, 앞으로 maxMonths 달까지 넘긴다. 고르면 도장처럼 찍힌다

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const kstToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const pad = (n: number) => String(n).padStart(2, "0");

type Props = { value: string | null; onPick: (ymd: string) => void; maxMonths?: number };

export function Calendar({ value, onPick, maxMonths = 3 }: Props) {
  const today = kstToday();
  const [ty, tm] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const start = value ?? today;
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) });

  const monthIndex = (y: number, m: number) => y * 12 + (m - 1);
  const canPrev = monthIndex(view.y, view.m) > monthIndex(ty, tm);
  const canNext = monthIndex(view.y, view.m) < monthIndex(ty, tm) + maxMonths;
  const move = (d: number) => setView(({ y, m }) => ({ y: y + Math.floor((m - 1 + d) / 12), m: ((m - 1 + d + 12) % 12) + 1 }));

  // 1일의 요일과 그 달의 날 수 (UTC로 계산해도 날짜 문자열만 쓰니 시간대가 끼어들지 않는다)
  const firstWeekday = new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div>
      <div className="flex items-center justify-between">
        <NavButton label="이전 달" disabled={!canPrev} onClick={() => move(-1)}>
          ◀
        </NavButton>
        <p className="font-display text-[26px] leading-none">
          {view.m}월 <span className="font-zine text-[12px] font-extrabold text-sub">{view.y}</span>
        </p>
        <NavButton label="다음 달" disabled={!canNext} onClick={() => move(1)}>
          ▶
        </NavButton>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-extrabold text-sub">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={i === 0 ? "text-pink" : i === 6 ? "text-[#3a8fd9]" : undefined}>
            {w}
          </span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-y-1.5">
        {cells.map((d, i) => {
          if (d === null) return <span key={`blank-${i}`} />;
          const ymd = `${view.y}-${pad(view.m)}-${pad(d)}`;
          const past = ymd < today;
          const selected = ymd === value;
          const isToday = ymd === today;
          return (
            <button
              key={ymd}
              type="button"
              disabled={past}
              aria-pressed={selected}
              aria-label={`${view.m}월 ${d}일${isToday ? " 오늘" : ""}`}
              onClick={(e) => {
                play(e.currentTarget, [{ transform: "scale(.8) rotate(-6deg)" }, { transform: "scale(1.12) rotate(3deg)" }, { transform: "none" }], { duration: 320 });
                onPick(ymd);
              }}
              className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full font-display text-[17px] leading-none ${
                selected
                  ? "border-2 border-ink bg-pink text-white shadow-sticker-sm"
                  : past
                    ? "text-ink/25"
                    : "border-2 border-transparent text-ink hover:border-ink"
              }`}
            >
              {d}
              {isToday && !selected && (
                <span aria-hidden className="absolute -bottom-1 rounded-full bg-lime px-1 font-sans text-[9px] font-black leading-[12px]">
                  오늘
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-card text-[12px] shadow-sticker-sm disabled:opacity-30 disabled:shadow-none"
    >
      {children}
    </button>
  );
}
