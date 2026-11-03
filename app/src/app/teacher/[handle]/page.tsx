import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getTeacherProfile } from "@/server/teachers";
import { TeacherView } from "./teacher-view";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTeacherProfile((await params).handle);
  if (!t) return { title: "올빗" };
  const title = `${t.displayName} 강사 | 올빗`;
  const where = t.regionNames.length > 0 ? `${t.regionNames.join(" · ")} · ` : "";
  const description = `${where}다가오는 클래스 ${t.upcoming.length}개`;
  return { title, description, openGraph: { title, description, type: "profile" } };
}

// F-21 강사 프로필. 강사가 인스타에 거는 주소라 바로 들어오는 화면이다. 상세 화면이라 탭바 없이 로고로 홈에 간다 (04 IA)
export default function TeacherPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <Suspense fallback={<TeacherSkeleton />}>
        <TeacherContent params={params} />
      </Suspense>
    </main>
  );
}

async function TeacherContent({ params }: Props) {
  // 다가오는 클래스·지난 곡이 지금 시각에 달려 있어 요청마다 읽는다 (클래스 상세와 같다)
  await connection();
  const t = await getTeacherProfile((await params).handle);
  if (!t) notFound();
  return <TeacherView t={t} />;
}

function TeacherSkeleton() {
  return (
    <div className="animate-pulse px-5 pt-14">
      <div className="h-44 w-full rounded-3xl border-2 border-ink/20 bg-card" />
      <div className="mt-8 h-10 w-48 rounded-xl bg-lime/50" />
      <div className="mt-4 h-28 w-full rounded-2xl border-2 border-ink/20 bg-card" />
    </div>
  );
}
