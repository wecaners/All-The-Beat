import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { listArtistsForAdmin } from "@/server/admin/songs";
import { Section } from "../ui";
import { MergeArtistForm, RenameArtistForm } from "./artist-forms";

// 아티스트 관리 (F-16): 대표 이름 수정, 중복 아티스트 병합. 곡 주소는 바뀌지 않는다
export default function ArtistsPage() {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <Artists />
    </Suspense>
  );
}

async function Artists() {
  await requireAdmin();
  const artists = await listArtistsForAdmin();
  return (
    <Section title={`아티스트 ${artists.length}`}>
      <p className="mb-3 text-sm text-zinc-500">이름을 고치면 곡 화면과 검색에 바로 반영돼요. 합치면 곡·별칭이 대상으로 옮겨지고 이 이름은 대상의 별칭이 돼요.</p>
      {artists.length === 0 && <p className="text-sm text-zinc-500">아직 없어요</p>}
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        {artists.map((a) => (
          <li key={a.id} className="space-y-2 p-3">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-bold">{a.name}</span>
              <span className="text-zinc-500">곡 {a.songCount}</span>
              {a.aliases.length > 0 && <span className="text-xs text-zinc-500">별칭: {a.aliases.join(", ")}</span>}
            </div>
            <RenameArtistForm artist={a} />
            <MergeArtistForm artist={a} others={artists.filter((o) => o.id !== a.id)} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
