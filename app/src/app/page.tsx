import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Twinkle } from "@/components/twinkle";
import { listHotSongsThisWeek, listUpcomingClasses } from "@/server/classes";
import { listTopRequestedSongs } from "@/server/requests";
import { HomeView } from "./home-view";

// F-01 홈 (U-01). 탭바·더보기는 갈 화면이 생길 때 붙인다 (specs/home, MVP 원칙 6). 검색 입구는 specs/search, 마이 입구는 specs/my-page
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        {/* 마이 입구 (F-10). 하단 탭바가 생기기 전까지 홈 머리에 둔다 */}
        <Link href="/me" className="press rounded-full border-2 border-ink bg-card px-3.5 py-1 text-[13px] font-black shadow-sticker-sm">
          마이
        </Link>
      </div>
      <p className="mt-3 px-5 text-[15px] font-bold text-sub">
        지금 뜨는 K-pop 곡의 원데이 댄스 클래스 <Twinkle size={16} className="ml-0.5 align-[-2px]" />
      </p>
      {/* 검색 입구 (F-01·F-02). 누르면 검색 화면에서 바로 친다 */}
      <Link href="/search" className="press sticker-edge mx-5 mt-4 flex items-center gap-2.5 rounded-full bg-card px-5 py-3 text-[16px] font-bold text-sub">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" className="flex-none text-ink">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        추고 싶은 곡이나 아티스트
      </Link>
      <Suspense fallback={<HomeSkeleton />}>
        <HomeSections />
      </Suspense>
    </main>
  );
}

// 다가오는 클래스·추가요 수는 요청마다 달라야 해서 매번 읽는다. 셋 다 비었는지 알아야 해서 한 번에 읽는다
async function HomeSections() {
  await connection();
  const [hot, upcoming, top] = await Promise.all([listHotSongsThisWeek(), listUpcomingClasses(), listTopRequestedSongs()]);
  return <HomeView hot={hot} upcoming={upcoming} top={top} />;
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse px-5 pt-8">
      <div className="h-7 w-40 rounded-lg bg-lime/50" />
      <div className="mt-5 flex gap-4 overflow-hidden">
        <div className="h-44 w-[196px] flex-none rounded-[20px] border-2 border-ink/20 bg-card" />
        <div className="h-44 w-[196px] flex-none rounded-[20px] border-2 border-ink/20 bg-card" />
      </div>
      <div className="mt-8 h-20 w-full rounded-2xl border-2 border-ink/20 bg-card" />
    </div>
  );
}
