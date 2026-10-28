import Link from "next/link";
import type { ReactNode } from "react";
import { ClassTicket } from "@/components/class-ticket";
import { SongCard } from "@/components/song-card";
import { StarBurst } from "@/components/star-burst";
import { StickerLabel } from "@/components/sticker-label";
import { formatPrice, formatTimeRange, LEVEL_LABEL } from "@/lib/format";
import type { HotSong, UpcomingClassCard } from "@/server/classes";
import type { TopRequestedSong } from "@/server/requests";

// 홈의 세 묶음. 데이터만 받아 그린다 (빈 묶음·여러 장을 가짜 데이터로도 확인할 수 있게)
export function HomeView({ hot, upcoming, top }: { hot: HotSong[]; upcoming: UpcomingClassCard[]; top: TopRequestedSong[] }) {
  if (hot.length === 0 && upcoming.length === 0 && top.length === 0) {
    return (
      <p className="mx-5 mt-8 rounded-2xl border-2 border-dashed border-ink/40 bg-card/60 p-4 text-sm font-semibold text-sub">
        아직 열린 클래스도, 추가요도 없어요
      </p>
    );
  }

  return (
    <>
      {hot.length > 0 && <HotSongs songs={hot} />}
      {upcoming.length > 0 && <UpcomingClasses classes={upcoming} />}
      {top.length > 0 && <TopRequests songs={top} />}
    </>
  );
}

function SectionHead({ title, label, zine }: { title: string; label?: ReactNode; zine: string }) {
  return (
    <div className="mb-1 flex items-center justify-between px-5">
      <h2 className="font-display text-[23px]">
        {title}
        {label}
      </h2>
      <span className="font-zine text-xs font-extrabold uppercase">{zine}</span>
    </div>
  );
}

function HotSongs({ songs }: { songs: HotSong[] }) {
  return (
    <section className="mt-8">
      <SectionHead
        title="이번 주 핫한 곡"
        label={<StickerLabel tone="butter" className="ml-1.5 align-[4px]">HOT!</StickerLabel>}
        zine="This week"
      />
      {/* 가로로 넘기는 포토카드 줄. 카드가 기울고 스티커가 튀어나와 위아래 여백을 둔다 */}
      <ul className="flex snap-x gap-4 overflow-x-auto px-5 pt-5 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {songs.map((s, i) => (
          <li key={s.slug} className="w-[196px] flex-none snap-start">
            <SongCard
              slug={s.slug}
              title={s.title}
              artistName={s.artistName}
              videoId={s.videoId}
              index={i}
              sticker={
                <StarBurst size={62} tone="butter">
                  클래스
                  <br />
                  {s.classCount}
                </StarBurst>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpcomingClasses({ classes }: { classes: UpcomingClassCard[] }) {
  return (
    <section className="mt-6">
      <SectionHead
        title="다가오는 클래스"
        label={<StickerLabel tone="sky" className="ml-1.5 align-[4px]">{classes.length}</StickerLabel>}
        zine="Tickets"
      />
      <ul className="mt-2.5 space-y-4 px-5">
        {classes.map((c, i) => (
          <li key={c.id}>
            {/* 홈에서는 곡이 주인공이라 클래스 이름 대신 곡명·아티스트 (MVP 원칙 1) */}
            <ClassTicket
              href={`/class/${c.id}`}
              index={i}
              title={`${c.songTitle} · ${c.artistName}`}
              startsAt={c.startsAt}
              meta={`${formatTimeRange(c.startsAt, c.endsAt)} · ${c.regionName}`}
              detail={`${formatPrice(c.price)} · ${LEVEL_LABEL[c.level]}`}
              badge={c.status === "closing_soon" ? "마감 임박" : null}
              thumbnailUrl={c.videoId ? `https://i.ytimg.com/vi/${c.videoId}/mqdefault.jpg` : null}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const RANK_TONE = ["bg-pink text-white", "bg-sky", "bg-butter", "bg-lilac", "bg-lime"];

function TopRequests({ songs }: { songs: TopRequestedSong[] }) {
  return (
    <section className="mt-9">
      <SectionHead title="추가요 TOP 5" zine="Last 30 days" />
      <p className="px-5 text-[13px] font-semibold text-sub">누가 요청했는지는 보이지 않아요</p>
      <ol className="mt-3 space-y-2.5 px-5">
        {songs.map((s, i) => (
          <li key={s.slug} className="sticker-edge flex items-center gap-3 rounded-[18px] bg-card py-2 pr-2.5 pl-2">
            <span className={`grid h-9 w-9 flex-none place-items-center rounded-full border-2 border-ink font-display text-lg leading-none ${RANK_TONE[i]}`}>
              {i + 1}
            </span>
            <Link href={`/song/${s.slug}`} className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-extrabold">{s.title}</span>
              <span className="block truncate text-xs font-semibold text-sub">
                {s.artistName} · <b className="font-extrabold text-ink">{s.waiting}명</b>이 기다려요
              </span>
            </Link>
            <Link
              href={`/song/${s.slug}?request=open`}
              aria-label={`${s.title} 추가요하러 가기`}
              className="press flex-none rounded-full border-2 border-ink bg-pink px-3 py-2 font-display text-[14px] leading-none text-white shadow-sticker-sm [-webkit-text-stroke:0.6px_var(--color-ink)]"
            >
              나도 추가요!
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
