import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { LEVEL_LABEL } from "@/lib/format";
import { getClassForAdmin } from "@/server/admin/classes";
import { listRegions } from "@/server/regions";
import { ActionButton } from "../../action-button";
import { endClassAction, setClassClosedAction, setClassHiddenAction } from "../../actions";
import { linkButtonClass, Section } from "../../ui";
import { AdminCancelForm, BookingUrlForm } from "./manage-forms";

type Props = { params: Promise<{ id: string }> };

const STATUS_TEXT = { open: "모집 중", closing_soon: "마감 임박", closed: "마감", ended: "끝남", canceled: "취소" } as const;

// 클래스 하나 손보기 (F-17): 숨김·예약 링크·마감·강제 종료·취소. 내용 수정은 강사가(내 클래스) 또는 등록 폼으로
export default function AdminClassPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <ClassDetail params={params} />
    </Suspense>
  );
}

async function ClassDetail({ params }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  const c = Number.isInteger(id) && id > 0 ? await getClassForAdmin(id) : null;
  if (!c) notFound();
  const regions = await listRegions();
  const live = c.status !== "ended" && c.status !== "canceled";

  return (
    <>
      <Section
        title={c.title}
        action={
          <span className="flex gap-2">
            <Link href="/admin/classes" className={linkButtonClass}>
              목록
            </Link>
            <a href={`/class/${c.id}`} target="_blank" rel="noreferrer" className={linkButtonClass}>
              수강생 화면 ↗
            </a>
          </span>
        }
      >
        <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
          <dt className="text-zinc-500">상태</dt>
          <dd>
            {STATUS_TEXT[c.status]}
            {c.cancelReason ? ` · ${c.cancelReason}` : ""}
          </dd>
          <dt className="text-zinc-500">공개</dt>
          <dd>{c.isHidden ? "🙈 운영자가 숨김" : c.isPublic ? "✅ 수강생에게 보여요" : "⏸ 강사 승인·동의 전"}</dd>
          <dt className="text-zinc-500">일시</dt>
          <dd>
            {c.date} {c.startTime}~{c.endTime}
          </dd>
          <dt className="text-zinc-500">장소</dt>
          <dd>
            {c.studioName} · {c.address} · {regions.find((r) => r.id === c.regionId)?.shortName ?? ""}
          </dd>
          <dt className="text-zinc-500">곡</dt>
          <dd>{c.songs.map((s) => s.label).join(" / ")}</dd>
          <dt className="text-zinc-500">가격·난이도</dt>
          <dd>
            {c.price.toLocaleString("ko-KR")}원 · {LEVEL_LABEL[c.level]}
            {c.capacity ? ` · 정원 ${c.capacity}` : ""}
          </dd>
          <dt className="text-zinc-500">강사</dt>
          <dd>
            {c.instructorName} ·{" "}
            <a href={`https://www.instagram.com/${c.instagramHandle}/`} target="_blank" rel="noreferrer" className="underline">
              @{c.instagramHandle}
            </a>
          </dd>
          <dt className="text-zinc-500">올린 주체</dt>
          <dd>{c.createdByAdmin ? "운영자 대리 등록" : "강사 직접"}</dd>
          <dt className="text-zinc-500">예약 링크</dt>
          <dd className="break-all">
            <a href={c.bookingUrl} target="_blank" rel="noreferrer" className="underline">
              {c.bookingUrl}
            </a>{" "}
            <span className="text-zinc-500">({c.bookingType})</span>
          </dd>
          <dt className="text-zinc-500">지표</dt>
          <dd>
            예약 클릭 {c.bookingClicks} · 앵콜 {c.encoreCount}
          </dd>
          {c.description && (
            <>
              <dt className="text-zinc-500">설명</dt>
              <dd className="whitespace-pre-wrap">{c.description}</dd>
            </>
          )}
          {c.teaserVideoId && (
            <>
              <dt className="text-zinc-500">티저 영상</dt>
              <dd>
                <a href={`https://www.youtube.com/watch?v=${c.teaserVideoId}`} target="_blank" rel="noreferrer" className="underline">
                  youtu.be/{c.teaserVideoId}
                </a>
              </dd>
            </>
          )}
        </dl>
      </Section>

      <Section title="숨김">
        <p className="mb-2 text-sm text-zinc-500">신고·오류가 있으면 숨겨요. 상태는 그대로고 강사의 내 클래스에는 남아요.</p>
        {c.isHidden ? (
          <ActionButton label="숨김 풀기" run={setClassHiddenAction.bind(null, c.id, false)} />
        ) : (
          <ActionButton label="숨기기" run={setClassHiddenAction.bind(null, c.id, true)} confirm="수강생 화면에서 이 클래스를 숨길까요?" />
        )}
      </Section>

      <Section title="예약 링크 수정">
        <BookingUrlForm classId={c.id} current={c.bookingUrl} />
      </Section>

      {live && (
        <Section title="상태">
          <div className="flex flex-wrap items-center gap-3">
            {(c.status === "open" || c.status === "closing_soon") && (
              <ActionButton label="마감하기" run={setClassClosedAction.bind(null, c.id, true)} confirm={`"${c.title}"을 마감할까요? 수강생 화면에서 예약 대신 앵콜이 보여요.`} />
            )}
            {c.status === "closed" && !c.hasEncore && <ActionButton label="마감 풀기" run={setClassClosedAction.bind(null, c.id, false)} />}
            <ActionButton label="강제 종료" run={endClassAction.bind(null, c.id)} confirm={`"${c.title}"을 지금 끝난 클래스로 바꿀까요? 되돌릴 수 없어요.`} />
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <AdminCancelForm classId={c.id} title={c.title} />
          </div>
        </Section>
      )}
    </>
  );
}
