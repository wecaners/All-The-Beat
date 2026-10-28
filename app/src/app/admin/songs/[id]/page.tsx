import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { getSongForAdmin } from "@/server/admin/songs";
import { Section } from "../../ui";
import { SongForm } from "../song-form";
import { VideoForm } from "../video-form";

type Props = { params: Promise<{ id: string }> };

export default function EditSongPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <EditSong params={params} />
    </Suspense>
  );
}

async function EditSong({ params }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  const song = Number.isInteger(id) ? await getSongForAdmin(id) : null;
  if (!song) notFound();

  return (
    <>
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
    </>
  );
}
