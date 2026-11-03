import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { TabBar } from "@/components/tab-bar";
import { stickerButtonClass } from "@/components/sticker-button";
import { listRegions, type Region } from "@/server/regions";
import { listRequestRanking } from "@/server/requests";
import { RankRow } from "./rank-row";

type Props = { searchParams: Promise<{ region?: string | string[] }> };

export const metadata: Metadata = {
  title: "추가요 랭킹 | 올빗",
  description: "최근 30일 동안 사람들이 가장 기다린 K-pop 곡. 나도 추가요!",
};

async function getRegions() {
  "use cache";
  cacheLife("days");
  return listRegions();
}

// ?region=<권역 id>. 없거나 모르는 값이면 전체 (FR-9)
async function readRegion(searchParams: Props["searchParams"], regions: Region[]): Promise<Region | null> {
  const { region } = await searchParams;
  const id = Number(Array.isArray(region) ? region[0] : region);
  return regions.find((r) => r.id === id) ?? null;
}

// F-08 추가요 랭킹 (U-06). 탭바가 생기면 추가요 탭이 이 화면이다 (04 IA)
export default function RequestsPage({ searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-32">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Ranking</span>
      </div>
      <h1 className="mt-4 px-5 font-display text-[28px] leading-tight">추가요 랭킹</h1>
      <p className="px-5 text-[13px] font-semibold text-sub">최근 30일 동안 사람들이 가장 기다린 곡 · 누가 요청했는지는 보이지 않아요</p>
      <Suspense fallback={<RankingSkeleton />}>
        <Ranking searchParams={searchParams} />
      </Suspense>
      <TabBar />
    </main>
  );
}

// 고른 권역은 주소에서 읽고, 추가요 수는 요청마다 달라서 매번 읽는다
async function Ranking({ searchParams }: Props) {
  const regions = await getRegions();
  const region = await readRegion(searchParams, regions);
  const ranking = await listRequestRanking(region?.id ?? null);

  return (
    <>
      <RegionChips regions={regions} selected={region} />
      <Link href="/search" className="press mx-5 mt-4 flex items-center gap-2 rounded-full border-2 border-dashed border-ink/50 bg-card/60 px-4 py-2.5 text-[13px] font-bold text-sub">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" className="flex-none text-ink">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        원하는 곡이 없나요? <b className="text-ink">검색해서 추가요</b>
      </Link>
      {ranking.length === 0 ? (
        <Empty region={region} />
      ) : (
        <ol className="mt-5 space-y-3 px-5">
          {ranking.map((s) => (
            <li key={s.slug}>
              <RankRow s={s} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

// 권역 고르기는 주소를 바꾸는 링크다. 고른 권역이 주소에 남아 공유해도 같은 랭킹이 보인다 (FR-9)
function RegionChips({ regions, selected }: { regions: Region[]; selected: Region | null }) {
  const chip = (on: boolean) =>
    `press inline-block whitespace-nowrap rounded-full border-2 border-ink px-3 py-1.5 text-[13px] font-extrabold shadow-sticker-sm ${on ? "bg-pink text-white" : "bg-card"}`;
  return (
    <nav aria-label="권역" className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link href="/requests" aria-current={selected ? undefined : "page"} className={chip(!selected)}>
        전체
      </Link>
      {regions.map((r) => (
        <Link key={r.id} href={`/requests?region=${r.id}`} aria-current={selected?.id === r.id ? "page" : undefined} className={chip(selected?.id === r.id)}>
          {r.shortName}
        </Link>
      ))}
    </nav>
  );
}

function Empty({ region }: { region: Region | null }) {
  return (
    <div className="mx-5 mt-6 rounded-2xl border-2 border-dashed border-ink/40 bg-card/60 p-4">
      <p className="font-display text-[20px]">아직 랭킹에 오른 곡이 없어요</p>
      <p className="mt-1 text-sm font-semibold text-sub">
        {region ? `${region.shortName}을 희망한 추가요가 ` : "추가요가 "}3명 모이면 올라와요. 먼저 추가요해 보세요!
      </p>
      <Link href="/search" className={`mt-3 ${stickerButtonClass({ variant: "white", size: "md", display: false })}`}>
        곡 찾으러 가기
      </Link>
    </div>
  );
}

function RankingSkeleton() {
  return (
    <div className="animate-pulse px-5 pt-4">
      <div className="flex gap-2">
        <div className="h-9 w-14 rounded-full border-2 border-ink/20 bg-card" />
        <div className="h-9 w-24 rounded-full border-2 border-ink/20 bg-card" />
        <div className="h-9 w-24 rounded-full border-2 border-ink/20 bg-card" />
      </div>
      <div className="mt-9 h-[76px] w-full rounded-[18px] border-2 border-ink/20 bg-card" />
      <div className="mt-3 h-[76px] w-full rounded-[18px] border-2 border-ink/20 bg-card" />
      <div className="mt-3 h-[76px] w-full rounded-[18px] border-2 border-ink/20 bg-card" />
    </div>
  );
}
