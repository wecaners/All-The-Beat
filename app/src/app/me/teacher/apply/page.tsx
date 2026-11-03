import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { stickerButtonClass } from "@/components/sticker-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyClaim, getMyInstructor } from "@/server/instructors";
import { listRegions } from "@/server/regions";
import { ApplyForm } from "./apply-form";
import { ClaimStatusView } from "./claim-view";
import { StatusView } from "./status-view";

export const metadata: Metadata = { title: "강사 신청 | 올빗", robots: { index: false, follow: false } };

async function getRegions() {
  "use cache";
  cacheLife("days");
  return listRegions();
}

// T-01 강사 신청 (F-11). 입력 화면이라 탭바 없이 마이로 돌아가는 길만 (04 IA)
export default function ApplyPage() {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <Link href="/me" className="press rounded-full border-2 border-ink bg-card px-3.5 py-1 text-[13px] font-black shadow-sticker-sm">
          마이로
        </Link>
      </div>
      <Suspense fallback={<p className="px-5 pt-8 text-sm font-semibold text-sub">불러오는 중…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const user = await getCurrentUser();
  if (!user) redirect("/me");
  const [me, claim, regions] = await Promise.all([getMyInstructor(user.id), getMyClaim(user.id), getRegions()]);

  // 대리 강사 가져오기 중이면 그 진행 상태 (F-19)
  if (claim && (!me || me.status === "rejected")) {
    return (
      <div className="px-5">
        <h1 className="mt-4 font-display text-[28px] leading-tight">
          {claim.displayName} <span className="mark-lime">가져오기</span>
        </h1>
        <p className="mt-1 text-[13px] font-semibold text-sub">지금 어디까지 왔는지 보여드려요</p>
        <ClaimStatusView claim={claim} />
      </div>
    );
  }

  // 없거나 반려됐으면 폼, 아니면 상태
  if (!me || me.status === "rejected") {
    return (
      <div className="px-5">
        <h1 className="mt-4 font-display text-[28px] leading-tight">강사 신청</h1>
        {me?.status === "rejected" ? (
          <div className="mt-4 rounded-2xl border-2 border-ink bg-pink-soft p-4">
            <p className="font-display text-[18px]">이번엔 승인이 어려웠어요</p>
            <p className="mt-1 text-[13px] font-semibold">{me.rejectedReason ?? "사유가 남아 있지 않아요"}</p>
            <p className="mt-1 text-[13px] font-semibold text-sub">내용을 고쳐서 다시 신청할 수 있어요.</p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border-2 border-ink bg-butter p-4">
            <p className="font-display text-[18px]">올빗에 클래스를 올려보세요</p>
            <p className="mt-1 text-[13px] font-semibold leading-relaxed">
              무료예요. 예약은 지금 쓰는 네이버 예약·오픈채팅 그대로 받고, 올빗은 클래스를 찾는 사람들에게 보여주는 역할만 해요.
            </p>
          </div>
        )}
        <ApplyForm regions={regions} previous={me} />
      </div>
    );
  }

  return (
    <div className="px-5">
      <h1 className="mt-4 font-display text-[28px] leading-tight">
        {me.displayName} <span className="mark-lime">강사 신청</span>
      </h1>
      <p className="mt-1 text-[13px] font-semibold text-sub">지금 어디까지 왔는지 보여드려요</p>
      <StatusView me={me} />
      {me.status === "approved" && (
        <Link href="/" className={`mt-6 ${stickerButtonClass({ variant: "white", size: "md", display: false })}`}>
          홈으로
        </Link>
      )}
    </div>
  );
}
