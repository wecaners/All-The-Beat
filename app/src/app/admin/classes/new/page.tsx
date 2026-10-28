import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { listPlacesForInstructor } from "@/server/admin/classes";
import { listInstructorsForAdmin } from "@/server/admin/instructors";
import { todayKst } from "@/server/admin/shared";
import { listRegions } from "@/server/regions";
import { Section } from "../../ui";
import { ClassForm } from "./class-form";

type Props = { searchParams: Promise<{ instructor?: string }> };

export default function NewClassPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">불러오는 중…</p>}>
      <NewClass searchParams={searchParams} />
    </Suspense>
  );
}

async function NewClass({ searchParams }: Props) {
  await requireAdmin();
  const instructorParam = Number((await searchParams).instructor);
  const [instructors, regions] = await Promise.all([listInstructorsForAdmin(), listRegions()]);
  const instructorId = instructors.some((i) => i.id === instructorParam) ? instructorParam : null;
  const places = instructorId ? await listPlacesForInstructor(instructorId) : [];

  return (
    <Section title="클래스 대리 등록">
      {instructors.length === 0 ? (
        <p className="text-sm text-zinc-500">강사가 먼저 있어야 해요. 위 메뉴에서 등록해 주세요.</p>
      ) : (
        <ClassForm
          key={instructorId ?? "none"}
          instructors={instructors}
          instructorId={instructorId}
          places={places}
          regions={regions}
          today={todayKst()}
        />
      )}
    </Section>
  );
}
