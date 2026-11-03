import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeNextPath } from "@/lib/safe-next";
import { hasConsented } from "@/server/consent";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = { title: "올빗 시작하기", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ next?: string }> };

// 첫 로그인 약관 동의 (U-08, F-09). 로그인 콜백이 동의 전 사용자를 여기로 보낸다.
// 바텀시트 대신 한 화면인 이유: 302로 도착하는 곳이라 어느 화면 위에 띄울지 정할 수 없다 (specs/terms-consent findings)
export default function WelcomePage({ searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Welcome</span>
      </div>
      <Suspense fallback={<div className="mx-5 mt-6 h-72 animate-pulse rounded-3xl border-2 border-ink/20 bg-card" />}>
        <Consent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Consent({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);
  const user = await getCurrentUser();
  if (!user) redirect("/");
  // 이미 동의했으면 다시 묻지 않는다
  if (await hasConsented(user.id)) redirect(next);

  return (
    <section className="sticker-edge mx-5 mt-6 rounded-3xl bg-card p-5">
      <h1 className="font-display text-[28px] leading-tight">올빗 시작하기</h1>
      <p className="mt-1.5 text-[14px] font-semibold text-sub">처음이시군요! 약관에 동의하면 바로 시작돼요</p>
      <ConsentForm next={next} />
    </section>
  );
}
