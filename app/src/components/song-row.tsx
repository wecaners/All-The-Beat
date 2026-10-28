import Link from "next/link";

type Props = {
  slug: string;
  title: string;
  artistName: string;
  videoId: string | null;
  upcomingClasses: number;
  waiting: number;
};

// 곡 한 줄 (검색 결과, 나중에 랭킹·마이). 누르면 곡 상세. 지금 상황은 클래스가 있으면 클래스 수, 없으면 기다리는 수
export function SongRow({ slug, title, artistName, videoId, upcomingClasses, waiting }: Props) {
  return (
    <Link href={`/song/${slug}`} className="press sticker-edge flex items-center gap-3 rounded-[18px] bg-card p-2 pr-3">
      <span className="block h-14 w-[86px] flex-none overflow-hidden rounded-xl border-2 border-ink bg-[linear-gradient(135deg,var(--color-pink-soft),var(--color-lilac))]">
        {videoId && (
          // eslint-disable-next-line @next/next/no-img-element -- YouTube 썸네일
          <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[19px] leading-tight">{title}</span>
        <span className="block truncate text-[13px] font-semibold text-sub">{artistName}</span>
        <span className="mt-1 block text-[12px] font-extrabold">
          {upcomingClasses > 0 ? (
            <span className="rounded-full bg-lime px-2 py-0.5">다가오는 클래스 {upcomingClasses}개</span>
          ) : waiting > 0 ? (
            <span className="rounded-full bg-pink-soft px-2 py-0.5">{waiting}명이 기다려요</span>
          ) : (
            <span className="text-sub">아직 클래스가 없어요</span>
          )}
        </span>
      </span>
    </Link>
  );
}
