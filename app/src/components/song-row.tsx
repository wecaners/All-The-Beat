import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  slug: string;
  title: string;
  artistName: string;
  videoId: string | null;
  upcomingClasses?: number;
  waiting?: number;
  /** 기본은 곡 상세. 마이의 열린 추가요는 열린 클래스로 */
  href?: string;
  /** 아티스트 뒤에 붙는 한 줄 ("홍대·합정 · 10월 28일") */
  meta?: string;
  /** 지금 상황 자리를 바꾼다 (마이의 내 추가요 상태) */
  status?: ReactNode;
  /** 썸네일 위에 붙는 스티커들 (랭킹의 순위·이번 주 증가). 자리는 부르는 쪽이 `absolute`로 잡는다 */
  stickers?: ReactNode;
  /** 오른쪽 버튼 (랭킹의 나도 추가요). 있으면 링크는 그 왼쪽까지만 */
  action?: ReactNode;
};

// 곡 한 줄 (검색 결과, 마이, 랭킹). 누르면 곡 상세. 지금 상황은 클래스가 있으면 클래스 수, 없으면 기다리는 수
export function SongRow({ slug, title, artistName, videoId, upcomingClasses = 0, waiting = 0, href, meta, status, stickers, action }: Props) {
  const body = (
    <>
      <span className="relative block h-14 w-[86px] flex-none rounded-xl border-2 border-ink bg-[linear-gradient(135deg,var(--color-pink-soft),var(--color-lilac))]">
        <span className="block h-full w-full overflow-hidden rounded-[10px]">
          {videoId && (
            // eslint-disable-next-line @next/next/no-img-element -- YouTube 썸네일
            <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
        </span>
        {stickers}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[19px] leading-tight">{title}</span>
        <span className="block truncate text-[13px] font-semibold text-sub">
          {artistName}
          {meta && ` · ${meta}`}
        </span>
        <span className="mt-1 block text-[12px] font-extrabold">
          {status ?? (upcomingClasses > 0 ? (
            <span className="rounded-full bg-lime px-2 py-0.5">다가오는 클래스 {upcomingClasses}개</span>
          ) : waiting > 0 ? (
            <span className="rounded-full bg-pink-soft px-2 py-0.5">{waiting}명이 기다려요</span>
          ) : (
            <span className="text-sub">아직 클래스가 없어요</span>
          ))}
        </span>
      </span>
    </>
  );
  const to = href ?? `/song/${slug}`;

  if (!action) {
    return (
      <Link href={to} className="press sticker-edge flex items-center gap-3 rounded-[18px] bg-card p-2 pr-3">
        {body}
      </Link>
    );
  }
  return (
    <div className="sticker-edge flex items-center gap-2 rounded-[18px] bg-card p-2 pr-2.5">
      <Link href={to} className="press flex min-w-0 flex-1 items-center gap-3">
        {body}
      </Link>
      {action}
    </div>
  );
}
