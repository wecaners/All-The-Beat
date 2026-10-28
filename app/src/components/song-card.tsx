import Link from "next/link";
import type { ReactNode } from "react";
import { Tape } from "./tape";

type Props = {
  slug: string;
  title: string;
  artistName: string;
  /** 보여줄 수 있는 영상 id. 없으면 기본 그라데이션 */
  videoId: string | null;
  /** 모서리 스티커 (예: 클래스 수 별) */
  sticker?: ReactNode;
  /** 줄에서 몇 번째인지. 번갈아 기울인다 */
  index?: number;
};

// 곡 포토카드. 누르면 곡 상세로 간다 (재생하는 VideoCard와 달리 썸네일만)
export function SongCard({ slug, title, artistName, videoId, sticker, index = 0 }: Props) {
  const tilt = index % 2 === 0 ? "-rotate-[1.6deg]" : "rotate-[1.4deg] mt-2";
  return (
    <Link href={`/song/${slug}`} className={`press sticker-edge relative block rounded-[20px] bg-card p-2 pb-3 ${tilt}`}>
      <Tape className="left-[58px] -top-[11px] -rotate-[4deg]" />
      <div className="relative aspect-video overflow-hidden rounded-[14px] border-2 border-ink bg-[linear-gradient(135deg,var(--color-pink-soft),var(--color-lilac))]">
        {videoId && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube 썸네일은 외부 이미지라 그대로 쓴다 */}
            <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/80 px-1.5 py-0.5 font-zine text-[9px] font-extrabold uppercase tracking-[.04em] text-white">
              YouTube
            </span>
          </>
        )}
      </div>
      <div className="mt-2.5 truncate px-1 font-display text-[22px] leading-[1.1]">{title}</div>
      <div className="mt-0.5 truncate px-1 text-xs font-bold text-sub">{artistName}</div>
      {sticker && <div className="absolute -top-3 -right-2.5 rotate-12">{sticker}</div>}
    </Link>
  );
}
