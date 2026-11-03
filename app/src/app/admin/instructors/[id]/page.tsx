import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { getInstructorForAdmin } from "@/server/admin/instructors";
import { getInstructorMediaForAdmin, listStudiosForAdmin } from "@/server/admin/studios";
import { listRegions } from "@/server/regions";
import { todayKst } from "@/server/admin/shared";
import { linkButtonClass, Section } from "../../ui";
import { approveInstructorAction } from "../../actions";
import { ApproveButton, IssueCodeButton, RejectForm } from "../apply-forms";
import { ConsentForm } from "../instructor-forms";
import { InstructorMediaForm } from "../profile-forms";
import { StudioCard, StudioPicker } from "../studio-forms";

type Props = { params: Promise<{ id: string }> };

const KST_DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });
const APPLY_STATUS_TEXT = { pending: "승인 대기", verified: "확인됨 · 승인 대기", approved: "승인", rejected: "반려", suspended: "정지" } as const;

export default function InstructorPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <Instructor params={params} />
    </Suspense>
  );
}

async function Instructor({ params }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  const instructor = Number.isInteger(id) ? await getInstructorForAdmin(id) : null;
  if (!instructor) notFound();
  const [media, studios, regions] = await Promise.all([getInstructorMediaForAdmin(instructor.id), listStudiosForAdmin(instructor.id), listRegions()]);

  return (
    <>
      <Section
        title={instructor.displayName}
        action={
          <Link href={`/admin/classes/new?instructor=${instructor.id}`} className={linkButtonClass}>
            + 이 강사 클래스 등록
          </Link>
        }
      >
        <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
          <dt className="text-zinc-500">인스타</dt>
          <dd>
            <a href={`https://www.instagram.com/${instructor.instagramHandle}/`} target="_blank" rel="noreferrer" className="underline">
              @{instructor.instagramHandle}
            </a>
          </dd>
          <dt className="text-zinc-500">권역</dt>
          <dd>{instructor.regionNames.join(", ") || "—"}</dd>
          <dt className="text-zinc-500">클래스</dt>
          <dd>{instructor.classCount}개</dd>
          <dt className="text-zinc-500">게재 동의</dt>
          <dd>
            {!instructor.isProxy
              ? "직접 가입한 강사"
              : instructor.consentAt
                ? `✅ ${KST_DATE.format(instructor.consentAt)} · ${instructor.consentNote ?? ""}`
                : "⏸ 아직 없음 — 이 강사의 클래스는 수강생에게 보이지 않아요"}
          </dd>
        </dl>
      </Section>

      {!instructor.isProxy && (
        <Section title="강사 신청 (F-14)">
          <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
            <dt className="text-zinc-500">상태</dt>
            <dd>{APPLY_STATUS_TEXT[instructor.status]}</dd>
            <dt className="text-zinc-500">신청일</dt>
            <dd>{KST_DATE.format(instructor.createdAt)}</dd>
            <dt className="text-zinc-500">소개</dt>
            <dd>{instructor.bio ?? "—"}</dd>
            {instructor.status === "pending" && (
              <>
                <dt className="text-zinc-500">인증 코드</dt>
                <dd>{instructor.codeValid ? "발급됨 (24시간 안)" : "없음 또는 만료"}</dd>
              </>
            )}
            {instructor.status === "approved" && instructor.approvedAt && (
              <>
                <dt className="text-zinc-500">승인일</dt>
                <dd>{KST_DATE.format(instructor.approvedAt)}</dd>
              </>
            )}
            {instructor.status === "rejected" && (
              <>
                <dt className="text-zinc-500">반려 사유</dt>
                <dd>{instructor.rejectedReason}</dd>
              </>
            )}
          </dl>
          {instructor.status === "pending" && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-zinc-500">코드를 발급해 강사 인스타(@{instructor.instagramHandle})로 DM을 보내 주세요. 강사가 마이에서 넣으면 &quot;확인됨&quot;이 돼요.</p>
              <IssueCodeButton instructorId={instructor.id} hasValidCode={instructor.codeValid} />
            </div>
          )}
          {(instructor.status === "pending" || instructor.status === "verified") && (
            <div className="mt-6 space-y-4 border-t border-zinc-200 pt-4">
              <div>
                <p className="mb-2 text-sm text-zinc-500">{instructor.status === "verified" ? "본인 확인이 끝났어요." : "아직 확인 전이에요. DM으로 이미 확인했다면 바로 승인해도 돼요."}</p>
                <ApproveButton instructorId={instructor.id} run={approveInstructorAction} />
              </div>
              <RejectForm instructorId={instructor.id} />
            </div>
          )}
        </Section>
      )}

      {instructor.isProxy && (
        <Section title="게재 동의 기록">
          <p className="mb-3 text-sm text-zinc-500">
            기록하면 이 강사의 다가오는 클래스가 바로 공개되고, 그 곡들의 대기 중 추가요가 &quot;열렸어요&quot;로 바뀌어요.
          </p>
          <ConsentForm instructorId={instructor.id} today={todayKst()} hasConsent={Boolean(instructor.consentAt)} />
        </Section>
      )}

      {media && (
        <Section title="강사 소개 (클래스 상세에 보여요)">
          <InstructorMediaForm instructorId={instructor.id} isProxy={instructor.isProxy} media={media} />
        </Section>
      )}

      <Section title="스튜디오">
        <p className="mb-3 text-sm text-zinc-500">한 번 등록하면 이 강사의 클래스 등록에서 골라 써요. 시설·사진은 그 스튜디오의 모든 클래스에 나와요.</p>
        <StudioPicker instructorId={instructor.id} />
        <div className="mt-4 space-y-3">
          {studios.map((st) => (
            <div key={st.id}>
              <h3 className="mb-1 text-sm font-bold">{st.studioName}</h3>
              <StudioCard studio={st} regions={regions} />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
