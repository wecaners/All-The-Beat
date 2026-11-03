"use client";

import { useCallback, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Calendar } from "@/components/calendar";

// 30분 단위 06:00 ~ 23:30 (F-12)
export const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

export const pickChip = (on: boolean, extra = "") =>
  `press inline-flex items-center justify-center rounded-2xl border-2 border-ink px-3 py-2.5 text-[15px] font-extrabold shadow-sticker-sm ${on ? "bg-pink text-white" : "bg-card"} ${extra}`;

// 시간 고르기: 다이어리 톤의 시간 칩 시트. 기본 <select>는 톤에서 튄다 (specs/class-list Learnings)
export function TimeField({ name, label, value, onChange, min }: { name: string; label: string; value: string; onChange: (v: string) => void; min?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="min-w-0 flex-1">
      <span className="block text-sm font-black">{label}</span>
      <input type="hidden" name={name} value={value} />
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={`mt-2 w-full ${pickChip(!!value)} font-display text-[18px]`}>
        {value || "--:--"}
      </button>
      <BottomSheet open={open} onClose={close} label={label}>
        <h3 className="font-display text-[26px]">{label}</h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">30분 단위로 골라요</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {TIMES.map((t) => {
            const disabled = !!min && t <= min;
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                aria-pressed={t === value}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`rounded-xl border-2 py-2 font-display text-[16px] ${t === value ? "border-ink bg-pink text-white shadow-sticker-sm" : disabled ? "border-transparent text-ink/25" : "border-ink/20 bg-card hover:border-ink"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}

// 날짜 고르기: 달력 시트 (클래스 목록과 같은 부품)
export function DateField({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const label = value ? `${Number(value.slice(5, 7))}월 ${Number(value.slice(8, 10))}일` : "날짜 고르기";
  return (
    <div>
      <span className="block text-sm font-black">날짜</span>
      <input type="hidden" name="date" value={value ?? ""} />
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={`mt-2 w-full ${pickChip(!!value)} font-display text-[18px]`}>
        {label}
      </button>
      <BottomSheet open={open} onClose={close} label="날짜 고르기">
        <h3 className="font-display text-[26px]">
          언제 <span className="mark-lime">열어요?</span>
        </h3>
        <div className="mt-4">
          <Calendar
            value={value}
            onPick={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
