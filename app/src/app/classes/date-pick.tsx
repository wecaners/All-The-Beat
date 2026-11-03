"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Calendar } from "@/components/calendar";
import { StickerButton } from "@/components/sticker-button";

// 날짜 직접 고르기: 다이어리 달력 시트. 고르면 주소의 date를 바꾸고 시트를 닫는다 (FR-7)
export function DatePick({ value, search, chipClass }: { value: string | null; search: string; chipClass: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  function go(date: string | null) {
    const p = new URLSearchParams(search);
    if (date) p.set("date", date);
    else p.delete("date");
    const s = p.toString();
    setOpen(false);
    router.push(s ? `/classes?${s}` : "/classes", { scroll: false });
  }

  const label = value ? `${Number(value.slice(5, 7))}월 ${Number(value.slice(8, 10))}일` : "날짜 고르기";
  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-pressed={!!value} className={chipClass} onClick={() => setOpen(true)}>
        {label} ▾
      </button>
      <BottomSheet open={open} onClose={close} label="날짜 고르기">
        <h3 className="font-display text-[26px]">
          언제 <span className="mark-lime">갈 수 있어요?</span>
        </h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">그날 시작하는 클래스만 보여요</p>
        <div className="mt-4">
          <Calendar value={value} onPick={go} />
        </div>
        {value && (
          <StickerButton variant="soft" size="md" display={false} className="mt-5" onClick={() => go(null)}>
            날짜 조건 지우기
          </StickerButton>
        )}
      </BottomSheet>
    </>
  );
}
