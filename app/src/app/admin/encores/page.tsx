import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { TIME_PREF_LABEL } from "@/lib/format";
import { listEncoresForAdmin, type AdminEncoreDetail } from "@/server/admin/encores";
import { ActionButton } from "../action-button";
import { respondToEncoreAction } from "../actions";
import { linkButtonClass, Section, Table, Td } from "../ui";

const KST_DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short" });
const KST_SHORT = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// 앵콜 (specs/encore). 강사 화면·알림이 없어 운영자가 강사에게 DM으로 전하고 답을 대신 남긴다
export default function AdminEncoresPage() {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <Encores />
    </Suspense>
  );
}

async function Encores() {
  await requireAdmin();
  const { needsResponse, collecting } = await listEncoresForAdmin();

  return (
    <>
      <Section title={`응답이 필요한 앵콜 ${needsResponse.length}`}>
        {/* 강사에게 전할 때 같이 보내는 기대치 안내 (F-24 고정 문구) */}
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          강사님께 전할 때: &ldquo;앵콜은 예약이 아니라 관심 표시예요. 앵콜한 분 전원이 예약하지는 않을 수 있어요.&rdquo;
        </p>
        {needsResponse.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">아직 없어요</p>
        ) : (
          <ul className="space-y-3">
            {needsResponse.map((e) => (
              <EncoreCard key={e.classId} e={e} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={`모으는 중 ${collecting.length}`}>
        <Table head={["클래스", "강사", "인원", "만료"]} empty={collecting.length === 0}>
          {collecting.map((e) => (
            <tr key={e.classId}>
              <Td>
                <Link href={`/class/${e.classId}`} target="_blank" className="underline">
                  {e.title}
                </Link>
                <span className="ml-1 text-xs text-zinc-500">{KST_SHORT.format(e.startsAt)}</span>
              </Td>
              <Td>{e.instructorName}</Td>
              <Td>
                {e.count} / {e.threshold}
              </Td>
              <Td>{KST_DATE.format(e.expiresAt)}</Td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}

function EncoreCard({ e }: { e: AdminEncoreDetail }) {
  const canceledSinceReview = e.countAtReview !== null ? e.countAtReview - e.count : 0;
  return (
    <li className="rounded-lg border border-zinc-200 p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={`/class/${e.classId}`} target="_blank" className="font-bold underline">
          {e.title}
        </Link>
        <span className="text-xs text-zinc-500">{KST_SHORT.format(e.startsAt)} 클래스</span>
      </div>
      <p className="mt-1">
        {e.instructorName}{" "}
        <a href={`https://www.instagram.com/${encodeURIComponent(e.instagramHandle)}/`} target="_blank" rel="noreferrer" className="text-zinc-500 underline">
          @{e.instagramHandle}
        </a>
        {e.isProxy && <span className="ml-1 text-xs text-zinc-500">(대리 등록)</span>}
      </p>

      <p className="mt-2 font-semibold">
        {e.status === "reviewing" ? (
          <>
            검토 중 · 검토 시작 때 {e.countAtReview}명 · 지금 {e.count}명{canceledSinceReview > 0 && ` (취소 ${canceledSinceReview})`}
          </>
        ) : (
          <>
            전달 필요 · 지금 {e.count}명 (기준 {e.threshold}명)
          </>
        )}
      </p>
      <p className="text-xs text-zinc-500">
        {e.reachedAt && `기준 도달 ${KST_DATE.format(e.reachedAt)}`}
        {e.reviewingAt && ` · 검토 시작 ${KST_DATE.format(e.reviewingAt)}`}
        {e.status === "delivered" && ` · ${KST_DATE.format(e.expiresAt)}까지 응답이 없으면 만료`}
      </p>

      {e.timePrefs.length > 0 && (
        <p className="mt-2">
          희망 시간대: {e.timePrefs.map((t) => `${TIME_PREF_LABEL[t.timePref as keyof typeof TIME_PREF_LABEL]} ${t.count}`).join(" · ")}
        </p>
      )}
      {e.messages.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-zinc-700">
          {e.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {e.status === "delivered" && <ActionButton label="검토할게요" run={respondToEncoreAction.bind(null, e.classId, "review")} />}
        <Link href={`/admin/classes/new?encoreOf=${e.classId}`} className={linkButtonClass}>
          앵콜 클래스 등록
        </Link>
        <ActionButton
          label="이번엔 어려워요"
          run={respondToEncoreAction.bind(null, e.classId, "decline")}
          confirm="앵콜한 수강생에게 '이번엔 앵콜이 어렵대요'가 보여요. 되돌릴 수 없어요."
        />
      </div>
    </li>
  );
}
