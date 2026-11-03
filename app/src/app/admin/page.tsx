import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { listUpcomingClassesForAdmin } from "@/server/admin/classes";
import { countEncoresAwaitingResponse } from "@/server/admin/encores";
import { listInstructorsForAdmin } from "@/server/admin/instructors";

import { countPendingSongs, listSongsForAdmin } from "@/server/admin/songs";
import { ActionButton } from "./action-button";
import { setClassClosedAction } from "./actions";
import { linkButtonClass, Section, Table, Td } from "./ui";

// 직접 신청한 강사의 상태 (F-14). 대기·확인됨은 승인을 기다리는 것
const INSTRUCTOR_STATUS_TEXT = { pending: "⏳ 승인 대기", verified: "⏳ 확인됨 · 승인 대기", approved: "승인", rejected: "반려", suspended: "정지" } as const;

const STATUS_TEXT = { open: "모집 중", closing_soon: "마감 임박", closed: "마감", ended: "끝남", canceled: "취소" } as const;

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
  const [songs, instructors, classes, awaitingEncores, pendingSongs] = await Promise.all([
    listSongsForAdmin(),
    listInstructorsForAdmin(),
    listUpcomingClassesForAdmin(),
    countEncoresAwaitingResponse(),
    countPendingSongs(),
  ]);

  return (
    <>
      {pendingSongs > 0 && (
        <Link href="/admin/songs?review=pending" className="mt-6 block rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          검수 대기 곡 {pendingSongs}곡 — 중복이면 기존 곡으로 합쳐 주세요 ›
        </Link>
      )}
      {awaitingEncores > 0 && (
        <Link href="/admin/encores" className="mt-6 block rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          기준 인원에 닿은 앵콜 {awaitingEncores}건 — 강사님께 전하고 답을 남겨 주세요 ›
        </Link>
      )}

      <Section
        title={`다가오는 클래스 ${classes.length}`}
        action={
          <span className="flex gap-2">
            <Link href="/admin/classes" className={linkButtonClass}>
              전체 보기
            </Link>
            <Link href="/admin/classes/new" className={linkButtonClass}>
              + 클래스
            </Link>
          </span>
        }
      >
        <Table head={["일시", "클래스", "강사", "권역", "공개", "상태"]} empty={classes.length === 0}>
          {classes.map((c) => (
            <tr key={c.id}>
              <Td>{KST_SHORT.format(c.startsAt)}</Td>
              <Td>
                <Link href={`/admin/classes/${c.id}`} className="underline">
                  {c.title}
                </Link>
              </Td>
              <Td>{c.instructorName}</Td>
              <Td>{c.regionName}</Td>
              <Td>{c.isPublic ? "✅" : "⏸ 동의 전"}</Td>
              <Td>
                <span className="mr-2">{STATUS_TEXT[c.status]}</span>
                {(c.status === "open" || c.status === "closing_soon") && (
                  <ActionButton label="마감하기" run={setClassClosedAction.bind(null, c.id, true)} confirm={`"${c.title}"을 마감할까요? 수강생 화면에서 예약 대신 앵콜이 보여요.`} />
                )}
                {c.status === "closed" && !c.hasEncore && <ActionButton label="마감 풀기" run={setClassClosedAction.bind(null, c.id, false)} />}
              </Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title={`강사 ${instructors.length}`} action={<Link href="/admin/instructors/new" className={linkButtonClass}>+ 강사</Link>}>
        <Table head={["활동명", "인스타", "상태", "게재 동의", "클래스"]} empty={instructors.length === 0}>
          {instructors.map((i) => (
            <tr key={i.id}>
              <Td>
                <Link href={`/admin/instructors/${i.id}`} className="underline">
                  {i.displayName}
                </Link>
              </Td>
              <Td>@{i.instagramHandle}</Td>
              <Td>{i.isProxy ? "대리" : INSTRUCTOR_STATUS_TEXT[i.status]}</Td>
              <Td>{!i.isProxy ? "직접 가입" : i.consentAt ? "✅" : "⏸ 없음"}</Td>
              <Td>{i.classCount}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title={`곡 ${songs.length}`} action={<Link href="/admin/songs/new" className={linkButtonClass}>+ 곡</Link>}>
        <Table head={["곡", "아티스트", "주소", "영상", "검수"]} empty={songs.length === 0}>
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
              {/* 수강생이 만든 곡 (F-13). 중복이면 병합, 승인은 F-16과 함께 */}
              <Td>{s.pendingReview ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">검수 대기</span> : "—"}</Td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}
