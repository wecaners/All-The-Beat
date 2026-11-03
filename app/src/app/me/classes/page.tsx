import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { stickerButtonClass } from "@/components/sticker-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getApprovedInstructorId, listMyClasses } from "@/server/instructors/classes";
import { MyClassCard } from "./class-card";
import { EncoreCard } from "./encore-card";

export const metadata: Metadata = { title: "내 클래스 | 올빗", robots: { index: false, follow: false } };

// T-03 내 클래스 (F-12). 승인된 강사만. 답이 필요한 앵콜이 맨 위, 다가오는·지난 순
export default function MyClassesPage() {
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
  const instructorId = await getApprovedInstructorId(user.id);
  if (!instructorId) redirect("/me/teacher/apply");
  const { upcoming, past, encores } = await listMyClasses(instructorId);

  return (
    <div className="px-5">
      <div className="mt-4 flex items-end justify-between gap-3">
        <h1 className="font-display text-[28px] leading-tight">내 클래스</h1>
        <Link href="/me/classes/new" className={`${stickerButtonClass({ variant: "lime", size: "md" })} !w-auto px-4`}>
          + 새 클래스
        </Link>
      </div>

      {encores.length > 0 && (
        <section className="mt-5 space-y-3">
          <h2 className="font-display text-[20px]">
            앵콜 응답이 필요해요 <span className="text-sub">{encores.length}</span>
          </h2>
          {encores.map((e) => (
            <EncoreCard key={e.classId} e={e} />
          ))}
        </section>
      )}

      <section className="mt-7">
        <h2 className="font-display text-[20px]">
          <span className="mark-lime">다가오는</span> <span className="text-[16px] text-sub">{upcoming.length}</span>
        </h2>
        {upcoming.length === 0 ? (
          <div className="mt-3 rounded-2xl border-2 border-dashed border-ink/40 p-4">
            <p className="text-[14px] font-semibold text-sub">아직 다가오는 클래스가 없어요. 1분이면 올려요.</p>
            <Link href="/me/classes/new" className={`mt-3 ${stickerButtonClass({ variant: "white", size: "md", display: false })}`}>
              새 클래스 올리기
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((c) => (
              <li key={c.id}>
                <MyClassCard c={c} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-[20px]">
            지난 <span className="text-[16px] text-sub">{past.length}</span>
          </h2>
          <ul className="mt-3 space-y-3">
            {past.map((c) => (
              <li key={c.id}>
                <MyClassCard c={c} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
