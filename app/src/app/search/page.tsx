import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { SongRow } from "@/components/song-row";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listHotSongsThisWeek } from "@/server/classes";
import { searchSongs } from "@/server/songs/search";
import { NewSongPanel } from "./new-song-panel";
import { SearchBox } from "./search-box";

type Props = { searchParams: Promise<{ q?: string | string[]; newsong?: string | string[] }> };

// 검색 결과 주소는 검색 엔진에 올리지 않는다
export const metadata: Metadata = { title: "검색 | 올빗", robots: { index: false } };

async function readQuery(searchParams: Props["searchParams"]): Promise<string> {
  const { q } = await searchParams;
  return (Array.isArray(q) ? q[0] : q)?.slice(0, 50) ?? "";
}

// F-02 검색 (U-02). 탭바 없이 검색 칸과 결과만 (04 IA)
export default function SearchPage({ searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <div className="sticky top-0 z-30 border-b-2 border-ink bg-paper/95 px-5 pt-7 pb-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Search</span>
        </div>
        <SearchBox />
      </div>
      <Suspense fallback={<p className="px-5 pt-6 text-sm font-semibold text-sub">찾는 중…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// 결과 없음 → 그 자리에서 곡을 만들어 추가요 (F-13, specs/song-register). 로그인 여부는 패널의 첫 시트를 정한다.
// "이런 곡은 어때요?"는 이번 주 핫한 곡 (와이어프레임 U-02c)
async function NoResults({ q }: { q: string }) {
  const [user, hot] = await Promise.all([getCurrentUser(), listHotSongsThisWeek(3)]);
  return (
    <>
      <div className="mx-5 mt-6 rounded-2xl border-2 border-dashed border-ink/40 bg-card/60 p-4">
        <p className="font-display text-[20px]">아직 올빗에 없는 곡이에요</p>
        <p className="mt-1 text-sm font-semibold text-sub">다른 표기로 다시 찾아보거나, 지금 바로 곡을 만들고 추가요를 남겨 보세요. 강사님들이 볼 수 있어요.</p>
        <NewSongPanel query={q} loggedIn={!!user} />
      </div>
      {hot.length > 0 && (
        <section className="mt-8 px-5">
          <h2 className="font-display text-[20px]">이런 곡은 어때요?</h2>
          <ul className="mt-2.5 space-y-2.5">
            {hot.map((s) => (
              <li key={s.slug}>
                <SongRow slug={s.slug} title={s.title} artistName={s.artistName} videoId={s.videoId} upcomingClasses={s.classCount} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// 결과는 칠 때마다 다시 그려져서 등장 애니메이션을 쓰지 않는다 (specs/search findings)
async function Results({ searchParams }: Props) {
  const q = await readQuery(searchParams);
  if (!q.trim()) {
    return <p className="px-5 pt-6 text-[15px] font-semibold leading-relaxed text-sub">곡 이름이나 아티스트를 쳐 보세요. 한글·영문, 띄어쓰기는 상관없어요.</p>;
  }
  const results = await searchSongs(q);
  if (results.length === 0) return <NoResults q={q} />;
  return (
    <>
      <p className="px-5 pt-5 text-[13px] font-bold text-sub">곡 {results.length}개</p>
      <ul className="mt-2 space-y-2.5 px-5">
        {results.map((s) => (
          <li key={s.id}>
            <SongRow {...s} />
          </li>
        ))}
      </ul>
    </>
  );
}
