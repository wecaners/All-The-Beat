import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatClassDate, formatTimeRange } from "@/lib/format";
import { getPublicClass } from "@/server/classes";
import { getEncoreSummary, getMyEncore, isEncoreTarget } from "@/server/encores";
import { type ClassEncore, ClassView } from "./class-view";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await getPublicClass(id);
  if (!c) return { title: "올빗" };
  const when = `${formatClassDate(c.startsAt)} ${formatTimeRange(c.startsAt, c.endsAt)}`;
  const description = `${when} · ${c.regionName} · 강사 ${c.instructor.displayName}`;
  return {
    title: `${c.title} | 올빗`,
    description,
    openGraph: { title: `${c.title} | 올빗`, description, type: "website" },
  };
}

// F-05 클래스 상세 (U-05). 인스타·카톡 공유로 바로 들어오는 화면이라 탭바 없이 로고로 홈에 간다 (04 IA 6절)
export default function ClassPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-44">
      <Suspense fallback={<ClassSkeleton />}>
        <ClassContent params={params} />
      </Suspense>
    </main>
  );
}

async function ClassContent({ params }: Props) {
  // 종료 여부가 지금 시각에 달려 있고 상태도 자주 바뀌어서 요청마다 읽는다
  await connection();
  const { id } = await params;
  const c = await getPublicClass(id);
  if (!c) notFound();
  return <ClassView c={c} encore={isEncoreTarget(c.status) ? await readEncore(c.id) : null} />;
}

// 앵콜 인원·진행 상태와 내 앵콜. 로그인은 앵콜을 남길 때만 필요해서, 로그인하지 않아도 진행 상태는 보인다
async function readEncore(classId: number): Promise<ClassEncore | null> {
  const [summary, user] = await Promise.all([getEncoreSummary(classId), getCurrentUser()]);
  if (!summary) return null;
  return { summary, loggedIn: !!user, mine: user ? await getMyEncore(user.id, classId) : null };
}

function ClassSkeleton() {
  return (
    <div className="animate-pulse px-5 pt-14">
      <div className="aspect-video w-full rounded-[26px] border-2 border-ink/20 bg-card" />
      <div className="mt-6 h-10 w-56 rounded-xl bg-lime/50" />
      <div className="mt-4 h-40 w-full rounded-2xl border-2 border-ink/20 bg-card" />
    </div>
  );
}
