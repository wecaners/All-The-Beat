"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Lightstick } from "@/components/lightstick";
import { stickerButtonClass } from "@/components/sticker-button";
import { formatClassDate, TIME_PREF_LABEL } from "@/lib/format";
import type { AdminEncoreDetail } from "@/server/admin/encores";
import { respondToMyEncoreAction } from "./actions";

const btn = (variant: "white" | "soft" | "lime" | "ink") => `${stickerButtonClass({ variant, size: "md", display: false })} !h-10 !w-auto !px-3 !text-[13px]`;

// 답이 필요한 앵콜 (T-03b, F-24). 검토할게요 → 앵콜 클래스 열기 / 이번엔 어려워요. 누가 남겼는지는 보이지 않는다
export function EncoreCard({ e }: { e: AdminEncoreDetail }) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const reviewing = e.status === "reviewing";

  function answer(a: "review" | "decline") {
    start(async () => {
      const r = await respondToMyEncoreAction(e.classId, a);
      setError(r.ok ? null : (r.error ?? "답하지 못했어요"));
    });
  }

  return (
    <article className="rounded-2xl border-2 border-ink bg-ink p-4 text-paper shadow-sticker-pink">
      <div className="flex items-center gap-3">
        <Lightstick size={44} glow />
        <div className="min-w-0">
          <p className="font-display text-[18px] leading-tight">{e.count}명이 앵콜했어요</p>
          <p className="truncate text-[13px] font-semibold text-paper/80">
            {e.title} · {formatClassDate(e.startsAt)}
          </p>
        </div>
      </div>
      {e.timePrefs.length > 0 && (
        <p className="mt-2.5 text-[12px] font-bold text-paper/80">
          원하는 때: {e.timePrefs.map((t) => `${TIME_PREF_LABEL[t.timePref as keyof typeof TIME_PREF_LABEL] ?? t.timePref} ${t.count}`).join(" · ")}
        </p>
      )}
      {e.messages.length > 0 && (
        <ul className="mt-2 space-y-1 text-[12px] font-semibold text-paper/90">
          {e.messages.slice(0, 3).map((m, i) => (
            <li key={i}>“{m}”</li>
          ))}
        </ul>
      )}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {reviewing ? (
          <Link href={`/me/classes/new?encoreOf=${e.classId}`} className={btn("lime")}>
            앵콜 클래스 열기
          </Link>
        ) : (
          <button type="button" disabled={busy} onClick={() => answer("review")} className={btn("lime")}>
            검토할게요
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => answer("decline")} className={btn("white")}>
          이번엔 어려워요
        </button>
      </div>
      {reviewing && <p className="mt-2 text-[12px] font-bold text-paper/80">검토 중이라고 수강생에게 보여요. 앵콜 클래스를 열면 &ldquo;열렸어요&rdquo;가 돼요.</p>}
      {error && <p className="mt-2 text-sm font-bold text-pink">{error}</p>}
    </article>
  );
}
