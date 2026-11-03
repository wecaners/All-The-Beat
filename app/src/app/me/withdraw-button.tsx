"use client";

import { useCallback, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { StickerButton } from "@/components/sticker-button";
import { withdrawAction } from "./actions";

type Props = { requestCount: number; encoreCount: number; isInstructor: boolean; isAdmin: boolean };

// 회원 탈퇴 (F-09·F-10, specs/account-withdrawal). 되돌릴 수 없어 시트로 한 번 더 묻는다 (design.md)
export function WithdrawButton({ requestCount, encoreCount, isInstructor, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const close = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  function onWithdraw() {
    start(async () => {
      // 성공하면 서버가 /bye로 보낸다. 돌아오면 실패다
      const result = await withdrawAction();
      setError(result.error);
    });
  }

  return (
    <>
      <StickerButton variant="white" size="md" display={false} onClick={() => setOpen(true)}>
        탈퇴하기
      </StickerButton>

      <BottomSheet open={open} onClose={close} label="회원 탈퇴">
        {isAdmin ? (
          <>
            <h3 className="font-display text-[26px]">운영자 계정은 탈퇴할 수 없어요</h3>
            <p className="mt-1.5 text-sm font-semibold text-sub">운영자 권한을 먼저 내려놓은 뒤에 탈퇴할 수 있어요.</p>
            <StickerButton variant="white" size="md" className="mt-5" onClick={close}>
              닫기
            </StickerButton>
          </>
        ) : (
          <>
            <h3 className="font-display text-[26px]">정말 탈퇴할까요?</h3>
            <p className="mt-1.5 text-sm font-semibold text-sub">탈퇴하면 바로 지워지고 되돌릴 수 없어요.</p>
            <ul className="mt-4 space-y-2 rounded-2xl border-2 border-ink bg-card p-4 text-[14px] font-semibold">
              <li>회원 정보 (닉네임·프로필 사진·약관 동의)</li>
              <li>
                내 추가요 {requestCount}건 · 내 앵콜 {encoreCount}건
                <span className="block text-[12px] text-sub">기다리는 사람 수에서도 빠져요</span>
              </li>
              <li>카카오 로그인 연결</li>
              {isInstructor && (
                <li>
                  내 클래스는 수강생에게 안 보이게 돼요
                  <span className="block text-[12px] text-sub">강사 소개와 클래스 기록은 운영자만 볼 수 있게 남아요</span>
                </li>
              )}
            </ul>
            <p className="mt-3 text-[12px] font-semibold text-sub">같은 카카오 계정으로 다시 가입할 수 있지만, 지운 내용은 돌아오지 않아요.</p>
            {error && <p className="mt-3 rounded-xl bg-pink-soft px-3 py-2 text-[13px] font-bold">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <StickerButton variant="white" size="md" onClick={close}>
                그대로 둘게요
              </StickerButton>
              <StickerButton variant="soft" size="md" onClick={onWithdraw} disabled={pending}>
                {pending ? "탈퇴하는 중…" : "탈퇴할게요"}
              </StickerButton>
            </div>
          </>
        )}
      </BottomSheet>
    </>
  );
}
