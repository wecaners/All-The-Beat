import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { ADMIN_CLASS_STATUSES, listClassesForAdmin, parseAdminClassFilters } from "@/server/admin/classes";
import { listInstructorsForAdmin } from "@/server/admin/instructors";
import { listRegions } from "@/server/regions";
import { buttonClass, inputClass, linkButtonClass, Section, Table, Td } from "../ui";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUS_TEXT = { open: "모집 중", closing_soon: "마감 임박", closed: "마감", ended: "끝남", canceled: "취소" } as const;
const KST_SHORT = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// 전체 클래스 (F-17). 필터는 주소에
export default function AdminClassesPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <Classes searchParams={searchParams} />
    </Suspense>
  );
}

async function Classes({ searchParams }: Props) {
  await requireAdmin();
  const raw = await searchParams;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (first) p.set(k, first);
  }
  const filters = parseAdminClassFilters(p);
  const [rows, instructors, regions] = await Promise.all([listClassesForAdmin(filters), listInstructorsForAdmin(), listRegions()]);

  return (
    <Section title={`클래스 ${rows.length}`} action={<Link href="/admin/classes/new" className={linkButtonClass}>+ 클래스</Link>}>
      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-6">
        <select name="status" defaultValue={filters.status ?? ""} className={inputClass}>
          <option value="">상태 전체</option>
          {ADMIN_CLASS_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_TEXT[s]}
            </option>
          ))}
        </select>
        <select name="instructor" defaultValue={filters.instructorId ?? ""} className={inputClass}>
          <option value="">강사 전체</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.displayName}
            </option>
          ))}
        </select>
        <select name="region" defaultValue={filters.regionId ?? ""} className={inputClass}>
          <option value="">권역 전체</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.shortName}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={filters.q ?? ""} placeholder="클래스·곡·아티스트" className={inputClass} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hidden" value="1" defaultChecked={filters.hiddenOnly} /> 숨김만
        </label>
        <div className="flex gap-2">
          <button className={buttonClass}>적용</button>
          <Link href="/admin/classes" className={`${linkButtonClass} flex items-center`}>
            초기화
          </Link>
        </div>
      </form>
      <Table head={["일시", "클래스", "강사", "권역", "공개", "상태", "클릭", "앵콜"]} empty={rows.length === 0}>
        {rows.map((c) => (
          <tr key={c.id} className={c.isHidden ? "opacity-60" : undefined}>
            <Td>{KST_SHORT.format(c.startsAt)}</Td>
            <Td>
              <Link href={`/admin/classes/${c.id}`} className="underline">
                {c.title}
              </Link>
              <span className="ml-1 text-xs text-zinc-500">{c.songTitle}</span>
            </Td>
            <Td>{c.instructorName}</Td>
            <Td>{c.regionName}</Td>
            <Td>{c.isHidden ? "🙈 숨김" : c.isPublic ? "✅" : "⏸"}</Td>
            <Td>{STATUS_TEXT[c.status]}</Td>
            <Td>{c.bookingClicks}</Td>
            <Td>{c.encoreCount}</Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}
