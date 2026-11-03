import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/current-user";
import { classIdInput } from "@/server/classes";
import { getApprovedInstructorId, getMyClassForEdit, listMyPlaces } from "@/server/instructors/classes";
import { listRegions } from "@/server/regions";
import { ClassForm } from "../../class-form";

export const metadata: Metadata = { title: "클래스 수정 | 올빗", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

async function getRegions() {
  "use cache";
  cacheLife("days");
  return listRegions();
}

// T-02 클래스 수정 (F-12). 종료 전·취소 아닌 내 클래스만. 일시·장소를 바꾸면 상세에 24시간 "변경됨"
export default function EditClassPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <Link href="/me/classes" className="press rounded-full border-2 border-ink bg-card px-3.5 py-1 text-[13px] font-black shadow-sticker-sm">
          내 클래스로
        </Link>
      </div>
      <Suspense fallback={<p className="px-5 pt-8 text-sm font-semibold text-sub">불러오는 중…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/me");
  const instructorId = await getApprovedInstructorId(user.id);
  if (!instructorId) redirect("/me/teacher/apply");
  const parsed = classIdInput.safeParse((await params).id);
  if (!parsed.success) notFound();
  const [source, regions, places] = await Promise.all([getMyClassForEdit(instructorId, parsed.data).catch(() => null), getRegions(), listMyPlaces(instructorId)]);
  if (!source) notFound();

  return (
    <div className="px-5">
      <h1 className="mt-4 font-display text-[28px] leading-tight">클래스 수정</h1>
      <p className="mt-1 text-[13px] font-semibold text-sub">날짜·시간·장소를 바꾸면 클래스 상세에 하루 동안 &quot;변경됨&quot;이 보여요</p>
      <ClassForm regions={regions} places={places} source={source} editId={parsed.data} />
    </div>
  );
}
