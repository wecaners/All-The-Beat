import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { getInstructorForAdmin } from "@/server/admin/instructors";
import { getInstructorMediaForAdmin, listStudiosForAdmin } from "@/server/admin/studios";
import { listRegions } from "@/server/regions";
import { todayKst } from "@/server/admin/shared";
import { linkButtonClass, Section } from "../../ui";
import { ConsentForm } from "../instructor-forms";
import { InstructorMediaForm } from "../profile-forms";
import { StudioCard, StudioPicker } from "../studio-forms";

type Props = { params: Promise<{ id: string }> };

const KST_DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });

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
