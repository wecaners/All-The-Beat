import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { listRegions } from "@/server/regions";
import { Section } from "../../ui";
import { InstructorForm } from "../instructor-forms";

export default function NewInstructorPage() {
  return (
    <Suspense fallback={null}>
      <NewInstructor />
    </Suspense>
  );
}

async function NewInstructor() {
  await requireAdmin();
  const regions = await listRegions();
  return (
    <Section title="대리 강사 등록">
      <p className="text-sm text-zinc-500">
        강사 카카오 계정과 아직 연결되지 않은 프로필이에요. 게재 동의를 기록하기 전에는 이 강사의 클래스가 수강생에게 보이지 않아요.
      </p>
      <InstructorForm regions={regions} />
    </Section>
  );
}
