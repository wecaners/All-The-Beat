import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatClassTime, formatPrice, LEVEL_LABEL, VIDEO_TYPE_LABEL } from "@/lib/format";
import { listUpcomingClassesForSong } from "@/server/classes";
import { listRegions } from "@/server/regions";
import { getMyRequest, getRequestSummary } from "@/server/requests";
import { getSongBySlug, type SongDetail } from "@/server/songs";
import { RequestPanel } from "./request-panel";

type Props = { params: Promise<{ slug: string }> };

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
  const lookup = await getSong((await params).slug);
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
    <main className="mx-auto w-full max-w-md pb-16">
      <Suspense fallback={<SongSkeleton />}>
        <SongContent params={params} />
      </Suspense>
    </main>
  );
}

async function SongContent({ params }: Props) {
  const { slug } = await params;
  const lookup = await getSong(slug);
  if (lookup.kind === "missing") notFound();
  if (lookup.kind === "merged") permanentRedirect(`/song/${lookup.slug}`);
  const song = lookup.song;

  return (
    <>
      <SongHeader song={song} />
      <div className="px-4">
        <Suspense fallback={<div className="mt-6 h-36 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}>
          <RequestSection song={song} />
        </Suspense>
        <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">클래스 불러오는 중…</p>}>
          <UpcomingClasses songId={song.id} />
        </Suspense>
      </div>
    </>
  );
}

function SongHeader({ song }: { song: SongDetail }) {
  return (
    <header>
      {song.video ? (
        <div>
          {/* YouTube 공식 임베드, 자동재생 끔 (06 문서) */}
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${song.video.id}`}
            title={song.video.title ?? `${song.title} 안무 영상`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <div className="flex items-center justify-between px-4 pt-2 text-xs text-zinc-500">
            <span>
              {song.video.type ? VIDEO_TYPE_LABEL[song.video.type] : "영상"}
              {song.video.channel ? ` · ${song.video.channel}` : ""}
            </span>
            <a href={`https://www.youtube.com/watch?v=${song.video.id}`} target="_blank" rel="noopener noreferrer" className="underline">
              YouTube에서 보기
            </a>
          </div>
        </div>
      ) : (
        <div className="flex aspect-video w-full items-end bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 p-4">
          <span className="text-sm font-semibold text-white/80">아직 영상이 없어요</span>
        </div>
      )}
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-extrabold">{song.title}</h1>
        <p className="text-zinc-500">{song.artistName}</p>
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

async function UpcomingClasses({ songId }: { songId: number }) {
  // 마감·새 클래스가 바로 보여야 해서 요청 시점에 읽는다 (미리 렌더링하지 않음)
  await connection();
  const classes = await listUpcomingClassesForSong(songId);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">다가오는 클래스</h2>
      {classes.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
          아직 열린 클래스가 없어요. 추가요가 쌓이면 강사님들이 볼 수 있어요
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {classes.map((c) => (
            <li key={c.id}>
              <a href={`/class/${c.id}`} className="block rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {formatClassTime(c.startsAt, c.endsAt)} · {c.regionName}
                </p>
                <p className="mt-1 text-sm">
                  {formatPrice(c.price)} · {LEVEL_LABEL[c.level]} · {c.instructorName}
                  {c.status === "closing_soon" && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">마감 임박</span>}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SongSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video w-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="px-4 pt-4">
        <div className="h-7 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
