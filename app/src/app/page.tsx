import Link from "next/link";

// 홈(F-01)은 아직 개발 전. 지금은 만든 화면으로 가는 입구만 둔다
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <p className="text-xs font-semibold text-zinc-500">All the Beat</p>
      <h1 className="mt-1 text-3xl font-extrabold">올빗</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        지금은 개발 중이에요. 만든 화면부터 하나씩 열어볼 수 있어요.
      </p>
      <Link
        href="/song/a2o-lite-neon"
        className="mt-6 flex h-12 items-center justify-center rounded-xl bg-pink-600 font-bold text-white"
      >
        곡 상세 · 추가요 (A2O LITE - NEON)
      </Link>
      <Link
        href="/spike/song"
        className="mt-3 flex h-12 items-center justify-center rounded-xl border border-zinc-300 font-semibold dark:border-zinc-700"
      >
        로그인 검증 페이지
      </Link>
    </main>
  );
}
