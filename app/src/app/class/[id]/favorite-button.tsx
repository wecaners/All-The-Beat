"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { StickerButton } from "@/components/sticker-button";
import { Toast } from "@/components/toast";
import { startKakaoLogin } from "@/lib/auth/kakao-login";
import { consentPath } from "@/lib/consent-path";
import { setFavoriteAction } from "./actions";

// 로그인·동의 뒤 돌아왔을 때 자동으로 찜하는 신호 (추가요의 ?request=open과 같은 방식)
const AUTO_PARAM = "favorite";

// 찜 토글 (F-22, specs/favorites). 켜고 끄기는 묻지 않는다. 비로그인이면 로그인 시트
export function FavoriteButton({ classId, loggedIn, initialOn }: { classId: number; loggedIn: boolean; initialOn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const auto = useSearchParams().get(AUTO_PARAM) === "1";
  const returnTo = `${pathname}?${AUTO_PARAM}=1`;

  const [on, setOn] = useState(initialOn);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const autoDone = useRef(false);
  const clearToast = useCallback(() => setToast(null), []);

  const toggle = useCallback(
    (next: boolean) => {
      start(async () => {
        const result = await setFavoriteAction(classId, next);
        if (result.consentRequired) {
          router.push(consentPath(returnTo));
          return;
        }
        if (!result.ok) {
          setToast(result.error ?? "저장하지 못했어요");
          return;
        }
        setOn(next);
        setToast(next ? "찜했어요" : "찜을 뺐어요");
      });
    },
    [classId, returnTo, router],
  );

  // 돌아온 신호는 한 번 쓰고 주소에서 지운다
  useEffect(() => {
    if (!auto || autoDone.current) return;
    autoDone.current = true;
    router.replace(pathname, { scroll: false });
    if (loggedIn && !initialOn) toggle(true);
  }, [auto, loggedIn, initialOn, pathname, router, toggle]);

  return (
    <>
      <button
        type="button"
        aria-label={on ? "찜 빼기" : "찜하기"}
        aria-pressed={on}
        disabled={pending}
        onClick={() => (loggedIn ? toggle(!on) : setSheet(true))}
        className={`press sticker-edge flex h-11 flex-none items-center gap-1.5 rounded-full px-3.5 font-display text-[16px] disabled:opacity-60 ${on ? "bg-pink text-white text-sticker" : "bg-card text-ink"}`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
          <path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8.1a4.2 4.2 0 0 1 7.5 2.4c0 5.4-7.5 10-7.5 10z" />
        </svg>
        찜
      </button>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} label="로그인">
        <h3 className="font-display text-[28px]">로그인하고 찜!</h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">카카오로 3초면 끝나요. 로그인 후 이 화면으로 돌아와 찜돼요.</p>
        {/* 카톡 앱으로 넘어가면 자동으로 안 돌아온다 (spike-01 발견) */}
        <p className="mt-4 rounded-2xl border-2 border-ink bg-butter p-3 text-[13px] font-bold leading-relaxed">
          카카오톡이 열리면 확인을 누른 뒤, 화면 <b>왼쪽 위 ◀</b>를 눌러 돌아와 주세요
        </p>
        <StickerButton variant="kakao" display={false} className="mt-5" onClick={() => startKakaoLogin(returnTo)}>
          카카오로 시작하기
        </StickerButton>
      </BottomSheet>

      {toast && <Toast message={toast} onDone={clearToast} />}
    </>
  );
}
