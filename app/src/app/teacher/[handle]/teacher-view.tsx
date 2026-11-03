import { ClassTicket } from "@/components/class-ticket";
import { InfoChip } from "@/components/chip";
import { Logo } from "@/components/logo";
import { stagger } from "@/components/motion";
import { SongRow } from "@/components/song-row";
import { stickerButtonClass } from "@/components/sticker-button";
import { VideoCard } from "@/components/video-card";
import { formatPrice, formatTimeRange, LEVEL_LABEL } from "@/lib/format";
import type { TeacherProfile } from "@/server/teachers";

const STATUS_BADGE = { open: null, closing_soon: "마감 임박", closed: "마감 · 앵콜 가능" } as const;

// 강사 프로필 (F-21). 데이터만 받아 그린다 (빈 목록·동의 없는 대리 강사를 가짜 데이터로도 확인할 수 있게)
export function TeacherView({ t }: { t: TeacherProfile }) {
  const instaUrl = `https://www.instagram.com/${encodeURIComponent(t.instagramHandle)}/`;
  return (
    <>
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Teacher</span>
      </div>

      <section className="sticker-edge mx-5 mt-6 rounded-3xl bg-card p-5">
        <div className="flex items-center gap-4">
          {t.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage 공개 주소, 이미 줄인 사진
            <img src={t.photoUrl} alt={`${t.displayName} 프로필 사진`} className="h-20 w-20 flex-none rounded-full border-2 border-ink object-cover" />
          ) : (
            <span aria-hidden className="grid h-20 w-20 flex-none place-items-center rounded-full border-2 border-ink bg-pink-soft font-display text-3xl">
              {t.displayName.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-display text-[28px] leading-tight">{t.displayName}</h1>
            <p className="truncate text-[13px] font-semibold text-sub">@{t.instagramHandle}</p>
          </div>
        </div>
        {t.regionNames.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {t.regionNames.map((name) => (
              <InfoChip key={name}>{name}</InfoChip>
            ))}
          </div>
        )}
        {t.bio && <p className="mt-3 text-[15px] font-semibold leading-relaxed">{t.bio}</p>}
        <a href={instaUrl} target="_blank" rel="noopener" className={`mt-4 ${stickerButtonClass({ variant: "white", size: "md", display: false })}`}>
          인스타그램에서 더 보기
        </a>
      </section>

      {/* 포트폴리오 영상: YouTube 공식 임베드, 누를 때만 플레이어를 부른다 (product.md 화면 문구) */}
      {t.portfolioVideoIds.length > 0 && (
        <div className="mt-7 space-y-6 px-[22px]">
          {t.portfolioVideoIds.map((id, i) => (
            <VideoCard key={id} videoId={id} title={`${t.displayName} 포트폴리오 영상 ${i + 1}`} leftLabel="PORTFOLIO" rightLabel="YOUTUBE" />
          ))}
        </div>
      )}

      <section className="mt-9 px-5">
        <SectionTitle title="다가오는 클래스" count={t.upcoming.length} zine="Classes" />
        {t.upcoming.length === 0 ? (
          <Empty text={t.pastSongs.length > 0 ? "지금 열린 클래스가 없어요. 아래 곡에서 추가요할 수 있어요." : "지금 열린 클래스가 없어요."} />
        ) : (
          <ul className="mt-3 space-y-3">
            {t.upcoming.map((c, i) => (
              <li key={c.id} className="animate-stick-in" style={stagger(i)}>
                {/* 곡이 주인공이라 클래스 이름 대신 곡명·아티스트 (MVP 원칙 1) */}
                <ClassTicket
                  href={`/class/${c.id}`}
                  index={i}
                  title={`${c.songTitle} · ${c.artistName}`}
                  startsAt={c.startsAt}
                  meta={`${formatTimeRange(c.startsAt, c.endsAt)} · ${c.regionName}`}
                  detail={`${formatPrice(c.price)} · ${LEVEL_LABEL[c.level]}`}
                  badge={STATUS_BADGE[c.status]}
                  thumbnailUrl={c.videoId ? `https://i.ytimg.com/vi/${c.videoId}/mqdefault.jpg` : null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {t.pastSongs.length > 0 && (
        <section className="mt-9 px-5">
          <SectionTitle title="가르쳐 온 곡" count={t.pastSongs.length} zine="Songs" />
          <ul className="mt-3 space-y-3">
            {t.pastSongs.map((s) => (
              <li key={s.slug}>
                <SongRow
                  slug={s.slug}
                  title={s.title}
                  artistName={s.artistName}
                  videoId={s.videoId}
                  status={<span className="text-sub">클래스 {s.times}번 열었어요</span>}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SectionTitle({ title, count, zine }: { title: string; count: number; zine: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-[23px]">
        <span className="mark-lime">{title}</span> <span className="text-[18px] text-sub">{count}</span>
      </h2>
      <span className="font-zine text-xs font-extrabold uppercase">{zine}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-3 rounded-2xl border-2 border-dashed border-ink/40 p-4 text-[14px] font-semibold text-sub">{text}</p>;
}
