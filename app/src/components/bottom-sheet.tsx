"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { play } from "./motion";

// 바텀시트: 튕기며 올라오고, 바깥을 누르거나 Esc로 닫는다
export function BottomSheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const sheet = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    play(sheet.current, [{ transform: "translateY(105%)" }, { transform: "translateY(0)" }], { duration: 520, easing: "cubic-bezier(.34,1.3,.64,1)" });
    play(dim.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div ref={dim} className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="bg-paper relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-t-2 border-ink px-5 pt-3 pb-8"
      >
        <div className="mx-auto mb-3.5 h-1.5 w-11 rounded-full bg-ink" />
        {children}
      </div>
    </div>
  );
}
