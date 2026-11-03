import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { listSongsForAdmin } from "@/server/admin/songs";
import { linkButtonClass, Section, Table, Td } from "../ui";

type Props = { searchParams: Promise<{ review?: string }> };

const CREATOR_TEXT = { admin: "운영자", member: "수강생", instructor: "강사" } as const;
const KST_DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

// 곡 목록 (F-16). ?review=pending이면 검수 대기만
export default function SongsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <Songs searchParams={searchParams} />
    </Suspense>
  );
}

async function Songs({ searchParams }: Props) {
  await requireAdmin();
  const pendingOnly = (await searchParams).review === "pending";
  const songs = await listSongsForAdmin(pendingOnly);
  const tab = (on: boolean) => `${linkButtonClass} ${on ? "bg-zinc-900 text-white" : ""}`;

  return (
    <Section
      title={pendingOnly ? `검수 대기 곡 ${songs.length}` : `곡 ${songs.length}`}
      action={
        <span className="flex gap-2">
          <Link href="/admin/songs" className={tab(!pendingOnly)}>
            전체
          </Link>
          <Link href="/admin/songs?review=pending" className={tab(pendingOnly)}>
            검수 대기
          </Link>
          <Link href="/admin/songs/new" className={linkButtonClass}>
            + 곡
          </Link>
        </span>
      }
    >
      <p className="mb-3 text-sm text-zinc-500">수강생·강사가 만든 곡은 검수 대기로 쌓여요. 곡 상세에서 확인하거나, 중복이면 기존 곡으로 합쳐 주세요.</p>
      <Table head={["곡", "아티스트", "만든 사람", "만든 날", "영상", "검수"]} empty={songs.length === 0}>
        {songs.map((s) => (
          <tr key={s.id}>
            <Td>
              <Link href={`/admin/songs/${s.id}`} className="underline">
                {s.title}
              </Link>
            </Td>
            <Td>{s.artistName}</Td>
            <Td>{CREATOR_TEXT[s.creator]}</Td>
            <Td>{KST_DATE.format(s.createdAt)}</Td>
            <Td>{s.hasVideo ? "✅" : "—"}</Td>
            <Td>{s.pendingReview ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">검수 대기</span> : "—"}</Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}
