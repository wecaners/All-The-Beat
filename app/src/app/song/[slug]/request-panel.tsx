"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Celebration } from "@/components/celebration";
import { ChoiceChip, InfoChip } from "@/components/chip";
import { play } from "@/components/motion";
import { StarBurst } from "@/components/star-burst";
import { StickerButton } from "@/components/sticker-button";
import { Toast } from "@/components/toast";
import { startKakaoLogin } from "@/lib/auth/kakao-login";
import { TIME_PREF_LABEL } from "@/lib/format";
import type { Region } from "@/server/regions";
import type { MyRequest, RequestSummary } from "@/server/requests";
import { cancelRequestAction, type RequestActionState, saveRequestAction } from "./actions";

type Props = {
  songId: number;
  songTitle: string;
  summary: RequestSummary;
  loggedIn: boolean;
  myRequest: MyRequest | null;
  regions: Region[];
};

// 로그인 후 돌아왔을 때 시트를 자동으로 여는 신호 (04 IA: ?request=open)
const AUTO_OPEN_PARAM = "request";

export function RequestPanel({ songId, songTitle, summary, loggedIn, myRequest, regions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const autoOpen = useSearchParams().get(AUTO_OPEN_PARAM) === "open";
  const active = myRequest && myRequest.status !== "canceled" ? myRequest : null;

  const [sheet, setSheet] = useState<"none" | "login" | "request" | "cancel">(() => (autoOpen && loggedIn ? "request" : "none"));
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [canceling, startCancel] = useTransition();
  const numRef = useRef<HTMLDivElement>(null);
  const prevTotal = useRef(summary.total);

  // 자동 오픈 신호는 한 번 쓰고 주소에서 지운다 (새로고침·공유 때 다시 열리지 않게)
  useEffect(() => {
    if (autoOpen) router.replace(pathname, { scroll: false });
  }, [autoOpen, pathname, router]);

  // 기다리는 수가 늘면 숫자가 통 튄다
  useEffect(() => {
    if (summary.total > prevTotal.current) {
      play(numRef.current, [{ transform: "scale(1)" }, { transform: "scale(1.25) rotate(-4deg)" }, { transform: "scale(1)" }], { duration: 500 });
    }
    prevTotal.current = summary.total;
  }, [summary.total]);

  const closeSheet = useCallback(() => setSheet("none"), []);
  const clearToast = useCallback(() => setToast(null), []);

  const [state, formAction, saving] = useActionState(
    async (prev: RequestActionState, formData: FormData) => {
      const result = await saveRequestAction(songId, prev, formData);
      if (result.ok) {
        setSheet("none");
        if (result.isNew && result.position) setCelebrate(result.position);
        else setToast("추가요를 수정했어요");
      }
      return result;
    },
    { ok: false },
  );

  function onCancel() {
    startCancel(async () => {
      const result = await cancelRequestAction(songId);
      setSheet("none");
      setToast(result.ok ? "추가요를 취소했어요" : (result.error ?? "취소하지 못했어요"));
    });
  }

  // 내가 남긴 추가요 요약: "홍대·합정 · 주말 낮"
  const myChoice = active
    ? [
        active.regionId === null ? "어디든 좋아요" : (regions.find((r) => r.id === active.regionId)?.shortName ?? ""),
        active.timePref === "any" ? null : TIME_PREF_LABEL[active.timePref],
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section className="relative mt-7 rounded-3xl border-2 border-ink bg-pink p-[18px] shadow-sticker-lg">
      <div className="absolute -top-8 right-2 origin-[60%_70%] animate-sway">
        <StarBurst size={92}>추가요!</StarBurst>
      </div>

      {summary.total > 0 ? (
        <>
          <div ref={numRef} className="inline-block font-display text-[56px] leading-none text-white text-sticker">
            {summary.total}
            <small className="text-[26px]">명</small>
          </div>
          <p className="mt-1.5 text-base font-black">이 곡 클래스를 기다리고 있어요</p>
        </>
      ) : (
        <p className="pr-20 font-display text-[26px] leading-tight text-white text-sticker">첫 추가요를 남겨 주세요!</p>
      )}

      {summary.topRegions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.topRegions.map((r) => (
            <InfoChip key={r.name}>
              {r.name} {r.count}
            </InfoChip>
          ))}
        </div>
      )}

      {active ? (
        <>
          {/* 내 추가요: 고무 도장 + 내가 고른 것 */}
          <div className="mt-3.5 flex items-center gap-3 rounded-2xl border-2 border-ink bg-card p-3">
            <DoneStamp />
            <div className="min-w-0">
              <p className="text-[15px] font-black">{active.status === "opened" ? "추가요한 곡의 클래스가 열렸어요" : "나도 기다리는 중이에요"}</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-sub">{myChoice}</p>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-[1fr_96px] gap-2">
            <StickerButton variant="white" size="md" onClick={() => setSheet("request")}>
              수정하기
            </StickerButton>
            <StickerButton variant="soft" size="md" onClick={() => setSheet("cancel")}>
              취소
            </StickerButton>
          </div>
        </>
      ) : (
        <StickerButton variant="lime" className="mt-3.5" onClick={() => setSheet(loggedIn ? "request" : "login")}>
          나도 추가요!
        </StickerButton>
      )}

      <BottomSheet open={sheet === "cancel"} onClose={closeSheet} label="추가요 취소">
        <h3 className="font-display text-[26px]">추가요를 취소할까요?</h3>
        <p className="mt-1.5 text-sm font-semibold text-sub">기다리는 사람 수에서 빠져요. 언제든 다시 추가요할 수 있어요.</p>
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
        <h3 className="font-display text-[28px]">로그인하고 추가요!</h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">카카오로 3초면 끝나요. 로그인 후 이 화면으로 돌아와요.</p>
        {/* 카톡 앱으로 넘어가면 자동으로 안 돌아온다 (spike-01 발견) */}
        <p className="mt-4 rounded-2xl border-2 border-ink bg-butter p-3 text-[13px] font-bold leading-relaxed">
          카카오톡이 열리면 확인을 누른 뒤, 화면 <b>왼쪽 위 ◀</b>를 눌러 돌아와 주세요
        </p>
        <StickerButton variant="kakao" display={false} className="mt-5" onClick={() => startKakaoLogin(`${pathname}?${AUTO_OPEN_PARAM}=open`)}>
          카카오로 시작하기
        </StickerButton>
      </BottomSheet>

      <BottomSheet open={sheet === "request"} onClose={closeSheet} label={`${songTitle} 추가요`}>
        <h3 className="font-display text-[30px]">
          {songTitle} <span className="mark-lime">추가요!</span>
        </h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">누가 요청했는지는 다른 사람에게 보이지 않아요</p>

        <form action={formAction} className="mt-2">
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-black">어디서 배우고 싶어요?</legend>
            <div className="flex flex-wrap gap-[7px]">
              <ChoiceChip name="regionId" value="any" label="어디든 좋아요" defaultChecked={active?.regionId === null} />
              {regions.map((r) => (
                <ChoiceChip key={r.id} name="regionId" value={String(r.id)} label={r.shortName} defaultChecked={active?.regionId === r.id} />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-black">
              언제가 좋아요? <small className="font-semibold text-sub">(선택)</small>
            </legend>
            <div className="flex flex-wrap gap-[7px]">
              {Object.entries(TIME_PREF_LABEL).map(([value, label]) => (
                <ChoiceChip key={value} name="timePref" value={value} label={label} defaultChecked={(active?.timePref ?? "any") === value} />
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
              defaultValue={active?.message ?? ""}
              placeholder="킬링파트만이라도!"
              className="mt-2 w-full resize-none rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-sticker-pink"
            />
          </label>

          {state.error && <p className="mt-2 text-sm font-bold text-[#d6246e]">{state.error}</p>}

          <StickerButton variant="pink" disabled={saving} className="mt-4">
            {saving ? "붙이는 중…" : active ? "수정하기" : "추가요!"}
          </StickerButton>
        </form>
      </BottomSheet>

      {celebrate !== null && <Celebration position={celebrate} songTitle={songTitle} onClose={() => setCelebrate(null)} />}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </section>
  );
}

// 고무 도장: 이중 테두리 원 안에 "완료"
function DoneStamp() {
  return (
    <span aria-hidden className="grid h-[54px] w-[54px] flex-none -rotate-12 place-items-center rounded-full border-2 border-ink bg-lime shadow-sticker-sm">
      <span className="grid h-[44px] w-[44px] place-items-center rounded-full border-[1.5px] border-dashed border-ink font-display text-[15px] leading-none">완료</span>
    </span>
  );
}
