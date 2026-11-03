import Link from "next/link";
import { RankSticker } from "@/components/rank-sticker";
import { SongRow } from "@/components/song-row";
import type { RankedSong } from "@/server/requests";

// 랭킹 한 줄: 순위·이번 주 증가는 썸네일(포토카드)에 붙인 스티커, 곡 누르면 곡 상세, [나도 추가요!]는 곡 상세의 추가요 시트로 (홈 TOP 5와 같은 길).
// 글자 줄은 375px에서 버튼 옆에 150px쯤이라 "N명"까지만 쓴다
export function RankRow({ s }: { s: RankedSong }) {
  return (
    <SongRow
      slug={s.slug}
      title={s.title}
      artistName={s.artistName}
      videoId={s.videoId}
      meta={`${s.waiting}명`}
      stickers={
        <>
          <span className="absolute -top-2.5 -left-2.5">
            <RankSticker rank={s.rank} size="sm" />
          </span>
          {s.weekGain > 0 && (
            <span className="absolute -right-1.5 -bottom-2 rounded-full border-2 border-ink bg-butter px-1.5 py-px text-[10px] leading-tight font-black whitespace-nowrap">
              이번 주 +{s.weekGain}
            </span>
          )}
        </>
      }
      status={
        <span className="flex items-center gap-1.5">
          {s.upcomingClasses > 0 ? (
            <span className="rounded-full bg-lime px-2 py-0.5">클래스 {s.upcomingClasses}개 열림</span>
          ) : (
            <span className="text-sub">아직 클래스 없음</span>
          )}
          <RankChangeMark change={s.change} />
        </span>
      }
      action={
        <Link
          href={`/song/${s.slug}?request=open`}
          aria-label={`${s.title} 추가요하러 가기`}
          className="press w-[62px] flex-none rounded-2xl border-2 border-ink bg-pink px-1.5 py-2 text-center font-display text-[13px] leading-[1.15] text-white shadow-sticker-sm [-webkit-text-stroke:0.6px_var(--color-ink)]"
        >
          나도
          <br />
          추가요!
        </Link>
      }
    />
  );
}

// 지난주 순위와 견준 변화. 같은 자리면 아무것도 안 보인다 (specs/request-ranking findings)
function RankChangeMark({ change }: { change: RankedSong["change"] }) {
  switch (change.kind) {
    case "new":
      return <span className="rounded-full bg-butter px-1.5 py-0.5 font-zine text-[10px] font-extrabold uppercase">New</span>;
    case "up":
      return <span className="text-pink">▲{change.by}</span>;
    case "down":
      return <span className="text-sub">▼{change.by}</span>;
    case "same":
      return null;
  }
}
