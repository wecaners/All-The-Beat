import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { Section } from "../../ui";
import { SongForm } from "../song-form";

export default function NewSongPage() {
  return (
    <Suspense fallback={null}>
      <NewSong />
    </Suspense>
  );
}

async function NewSong() {
  await requireAdmin();
  return (
    <Section title="곡 등록">
      <p className="text-sm text-zinc-500">등록하면 바로 곡 상세가 열리고 추가요를 받을 수 있어요. 대표 영상은 등록 뒤에 지정해요.</p>
      <SongForm />
    </Section>
  );
}
