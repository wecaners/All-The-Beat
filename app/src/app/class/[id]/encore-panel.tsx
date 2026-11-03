"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type RefObject, useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/chip";
import { Lightstick } from "@/components/lightstick";
import { buzz, centerOf, confetti, play, reducedMotion } from "@/components/motion";
import { StickerButton, stickerButtonClass } from "@/components/sticker-button";
import { Toast } from "@/components/toast";
import { startKakaoLogin } from "@/lib/auth/kakao-login";
import { TIME_PREF_LABEL } from "@/lib/format";
import { consentPath } from "@/lib/consent-path";
import type { EncoreStatus, EncoreSummary, MyEncore } from "@/server/encores";
import { cancelEncoreAction, type EncoreActionState, saveEncoreAction } from "./actions";

type Props = {
  classId: number;
  classTitle: string;
  classStatus: "closed" | "ended";
  summary: EncoreSummary;
  loggedIn: boolean;
  mine: MyEncore | null;
  mainSongSlug: string | null;
};

// 로그인 후 돌아왔을 때 앵콜 시트를 자동으로 여는 신호 (추가요의 ?request=open과 같은 방식)
const AUTO_OPEN_PARAM = "encore";
const CROWD = 7;

const ACCEPTING: EncoreStatus[] = ["collecting", "delivered", "reviewing"];

// 클래스 상세의 앵콜 (F-24). 진행 카드와 하단 막대를 함께 그린다.
// 상태 문구는 실제로 일어난 일만: "검토 중"은 강사가 답한 뒤에만 서버가 준다 (원칙 6)
export function EncorePanel({ classId, classTitle, classStatus, summary, loggedIn, mine, mainSongSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const autoOpen = useSearchParams().get(AUTO_OPEN_PARAM) === "open";
  const accepting = ACCEPTING.includes(summary.status);

  const [sheet, setSheet] = useState<"none" | "login" | "encore" | "cancel">(() => (autoOpen && loggedIn && accepting ? "encore" : "none"));
  const [toast, setToast] = useState<string | null>(null);
  const [cheering, setCheering] = useState(false);
  const [canceling, startCancel] = useTransition();
  const stickRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const crowdRef = useRef<HTMLDivElement>(null);

  // 자동 오픈 신호는 한 번 쓰고 주소에서 지운다 (새로고침·공유 때 다시 열리지 않게)
  useEffect(() => {
    if (autoOpen) router.replace(pathname, { scroll: false });
  }, [autoOpen, pathname, router]);

  // 앵콜 응원봉: 내 응원봉이 흔들리고, 아래에서 관객 응원봉이 올라왔다 내려가고, 숫자가 튄다 (시안 round-3, 감정 순간)
  useEffect(() => {
    if (!cheering) return;
    buzz([10, 30, 10, 30, 10]);
    play(
      stickRef.current,
      [{ transform: "rotate(0)" }, { transform: "rotate(-28deg)" }, { transform: "rotate(24deg)" }, { transform: "rotate(-20deg)" }, { transform: "rotate(14deg)" }, { transform: "rotate(0)" }],
      { duration: 900, easing: "ease-in-out" },
    );
    play(numRef.current, [{ transform: "scale(1)" }, { transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 450 });
    if (stickRef.current) {
      const { x, y } = centerOf(stickRef.current);
      confetti(x, y - 20, 12, 0.7);
    }
    const sticks = Array.from(crowdRef.current?.children ?? []);
    const animations = sticks.map((s, i) =>
      play(
        s,
        [
          { transform: "translateY(90px) rotate(0)" },
          { transform: "translateY(0) rotate(-20deg)", offset: 0.3 },
          { transform: "translateY(0) rotate(18deg)", offset: 0.55 },
          { transform: "translateY(0) rotate(-14deg)", offset: 0.8 },
          { transform: "translateY(90px) rotate(0)" },
        ],
        { duration: 1400, delay: i * 60, easing: "ease-in-out", fill: "both" },
      ),
    );
    const t = setTimeout(() => setCheering(false), reducedMotion() ? 0 : 1400 + CROWD * 60);
    return () => {
      clearTimeout(t);
      animations.forEach((a) => a?.cancel());
    };
  }, [cheering]);

  const closeSheet = useCallback(() => setSheet("none"), []);
  const clearToast = useCallback(() => setToast(null), []);

  const [state, formAction, saving] = useActionState(
    async (prev: EncoreActionState, formData: FormData) => {
      const result = await saveEncoreAction(classId, prev, formData);
      // 약관 동의 전이면 동의 화면으로. 동의하면 이 화면으로 돌아와 시트가 다시 열린다
      if (result.consentRequired) router.push(consentPath(`${pathname}?${AUTO_OPEN_PARAM}=open`));
      if (result.ok) {
        setSheet("none");
        if (result.isNew) setCheering(true);
        setToast(result.delivered ? "기준 인원이 모여 강사님께 전달됐어요!" : result.isNew ? "앵콜했어요!" : "앵콜을 수정했어요");
      }
      return result;
    },
    { ok: false },
  );

  function onCancel() {
    startCancel(async () => {
      const result = await cancelEncoreAction(classId);
      setSheet("none");
      setToast(result.ok ? "앵콜을 취소했어요" : (result.error ?? "취소하지 못했어요"));
    });
  }

  const left = Math.max(0, summary.threshold - summary.count);
  const progress = Math.min(1, summary.count / summary.threshold);
  const handedOver = summary.status === "delivered" || summary.status === "reviewing";

  return (
    <>
      <section className="relative mt-7 rounded-3xl border-2 border-ink bg-pink p-[18px] shadow-sticker-lg" aria-label="앵콜">
        <div ref={stickRef} className="absolute -top-6 right-3 origin-[50%_95%]">
          <div className="animate-sway">
            <Lightstick size={44} />
          </div>
        </div>
        <EncoreHeadline summary={summary} left={left} numRef={numRef} />

        {/* 진행 정도: 모으는 중이면 기준까지, 전달된 뒤에는 가득 */}
        {accepting && (
          <div
            role="progressbar"
            aria-label="앵콜 진행"
            aria-valuemin={0}
            aria-valuemax={summary.threshold}
            aria-valuenow={Math.min(summary.count, summary.threshold)}
            className="mt-3.5 h-[18px] overflow-hidden rounded-full border-2 border-ink bg-card"
          >
            <div
              className="h-full border-r-2 border-ink bg-lime transition-[width] duration-500"
              style={{ width: `${(handedOver ? 1 : progress) * 100}%`, borderRightWidth: progress === 0 && !handedOver ? 0 : undefined }}
            />
          </div>
        )}

        {mine && (
          <div className="mt-3.5 flex items-center gap-3 rounded-2xl border-2 border-ink bg-card p-3">
            <EncoreStamp />
            <div className="min-w-0">
              <p className="text-[15px] font-black">{summary.status === "opened" ? "앵콜한 클래스가 다시 열렸어요" : "나도 앵콜했어요"}</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-sub">
                {mine.timePref === "any" ? "시간은 상관없어요" : TIME_PREF_LABEL[mine.timePref]}
              </p>
            </div>
          </div>
        )}
        {mine && accepting && (
          <div className="mt-2.5 grid grid-cols-[1fr_96px] gap-2">
            <StickerButton variant="white" size="md" onClick={() => setSheet("encore")}>
              수정하기
            </StickerButton>
            <StickerButton variant="soft" size="md" onClick={() => setSheet("cancel")}>
              취소
            </StickerButton>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-md px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
          <p className="text-center font-display text-[22px]">{classStatus === "closed" ? "마감됐어요" : "끝난 클래스예요"}</p>
          <div className="mt-2 flex gap-2.5">
            {mainSongSlug && (
              <Link href={`/song/${mainSongSlug}`} className={stickerButtonClass({ variant: "white", size: "md", display: false })}>
                같은 곡 다른 클래스
              </Link>
            )}
            {accepting && !mine && (
              <StickerButton variant="pink" size="md" onClick={() => setSheet(loggedIn ? "encore" : "login")}>
                앵콜!
              </StickerButton>
            )}
            {summary.status === "opened" && summary.encoreClassId && (
              <Link href={`/class/${summary.encoreClassId}`} className={stickerButtonClass({ variant: "lime", size: "md" })}>
                앵콜 클래스 보기
              </Link>
            )}
            {(summary.status === "declined" || summary.status === "expired") && mainSongSlug && (
              <Link href={`/song/${mainSongSlug}?request=open`} className={stickerButtonClass({ variant: "pink", size: "md" })}>
                이 곡 추가요!
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 관객 응원봉: 앵콜하는 순간에만 화면 아래에서 올라온다 */}
      {cheering && (
        <div ref={crowdRef} aria-hidden className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center gap-2">
          {Array.from({ length: CROWD }, (_, i) => (
            <Lightstick key={i} size={22} glow style={{ transformOrigin: "50% 95%", transform: "translateY(90px)" }} />
          ))}
        </div>
      )}

      <BottomSheet open={sheet === "cancel"} onClose={closeSheet} label="앵콜 취소">
        <h3 className="font-display text-[26px]">앵콜을 취소할까요?</h3>
        <p className="mt-1.5 text-sm font-semibold text-sub">
          {handedOver ? "취소하면 강사님이 보는 앵콜 인원에서 빠져요." : "앵콜 인원에서 빠져요."}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <StickerButton variant="white" size="md" onClick={closeSheet}>
            그대로 둘게요
          </StickerButton>
          <StickerButton variant="soft" size="md" onClick={onCancel} disabled={canceling}>
            {canceling ? "취소하는 중…" : "취소할게요"}
          </StickerButton>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "login"} onClose={closeSheet} label="로그인">
        <h3 className="font-display text-[28px]">로그인하고 앵콜!</h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">카카오로 3초면 끝나요. 로그인 후 이 화면으로 돌아와요.</p>
        {/* 카톡 앱으로 넘어가면 자동으로 안 돌아온다 (spike-01 발견) */}
        <p className="mt-4 rounded-2xl border-2 border-ink bg-butter p-3 text-[13px] font-bold leading-relaxed">
          카카오톡이 열리면 확인을 누른 뒤, 화면 <b>왼쪽 위 ◀</b>를 눌러 돌아와 주세요
        </p>
        <StickerButton variant="kakao" display={false} className="mt-5" onClick={() => startKakaoLogin(`${pathname}?${AUTO_OPEN_PARAM}=open`)}>
          카카오로 시작하기
        </StickerButton>
      </BottomSheet>

      <BottomSheet open={sheet === "encore"} onClose={closeSheet} label={`${classTitle} 앵콜`}>
        <h3 className="font-display text-[30px]">
          한 번 더 <span className="mark-lime">앵콜!</span>
        </h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">앵콜은 예약이 아니라 관심 표시예요. 누가 앵콜했는지는 다른 사람에게 보이지 않아요</p>

        <form action={formAction} className="mt-2">
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-black">
              언제가 좋아요? <small className="font-semibold text-sub">(선택)</small>
            </legend>
            <div className="flex flex-wrap gap-[7px]">
              {Object.entries(TIME_PREF_LABEL).map(([value, label]) => (
                <ChoiceChip key={value} name="timePref" value={value} label={label} defaultChecked={(mine?.timePref ?? "any") === value} />
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block">
            <span className="text-sm font-black">
              강사님께 한마디 <small className="font-semibold text-sub">(선택)</small>
            </span>
            <textarea
              name="message"
              maxLength={100}
              rows={2}
              defaultValue={mine?.message ?? ""}
              placeholder="놓쳐서 너무 아쉬웠어요!"
              className="mt-2 w-full resize-none rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-sticker-pink"
            />
          </label>

          {state.error && <p className="mt-2 text-sm font-bold text-[#d6246e]">{state.error}</p>}

          <StickerButton variant="pink" disabled={saving} className="mt-4">
            {saving ? "보내는 중…" : mine ? "수정하기" : "앵콜!"}
          </StickerButton>
        </form>
      </BottomSheet>

      {toast && <Toast message={toast} onDone={clearToast} />}
    </>
  );
}

// 상태별 큰 문구. 인원은 언제나 지금 실제 인원 (F-24)
function EncoreHeadline({ summary, left, numRef }: { summary: EncoreSummary; left: number; numRef: RefObject<HTMLSpanElement | null> }) {
  const count = (
    <span ref={numRef} className="inline-block font-display text-[56px] leading-none text-white text-sticker">
      {summary.count}
      <small className="text-[26px]">명</small>
    </span>
  );

  switch (summary.status) {
    case "collecting":
      return summary.count > 0 ? (
        <>
          {count}
          <p className="mt-1.5 pr-14 text-base font-black">앵콜을 기다리고 있어요</p>
          <p className="mt-0.5 text-[13px] font-bold">{left}명 더 모이면 강사님께 전달돼요</p>
        </>
      ) : (
        <>
          <p className="pr-16 font-display text-[26px] leading-tight text-white text-sticker">첫 앵콜을 남겨 주세요!</p>
          <p className="mt-1.5 text-[13px] font-bold">{summary.threshold}명이 모이면 강사님께 전달돼요</p>
        </>
      );
    case "delivered":
    case "reviewing":
      return (
        <>
          <p className="pr-16 font-display text-[24px] leading-tight text-white text-sticker">
            {summary.status === "delivered" ? "앵콜 요청이 강사님께 전달됐어요!" : "많은 요청으로 강사님이 앵콜을 검토 중이에요!"}
          </p>
          <p className="mt-2 text-base font-black">
            {count} <span className="align-[6px]">앵콜을 기다리고 있어요</span>
          </p>
        </>
      );
    case "opened":
      return <p className="pr-16 font-display text-[26px] leading-tight text-white text-sticker">앵콜 클래스가 열렸어요!</p>;
    case "declined":
      return (
        <>
          <p className="pr-16 font-display text-[26px] leading-tight text-white text-sticker">이번엔 앵콜이 어렵대요</p>
          <p className="mt-1.5 text-[13px] font-bold">같은 곡의 다른 클래스를 찾아보거나, 이 곡을 추가요해 주세요</p>
        </>
      );
    case "expired":
      return (
        <>
          <p className="pr-16 font-display text-[26px] leading-tight text-white text-sticker">앵콜 기간이 끝났어요</p>
          <p className="mt-1.5 text-[13px] font-bold">같은 곡의 다른 클래스를 찾아보거나, 이 곡을 추가요해 주세요</p>
        </>
      );
  }
}

// 고무 도장: 이중 테두리 원 안에 "앵콜"
function EncoreStamp() {
  return (
    <span aria-hidden className="grid h-[54px] w-[54px] flex-none -rotate-12 place-items-center rounded-full border-2 border-ink bg-lime shadow-sticker-sm">
      <span className="grid h-[44px] w-[44px] place-items-center rounded-full border-[1.5px] border-dashed border-ink font-display text-[15px] leading-none">앵콜</span>
    </span>
  );
}
