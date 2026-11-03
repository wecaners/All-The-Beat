import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { getSongForAdmin } from "@/server/admin/songs";
import { Section } from "../../ui";
import { SongForm } from "../song-form";
import { ConfirmSongButton, MergeSongForm } from "../review-forms";
import { VideoForm } from "../video-form";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ merged?: string }> };

const CREATOR_TEXT = { admin: "운영자", member: "수강생", instructor: "강사" } as const;
const KST_DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });

export default function EditSongPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <EditSong params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditSong({ params, searchParams }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  const song = Number.isInteger(id) ? await getSongForAdmin(id) : null;
  if (!song) notFound();
  // 병합 직후 결과 (mergeSongAction이 redirect로 넘겨준다): 클래스,추가요,겹친 추가요,별칭
  const merged = (await searchParams).merged?.split(",").map(Number);

  return (
    <>
      {merged && merged.length === 4 && (
        <p className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          합쳤어요. 클래스 {merged[0]}개, 추가요 {merged[1]}건, 별칭 {merged[3]}개가 이 곡으로 옮겨졌어요
          {merged[2] > 0 && ` (겹친 추가요 ${merged[2]}건은 이 곡 것만 남겼어요)`}.
        </p>
      )}
      {song.merged && <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">이미 다른 곡으로 합쳐진 곡이에요. 옛 주소는 대상 곡으로 넘어가요.</p>}
      <Section
        title={`${song.title} - ${song.artistName}`}
        action={
          <a href={`/song/${song.slug}`} target="_blank" rel="noreferrer" className="text-sm underline">
            곡 상세 보기 ↗
          </a>
        }
      >
        <SongForm key={song.slug} song={song} />
      </Section>
      <Section title="대표 영상">
        <VideoForm songId={song.id} video={song.video} />
      </Section>
      {!song.merged && (
        <>
          <Section title="검수 (F-16)">
            <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
              <dt className="text-zinc-500">상태</dt>
              <dd>{song.pendingReview ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">검수 대기</span> : "검수 완료"}</dd>
              <dt className="text-zinc-500">만든 사람</dt>
              <dd>
                {CREATOR_TEXT[song.creator]}
                {song.creatorNickname ? ` · ${song.creatorNickname}` : ""} · {KST_DATE.format(song.createdAt)}
              </dd>
            </dl>
            {song.pendingReview && (
              <div className="mt-3">
                <p className="mb-2 text-sm text-zinc-500">곡명·아티스트가 맞으면 확인을, 중복이면 아래에서 기존 곡으로 합쳐 주세요. 수정해서 저장해도 검수가 끝나요.</p>
                <ConfirmSongButton songId={song.id} />
              </div>
            )}
          </Section>
          <Section title="다른 곡으로 합치기">
            <MergeSongForm songId={song.id} classCount={song.classCount} requestCount={song.requestCount} />
          </Section>
        </>
      )}
    </>
  );
}
