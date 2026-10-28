import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClassTicket } from "@/components/class-ticket";
import { Logo } from "@/components/logo";
import { StickerLabel } from "@/components/sticker-label";
import { Tape } from "@/components/tape";
import { VideoCard } from "@/components/video-card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatPrice, formatTimeRange, LEVEL_LABEL, VIDEO_TYPE_ZINE } from "@/lib/format";
import { listUpcomingClassesForSong } from "@/server/classes";
import { listRegions } from "@/server/regions";
import { getMyRequest, getRequestSummary } from "@/server/requests";
import { getSongBySlug, type SongDetail } from "@/server/songs";
import { RequestPanel } from "./request-panel";

type Props = { params: Promise<{ slug: string }> };

// 한글 slug가 본문 렌더에서는 퍼센트 인코딩된 채로 들어온다(메타데이터와 다름). 한 번 풀어서 DB·캐시 키를 맞춘다
async function readSlug(params: Props["params"]): Promise<string> {
  const { slug } = await params;
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

// 곡 정보는 자주 안 바뀌어서 캐시한다. 운영자가 곡을 고치면 updateTag(`song:${slug}`)로 갱신 (F-16, 나중에)
async function getSong(slug: string) {
  "use cache";
  cacheTag(`song:${slug}`);
  cacheLife("hours");
  return getSongBySlug(slug);
}

async function getRegions() {
  "use cache";
  cacheLife("days");
  return listRegions();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lookup = await getSong(await readSlug(params));
  if (lookup.kind !== "found") return { title: "올빗" };
  const { title, artistName } = lookup.song;
  // OG 이미지는 올빗이 만든 이미지로 (03 명세 F-04, 다음 작업)
  return {
    title: `${title} - ${artistName} 원데이 클래스 | 올빗`,
    description: `${artistName} ${title} 댄스 원데이 클래스를 찾고, 없으면 추가요!`,
    openGraph: { title: `${title} - ${artistName} | 올빗`, type: "website" },
  };
}

// F-04 곡 상세 ★ 서비스의 중심 화면
export default function SongPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-20">
      <Suspense fallback={<SongSkeleton />}>
        <SongContent params={params} />
      </Suspense>
    </main>
  );
}

async function SongContent({ params }: Props) {
  const lookup = await getSong(await readSlug(params));
  if (lookup.kind === "missing") notFound();
  if (lookup.kind === "merged") permanentRedirect(`/song/${lookup.slug}`);
  const song = lookup.song;

  return (
    <>
      <SongHeader song={song} />
      <div className="px-5">
        <Suspense fallback={<div className="mt-7 h-44 animate-pulse rounded-3xl border-2 border-ink/20 bg-pink-soft" />}>
          <RequestSection song={song} />
        </Suspense>
        <Suspense fallback={<p className="mt-8 text-sm font-semibold text-sub">클래스 불러오는 중…</p>}>
          <UpcomingClasses songId={song.id} videoId={song.video?.id ?? null} />
        </Suspense>
      </div>
    </>
  );
}

function SongHeader({ song }: { song: SongDetail }) {
  return (
    <header>
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Song</span>
      </div>
      <div className="px-[22px] pt-5">
        {song.video ? (
          // 누르기 전에는 썸네일만, 누르면 YouTube 공식 임베드 (06 문서, specs/design-system FR-3)
          <VideoCard
            videoId={song.video.id}
            title={song.video.title ?? `${song.title} 안무 영상`}
            leftLabel={song.video.type ? VIDEO_TYPE_ZINE[song.video.type] : "VIDEO"}
            rightLabel={song.video.channel ?? undefined}
          />
        ) : (
          <div className="relative rotate-[-1.4deg] rounded-[26px] border-2 border-ink bg-card p-[9px] pb-3.5 shadow-sticker-lg">
            <Tape className="left-1/2 -top-3 -ml-[39px] rotate-3" />
            <div className="grid aspect-video place-items-center rounded-[18px] border-2 border-ink bg-[linear-gradient(135deg,var(--color-pink-soft),var(--color-lilac))]">
              <span className="font-display text-xl">아직 영상이 없어요</span>
            </div>
            <div className="px-1 pt-2.5 font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Coming soon</div>
          </div>
        )}
      </div>
      <div className="px-5 pt-5">
        <h1 className="font-display text-[56px] leading-[.95] break-keep">
          <span className="mark-lime">{song.title}</span>
        </h1>
        <span className="mt-2.5 inline-flex rounded-full border-2 border-ink bg-sky px-3 py-1 text-sm font-black shadow-sticker-sm">{song.artistName}</span>
      </div>
    </header>
  );
}

// 로그인 상태·내 추가요는 요청마다 다르다 → Suspense 안에서 매번 읽는다
async function RequestSection({ song }: { song: SongDetail }) {
  const user = await getCurrentUser();
  const [summary, myRequest, regions] = await Promise.all([
    getRequestSummary(song.id),
    user ? getMyRequest(user.id, song.id) : Promise.resolve(null),
    getRegions(),
  ]);

  return (
    <RequestPanel
      songId={song.id}
      songTitle={song.title}
      summary={summary}
      loggedIn={Boolean(user)}
      myRequest={myRequest}
      regions={regions}
    />
  );
}

async function UpcomingClasses({ songId, videoId }: { songId: number; videoId: string | null }) {
  // 마감·새 클래스가 바로 보여야 해서 요청 시점에 읽는다 (미리 렌더링하지 않음)
  await connection();
  const classes = await listUpcomingClassesForSong(songId);

  return (
    <section className="mt-9">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="font-display text-[23px]">
          다가오는 클래스
          {classes.length > 0 && <StickerLabel tone="sky" className="ml-1.5 align-[4px]">{classes.length}</StickerLabel>}
        </h2>
        <span className="font-zine text-xs font-extrabold uppercase">Tickets</span>
      </div>
      {classes.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-ink/40 bg-card/60 p-4 text-sm font-semibold text-sub">
          아직 열린 클래스가 없어요. 추가요가 쌓이면 강사님들이 볼 수 있어요
        </p>
      ) : (
        <ul className="space-y-4">
          {classes.map((c, i) => (
            <li key={c.id}>
              <ClassTicket
                href={`/class/${c.id}`}
                index={i}
                title={c.title}
                startsAt={c.startsAt}
                meta={`${formatTimeRange(c.startsAt, c.endsAt)} · ${c.regionName}`}
                detail={`${formatPrice(c.price)} · ${LEVEL_LABEL[c.level]}`}
                badge={c.status === "closing_soon" ? "마감 임박" : null}
                thumbnailUrl={videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SongSkeleton() {
  return (
    <div className="animate-pulse px-5 pt-14">
      <div className="aspect-video w-full rounded-[26px] border-2 border-ink/20 bg-card" />
      <div className="mt-6 h-12 w-40 rounded-xl bg-lime/50" />
      <div className="mt-3 h-7 w-28 rounded-full bg-sky/50" />
    </div>
  );
}
