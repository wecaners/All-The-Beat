import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { listUpcomingClassesForAdmin } from "@/server/admin/classes";
import { listInstructorsForAdmin } from "@/server/admin/instructors";
import { listSongsForAdmin } from "@/server/admin/songs";
import { linkButtonClass, Section, Table, Td } from "./ui";

const KST_SHORT = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdmin();
  const [songs, instructors, classes] = await Promise.all([listSongsForAdmin(), listInstructorsForAdmin(), listUpcomingClassesForAdmin()]);

  return (
    <>
      <Section title={`다가오는 클래스 ${classes.length}`} action={<Link href="/admin/classes/new" className={linkButtonClass}>+ 클래스</Link>}>
        <Table head={["일시", "클래스", "강사", "권역", "공개"]} empty={classes.length === 0}>
          {classes.map((c) => (
            <tr key={c.id}>
              <Td>{KST_SHORT.format(c.startsAt)}</Td>
              <Td>{c.title}</Td>
              <Td>{c.instructorName}</Td>
              <Td>{c.regionName}</Td>
              <Td>{c.isPublic ? "✅" : "⏸ 동의 전"}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title={`강사 ${instructors.length}`} action={<Link href="/admin/instructors/new" className={linkButtonClass}>+ 강사</Link>}>
        <Table head={["활동명", "인스타", "게재 동의", "클래스"]} empty={instructors.length === 0}>
          {instructors.map((i) => (
            <tr key={i.id}>
              <Td>
                <Link href={`/admin/instructors/${i.id}`} className="underline">
                  {i.displayName}
                </Link>
              </Td>
              <Td>@{i.instagramHandle}</Td>
              <Td>{!i.isProxy ? "직접 가입" : i.consentAt ? "✅" : "⏸ 없음"}</Td>
              <Td>{i.classCount}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title={`곡 ${songs.length}`} action={<Link href="/admin/songs/new" className={linkButtonClass}>+ 곡</Link>}>
        <Table head={["곡", "아티스트", "주소", "영상"]} empty={songs.length === 0}>
          {songs.map((s) => (
            <tr key={s.id}>
              <Td>
                <Link href={`/admin/songs/${s.id}`} className="underline">
                  {s.title}
                </Link>
              </Td>
              <Td>{s.artistName}</Td>
              <Td>
                <a href={`/song/${s.slug}`} target="_blank" rel="noreferrer" className="text-zinc-500 underline">
                  /song/{s.slug}
                </a>
              </Td>
              <Td>{s.hasVideo ? "✅" : "—"}</Td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}
