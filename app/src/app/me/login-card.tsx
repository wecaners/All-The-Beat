"use client";

import { StickerButton } from "@/components/sticker-button";
import { startKakaoLogin } from "@/lib/auth/kakao-login";

// 비로그인 마이 (와이어프레임 U-09a): 로그인을 강요하지 않고 무엇을 할 수 있는지 먼저 말한다 (MVP 원칙 5)
export function LoginCard() {
  return (
    <section className="sticker-edge mx-5 mt-6 rounded-3xl bg-card p-5">
      <h1 className="font-display text-[26px] leading-tight">로그인하고 추가요·앵콜을 남겨 보세요</h1>
      <p className="mt-2 text-[14px] font-semibold leading-relaxed text-sub">
        보고 싶은 곡은 추가요하고, 마감된 클래스는 앵콜할 수 있어요. 남긴 요청이 어떻게 됐는지 여기서 볼 수 있어요. 둘러보기는 로그인 없이도 돼요.
      </p>
      {/* 카톡 앱으로 넘어가면 자동으로 안 돌아온다 (spike-01 발견) */}
      <p className="mt-4 rounded-2xl border-2 border-ink bg-butter p-3 text-[13px] font-bold leading-relaxed">
        카카오톡이 열리면 확인을 누른 뒤, 화면 <b>왼쪽 위 ◀</b>를 눌러 돌아와 주세요
      </p>
      <StickerButton variant="kakao" display={false} className="mt-4" onClick={() => startKakaoLogin("/me")}>
        카카오로 시작하기
      </StickerButton>
    </section>
  );
}
