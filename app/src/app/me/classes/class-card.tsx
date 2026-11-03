"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/chip";
import { StickerButton, stickerButtonClass } from "@/components/sticker-button";
import { StickerLabel } from "@/components/sticker-label";
import { formatClassDate, formatPrice, formatTimeRange, LEVEL_LABEL } from "@/lib/format";
import type { MyClassRow } from "@/server/instructors/classes";
import { cancelMyClassAction, setMyClassStatusAction } from "./actions";

const STATUS: Record<MyClassRow["status"], { text: string; tone: "lime" | "butter" | "white" }> = {
  open: { text: "모집 중", tone: "lime" },
  closing_soon: { text: "마감 임박", tone: "butter" },
  closed: { text: "마감", tone: "white" },
  ended: { text: "끝남", tone: "white" },
  canceled: { text: "취소", tone: "white" },
};

const CANCEL_REASONS = [
  { value: "low_turnout", label: "인원 미달" },
  { value: "personal", label: "개인 사정" },
  { value: "other", label: "기타" },
];

const smallBtn = (variant: "white" | "soft" | "lime") => `${stickerButtonClass({ variant, size: "md", display: false })} !h-10 !w-auto !px-3 !text-[13px]`;

// 내 클래스 한 장 (T-03a). 외부 예약이라 마감은 강사가 직접 누른다. 상태 버튼은 가장 자주 쓰는 것부터
export function MyClassCard({ c }: { c: MyClassRow }) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const closeCancel = useCallback(() => setCancelOpen(false), []);
  const [reason, setReason] = useState<string>("");
  const live = c.status !== "ended" && c.status !== "canceled";

  function change(to: "closing_soon" | "open" | "closed") {
    start(async () => {
      const r = await setMyClassStatusAction(c.id, to);
      setError(r.ok ? null : (r.error ?? "바꾸지 못했어요"));
    });
  }

  return (
    <article className={`sticker-edge rounded-2xl bg-card p-3.5 ${live ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/class/${c.id}`} className="min-w-0">
          <p className="text-[12px] font-extrabold text-sub">{formatClassDate(c.startsAt)} · {formatTimeRange(c.startsAt, c.endsAt)}</p>
          <h3 className="mt-0.5 truncate font-display text-[19px] leading-tight">{c.title}</h3>
          <p className="mt-0.5 text-[13px] font-semibold text-sub">
            {c.regionName} · {formatPrice(c.price)} · {LEVEL_LABEL[c.level]}
          </p>
        </Link>
        <StickerLabel tone={STATUS[c.status].tone} tilt={-3} className="flex-none">
          {STATUS[c.status].text}
        </StickerLabel>
      </div>
      <p className="mt-2 text-[12px] font-extrabold">
        예약 클릭 <b className="text-[14px]">{c.bookingClicks}</b>
        <span className="mx-1.5 text-sub">·</span>
        앵콜 <b className="text-[14px]">{c.encoreCount}</b>
      </p>

      {live ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {c.status === "open" && (
            <button type="button" disabled={busy} onClick={() => change("closing_soon")} className={smallBtn("white")}>
              마감 임박 표시
            </button>
          )}
          {c.status === "closing_soon" && (
            <button type="button" disabled={busy} onClick={() => change("open")} className={smallBtn("white")}>
              마감 임박 해제
            </button>
          )}
          {c.status !== "closed" ? (
            <button type="button" disabled={busy} onClick={() => change("closed")} className={smallBtn("lime")}>
              마감하기
            </button>
          ) : (
            !c.hasEncoreRound && (
              <button type="button" disabled={busy} onClick={() => change("open")} className={smallBtn("white")}>
                마감 풀기
              </button>
            )
          )}
          <Link href={`/me/classes/${c.id}/edit`} className={smallBtn("white")}>
            수정
          </Link>
          <button type="button" disabled={busy} onClick={() => setCancelOpen(true)} className={smallBtn("soft")}>
            취소
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <Link href={`/me/classes/new?copy=${c.id}`} className={smallBtn("white")}>
            복사해서 다시 열기
          </Link>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-bold text-[#d6246e]">{error}</p>}

      <BottomSheet open={cancelOpen} onClose={closeCancel} label="클래스 취소">
        <h3 className="font-display text-[26px]">클래스를 취소할까요?</h3>
        <p className="mt-1.5 text-sm font-semibold text-sub">취소하면 되돌릴 수 없어요. 수강생에게 취소로 보여요.</p>
        <div className="mt-4 flex flex-wrap gap-[7px]">
          {CANCEL_REASONS.map((r) => (
            <span key={r.value} onClick={() => setReason(r.value)}>
              <ChoiceChip name="cancelReason" value={r.value} label={r.label} />
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <StickerButton variant="white" size="md" onClick={closeCancel}>
            그대로 둘게요
          </StickerButton>
          <StickerButton
            variant="soft"
            size="md"
            disabled={busy || !reason}
            onClick={() =>
              start(async () => {
                const r = await cancelMyClassAction(c.id, reason);
                setError(r.ok ? null : (r.error ?? "취소하지 못했어요"));
                setCancelOpen(false);
              })
            }
          >
            취소할게요
          </StickerButton>
        </div>
      </BottomSheet>
    </article>
  );
}
