import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClassTicket } from "@/components/class-ticket";
import { Logo } from "@/components/logo";
import { stickerButtonClass } from "@/components/sticker-button";
import { SongRow } from "@/components/song-row";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatShortDate } from "@/lib/format";
import { listMyEncores, listMyRequests, type MyEncoreItem, type MyRequestItem } from "@/server/me";
import { getProfile } from "@/server/profiles";
import { signOutAction } from "./actions";
import { LoginCard } from "./login-card";

export const metadata: Metadata = { title: "마이 | 올빗", robots: { index: false, follow: false } };

// F-10 마이 (U-09). 알림이 없는 지금, 내 추가요·앵콜이 어떻게 됐는지 보는 곳이다. 수정·취소는 곡·클래스 상세에서 (와이어프레임 U-09b)
export default function MyPage() {
  return (
    <main className="mx-auto w-full max-w-md pb-16">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">My</span>
      </div>
      <Suspense fallback={<MySkeleton />}>
        <MyContent />
      </Suspense>
    </main>
  );
}

// 로그인 상태와 내 요청은 요청마다 다르다 (getCurrentUser가 connection() 뒤에 읽는다)
async function MyContent() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <>
        <LoginCard />
        <LegalLinks />
      </>
    );

  const [profile, requests, encores] = await Promise.all([getProfile(user.id), listMyRequests(user.id), listMyEncores(user.id)]);

  return (
    <>
      <p className="mt-4 px-5 font-display text-[28px] leading-tight">{profile?.nickname ?? "올빗 친구"}님</p>
      <p className="px-5 text-[13px] font-semibold text-sub">카카오로 로그인했어요</p>

      <section className="mt-8 px-5">
        <SectionTitle title="내 추가요" count={requests.length} />
        {requests.length === 0 ? (
          <Empty text="아직 남긴 추가요가 없어요. 배우고 싶은 곡을 찾아 추가요해 보세요." />
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((r) => (
              <li key={r.songSlug}>
                <RequestRow r={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-9 px-5">
        <SectionTitle title="내 앵콜" count={encores.length} />
        {encores.length === 0 ? (
          <Empty text="아직 남긴 앵콜이 없어요. 마감된 클래스에서 앵콜할 수 있어요." />
        ) : (
          <ul className="mt-3 space-y-3">
            {encores.map((e) => (
              <li key={e.classId}>
                <EncoreTicket e={e} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={signOutAction} className="mt-12 px-5">
        <button className={stickerButtonClass({ variant: "soft", size: "md", display: false })}>로그아웃</button>
      </form>
      <LegalLinks />
    </>
  );
}

// 약관 보기 (F-10). 로그인 전·후 모두 보인다
function LegalLinks() {
  return (
    <p className="mt-6 flex justify-center gap-4 px-5 text-[12px] font-bold text-sub">
      <Link href="/terms" className="underline underline-offset-2">
        이용약관
      </Link>
      <Link href="/privacy" className="underline underline-offset-2">
        개인정보처리방침
      </Link>
    </p>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="font-display text-[23px]">
      <span className="mark-lime">{title}</span> <span className="text-[18px] text-sub">{count}</span>
    </h2>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-2xl border-2 border-dashed border-ink/40 p-4">
      <p className="text-[14px] font-semibold text-sub">{text}</p>
      <Link href="/search" className={`mt-3 ${stickerButtonClass({ variant: "white", size: "md", display: false })}`}>
        곡 찾으러 가기
      </Link>
    </div>
  );
}

// 열린 추가요는 검은 라벨로 눈에 띄게, 열린 클래스로 바로 간다 (와이어프레임 U-09b)
function RequestRow({ r }: { r: MyRequestItem }) {
  const meta = `${r.regionName ?? "어디든"} · ${formatShortDate(r.createdAt)}`;
  return (
    <SongRow
      slug={r.songSlug}
      title={r.title}
      artistName={r.artistName}
      videoId={r.videoId}
      meta={meta}
      href={r.openedClassId ? `/class/${r.openedClassId}` : undefined}
      status={
        r.status === "opened" ? (
          <span className="rounded-full bg-ink px-2 py-0.5 text-white">클래스가 열렸어요 ›</span>
        ) : (
          <span className="rounded-full bg-pink-soft px-2 py-0.5">기다리는 중 · {r.waiting}명</span>
        )
      }
    />
  );
}

// 앵콜 상태 문구는 클래스 상세와 같은 사실만 (specs/encore FR-9)
function encoreStatusText(e: MyEncoreItem): string {
  switch (e.status) {
    case "collecting":
      return `앵콜 모으는 중 ${e.count}/${e.threshold}명`;
    case "delivered":
      return `강사님께 전달됐어요 · ${e.count}명`;
    case "reviewing":
      return `강사님이 검토 중이에요 · ${e.count}명`;
    case "opened":
      return "앵콜 클래스가 열렸어요";
    case "declined":
      return "이번엔 앵콜이 어렵대요";
    case "expired":
      return "앵콜 기간이 끝났어요";
  }
}

function EncoreTicket({ e }: { e: MyEncoreItem }) {
  return (
    <ClassTicket
      href={`/class/${e.encoreClassId ?? e.classId}`}
      title={e.title}
      startsAt={e.startsAt}
      meta={`강사 ${e.instructorName}`}
      detail={encoreStatusText(e)}
      badge={e.encoreClassId ? "앵콜 클래스 보기" : null}
    />
  );
}

function MySkeleton() {
  return (
    <div className="animate-pulse px-5 pt-6">
      <div className="h-9 w-40 rounded-lg bg-lime/50" />
      <div className="mt-8 h-20 w-full rounded-2xl border-2 border-ink/20 bg-card" />
      <div className="mt-3 h-20 w-full rounded-2xl border-2 border-ink/20 bg-card" />
    </div>
  );
}
