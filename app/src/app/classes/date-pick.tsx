"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

// 날짜 직접 고르기: 브라우저 기본 날짜 입력. 고르면 주소의 date를 바꾼다 (FR-7). 달력 UI는 만들지 않는다 (README)
export function DatePick({ value, search, chipClass }: { value: string | null; search: string; chipClass: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  function go(date: string) {
    const p = new URLSearchParams(search);
    if (date) p.set("date", date);
    else p.delete("date");
    const s = p.toString();
    router.push(s ? `/classes?${s}` : "/classes", { scroll: false });
  }

  const label = value ? `${Number(value.slice(5, 7))}월 ${Number(value.slice(8, 10))}일` : "날짜 고르기";
  return (
    <span className="relative inline-block flex-none">
      <button
        type="button"
        aria-haspopup="dialog"
        className={chipClass}
        onClick={() => {
          try {
            input.current?.showPicker();
          } catch {
            input.current?.focus();
          }
        }}
      >
        {label} ▾
      </button>
      <input
        ref={input}
        type="date"
        aria-label="날짜 직접 고르기"
        min={today}
        value={value ?? ""}
        onChange={(e) => go(e.target.value)}
        className="absolute inset-0 -z-10 h-full w-full opacity-0"
        tabIndex={-1}
      />
    </span>
  );
}
