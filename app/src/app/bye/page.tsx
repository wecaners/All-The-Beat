import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { stickerButtonClass } from "@/components/sticker-button";

export const metadata: Metadata = { title: "탈퇴했어요 | 올빗", robots: { index: false, follow: false } };

// 탈퇴 뒤 안내 (F-09, specs/account-withdrawal). 로그인 없이 보는 정적 화면
export default function ByePage() {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <div className="px-5 pt-7">
        <Logo />
      </div>
      <section className="sticker-edge mx-5 mt-6 rounded-3xl bg-card p-5">
        <h1 className="font-display text-[28px] leading-tight">탈퇴했어요</h1>
        <p className="mt-2 text-[14px] font-semibold text-sub">회원 정보와 추가요·앵콜을 지웠어요. 그동안 함께해 줘서 고마워요.</p>
        <p className="mt-2 text-[14px] font-semibold text-sub">로그인하지 않아도 곡과 클래스는 그대로 볼 수 있어요.</p>
        <Link href="/" className={`${stickerButtonClass({ variant: "lime", size: "md" })} mt-5`}>
          홈으로
        </Link>
      </section>
    </main>
  );
}
