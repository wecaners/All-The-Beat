"use client";

import { useState, useTransition } from "react";
import type { AdminActionState } from "./actions";
import { linkButtonClass } from "./ui";

// 운영 화면의 한 번 누르는 버튼 (마감하기, 검토할게요 …). confirm이 있으면 한 번 더 묻는다. 실패하면 이유를 옆에 보여준다
export function ActionButton({ label, run, confirm }: { label: string; run: () => Promise<AdminActionState>; confirm?: string }) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const result = await run();
            setError(result.ok ? null : (result.error ?? "실패했어요"));
          });
        }}
        className={`${linkButtonClass} disabled:opacity-50`}
      >
        {busy ? "…" : label}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
