import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getApprovedInstructorId, getMyCopySource, getMyEncoreSource, getSongOption, listMyPlaces } from "@/server/instructors/classes";
import { listRegions } from "@/server/regions";
import { ClassForm } from "../class-form";

export const metadata: Metadata = { title: "새 클래스 | 올빗", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ song?: string; copy?: string; encoreOf?: string }> };

async function getRegions() {
  "use cache";
  cacheLife("days");
  return listRegions();
}

// T-02 클래스 등록 (F-12). ?song= 곡 미리 선택, ?copy= 지난 클래스 복사, ?encoreOf= 앵콜 클래스. 입력 화면이라 탭바 없음
export default function NewClassPage({ searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <Link href="/me/classes" className="press rounded-full border-2 border-ink bg-card px-3.5 py-1 text-[13px] font-black shadow-sticker-sm">
          내 클래스로
        </Link>
      </div>
      <Suspense fallback={<p className="px-5 pt-8 text-sm font-semibold text-sub">불러오는 중…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/me");
  const instructorId = await getApprovedInstructorId(user.id);
  if (!instructorId) redirect("/me/teacher/apply");

  const { song, copy, encoreOf } = await searchParams;
  const copyId = Number(copy);
  const encoreId = Number(encoreOf);
  const [regions, places, preset, copySource, encoreSource] = await Promise.all([
    getRegions(),
    listMyPlaces(instructorId),
    song ? getSongOption(song) : Promise.resolve(null),
    Number.isInteger(copyId) && copyId > 0 ? getMyCopySource(instructorId, copyId).catch(() => null) : Promise.resolve(null),
    Number.isInteger(encoreId) && encoreId > 0 ? getMyEncoreSource(instructorId, encoreId).catch(() => null) : Promise.resolve(null),
  ]);
  const source = encoreSource ?? copySource;

  return (
    <div className="px-5">
      <h1 className="mt-4 font-display text-[28px] leading-tight">{encoreSource ? "앵콜 클래스 열기" : copySource ? "복사해서 다시 열기" : "새 클래스"}</h1>
      <p className="mt-1 text-[13px] font-semibold text-sub">
        {encoreSource ? "원 클래스 값을 채워 뒀어요. 날짜를 넣고 바뀐 것만 고쳐 주세요." : copySource ? "장소·가격·링크를 채워 뒀어요. 날짜와 곡만 바꾸면 돼요." : "필수 7개만 넣으면 바로 공개돼요"}
      </p>
      {preset && (
        <div className="mt-4 rounded-2xl border-2 border-ink bg-pink-soft p-3.5">
          <p className="font-display text-[18px]">{preset.waiting > 0 ? `${preset.waiting}명이 기다리는 곡이에요` : "이 곡으로 열어요"}</p>
          <p className="text-[13px] font-semibold text-sub">{preset.label}</p>
        </div>
      )}
      <ClassForm regions={regions} places={places} source={source} presetSong={preset ? { id: preset.id, label: preset.label } : null} encoreOfClassId={encoreSource?.encoreOfClassId ?? null} />
    </div>
  );
}
