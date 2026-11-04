import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { TabBar } from "@/components/tab-bar";
import { stickerButtonClass } from "@/components/sticker-button";
import { LEVEL_LABEL } from "@/lib/format";
import { type ClassListQuery, classListSearch, countClasses, DATE_PRESETS, LEVELS, listClasses, parseClassListQuery } from "@/server/classes/list";
import { listRegions, type Region } from "@/server/regions";
import { searchSongs } from "@/server/songs/search";
import { ClassList } from "./class-list";
import { DatePick } from "./date-pick";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "클래스 목록 | 올빗",
  description: "날짜·동네·난이도로 고르는 K-pop 원데이 댄스 클래스",
};

const DATE_LABEL: Record<(typeof DATE_PRESETS)[number], string> = { today: "오늘", week: "이번 주", weekend: "이번 주말" };

async function getRegions() {
  "use cache";
  cacheLife("days");
  return listRegions();
}

async function readQuery(searchParams: Props["searchParams"]): Promise<ClassListQuery> {
  const raw = await searchParams;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (first !== undefined) p.set(k, first);
  }
  return parseClassListQuery(p);
}

// F-03 클래스 목록 (U-03). 탭바가 생기면 찾기 탭이 검색·목록이 된다 (04 IA)
export default function ClassesPage({ searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-32">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Classes</span>
      </div>
      <h1 className="mt-4 px-5 font-display text-[28px] leading-tight">클래스 목록</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Classes searchParams={searchParams} />
      </Suspense>
      <TabBar />
    </main>
  );
}

// 조건은 주소에서 읽고, 목록은 요청마다 달라서(지금 시각 기준) 매번 읽는다
async function Classes({ searchParams }: Props) {
  await connection();
  const [query, regions] = await Promise.all([readQuery(searchParams), getRegions()]);
  const [{ items, nextCursor }, total] = await Promise.all([listClasses(query), countClasses(query)]);
  const search = classListSearch(query);

  return (
    <>
      <Filters query={query} regions={regions} search={search} />
      <div className="mt-4 flex items-center justify-between px-5 text-[13px] font-bold text-sub">
        <span>
          <b className="text-ink">{total}개</b> 클래스 · 가까운 날짜순
        </span>
        <Link
          href={`/classes${classListSearch({ ...query, closed: !query.closed })}`}
          scroll={false}
          aria-pressed={query.closed}
          className={`press rounded-full border-2 border-ink px-2.5 py-1 text-[12px] font-extrabold shadow-sticker-sm ${query.closed ? "bg-ink text-lime" : "bg-card text-ink"}`}
        >
          마감 포함
        </Link>
      </div>
      {items.length === 0 ? <Empty query={query} /> : <ClassList key={search} initial={items} nextCursor={nextCursor} search={search} />}
    </>
  );
}

const chip = (on: boolean) =>
  `press inline-block flex-none whitespace-nowrap rounded-full border-2 border-ink px-3 py-1.5 text-[13px] font-extrabold shadow-sticker-sm ${on ? "bg-pink text-white" : "bg-card"}`;

// 조건 칩은 주소를 바꾸는 링크 (FR-11). 날짜·난이도는 하나(다시 누르면 전체), 권역은 여러 개(누를 때마다 넣고 뺀다)
function Filters({ query, regions, search }: { query: ClassListQuery; regions: Region[]; search: string }) {
  const href = (patch: Partial<ClassListQuery>) => `/classes${classListSearch({ ...query, ...patch })}`;
  const row = "mt-2.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
  const custom = query.date && !(DATE_PRESETS as readonly string[]).includes(query.date) ? query.date : null;
  return (
    <div className="mt-3">
      {/* 검색 입구 (04 IA: 목록 상단 → U-02). 누르면 지금 검색어를 담아 검색 화면으로, 지우기는 칸 안의 버튼 */}
      <div className="relative mx-5 mb-1.5">
        <Link
          href={query.q ? `/search?q=${encodeURIComponent(query.q)}` : "/search"}
          aria-label={query.q ? `검색어 ${query.q} 바꾸기` : "곡이나 아티스트 검색"}
          className={`press sticker-edge flex items-center gap-2.5 rounded-full bg-card py-3 pl-5 text-[16px] font-bold ${query.q ? "pr-14 text-ink" : "pr-5 text-sub"}`}
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" className="flex-none text-ink">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          <span className="min-w-0 truncate">{query.q || "추고 싶은 곡이나 아티스트"}</span>
        </Link>
        {query.q && (
          <Link
            href={href({ q: "" })}
            scroll={false}
            aria-label="검색어 지우기"
            className="press absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-2 border-ink bg-paper shadow-sticker-sm"
          >
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24">
              <path d="M5 5 L19 19 M19 5 L5 19" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
            </svg>
          </Link>
        )}
      </div>
      <nav aria-label="날짜" className={row}>
        {DATE_PRESETS.map((d) => (
          <Link key={d} href={href({ date: query.date === d ? null : d })} scroll={false} aria-pressed={query.date === d} className={chip(query.date === d)}>
            {DATE_LABEL[d]}
          </Link>
        ))}
        <DatePick value={custom} search={search} chipClass={chip(!!custom)} />
      </nav>
      <nav aria-label="권역" className={row}>
        {regions.map((r) => {
          const on = query.region.includes(r.id);
          const region = on ? query.region.filter((id) => id !== r.id) : [...query.region, r.id];
          return (
            <Link key={r.id} href={href({ region })} scroll={false} aria-pressed={on} className={chip(on)}>
              {r.shortName}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="난이도" className={row}>
        {LEVELS.map((l) => (
          <Link key={l} href={href({ level: query.level === l ? null : l })} scroll={false} aria-pressed={query.level === l} className={chip(query.level === l)}>
            {LEVEL_LABEL[l]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

// 0개: 조건을 줄이라는 안내 + 초기화(검색어는 남김). 검색어에 걸린 곡이 있으면 그 곡 상세(추가요)로 (FR-12)
async function Empty({ query }: { query: ClassListQuery }) {
  const [song] = query.q ? await searchSongs(query.q, 1) : [];
  const hasFilters = query.date || query.region.length || query.level;
  const noSong = !!query.q && !song;
  return (
    <div className="mx-5 mt-6 rounded-2xl border-2 border-dashed border-ink/40 bg-card/60 p-4">
      <p className="font-display text-[20px]">{noSong ? "아직 올빗에 없는 곡이에요" : "조건에 맞는 클래스가 없어요"}</p>
      <p className="mt-1 text-sm font-semibold text-sub">
        {noSong
          ? "다른 표기나 아티스트 이름으로 찾아 보세요."
          : hasFilters
            ? "날짜나 동네, 난이도를 줄여 보세요."
            : song
              ? `${song.title} 클래스가 아직 없어요. 추가요로 열어 달라고 해 보세요.`
              : "아직 열린 클래스가 없어요. 곡을 찾아 추가요해 보세요."}
      </p>
      <div className="mt-3 flex gap-2.5">
        {hasFilters && (
          <Link href={`/classes${classListSearch({ q: query.q, date: null, region: [], level: null, closed: query.closed })}`} className={stickerButtonClass({ variant: "white", size: "md", display: false })}>
            조건 초기화
          </Link>
        )}
        {song ? (
          <Link href={`/song/${song.slug}?request=open`} className={stickerButtonClass({ variant: "pink", size: "md" })}>
            이 곡 추가요!
          </Link>
        ) : (
          !hasFilters && (
            <Link href="/search" className={stickerButtonClass({ variant: "white", size: "md", display: false })}>
              곡 찾으러 가기
            </Link>
          )
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="animate-pulse px-5 pt-3">
      <div className="mb-4 h-12 w-full rounded-full border-2 border-ink/20 bg-card" />
      <div className="flex gap-2">
        <div className="h-9 w-14 rounded-full border-2 border-ink/20 bg-card" />
        <div className="h-9 w-20 rounded-full border-2 border-ink/20 bg-card" />
        <div className="h-9 w-24 rounded-full border-2 border-ink/20 bg-card" />
      </div>
      <div className="mt-8 h-7 w-32 rounded-lg bg-lime/50" />
      <div className="mt-3 h-20 w-full rounded-2xl border-2 border-ink/20 bg-card" />
      <div className="mt-4 h-20 w-full rounded-2xl border-2 border-ink/20 bg-card" />
    </div>
  );
}
