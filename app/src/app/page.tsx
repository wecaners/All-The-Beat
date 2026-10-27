import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <p className="text-xs font-semibold text-zinc-500">All the Beat</p>
      <h1 className="mt-1 text-3xl font-extrabold">올빗</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        지금은 개발 첫 단계예요. 인스타·카톡 인앱 브라우저에서 카카오 로그인이 끊기지 않는지 검증하고 있어요.
      </p>
      <Link
        href="/spike/song"
        className="mt-6 flex h-12 items-center justify-center rounded-xl bg-zinc-900 font-bold text-white dark:bg-white dark:text-zinc-900"
      >
        로그인 검증 시작
      </Link>
      <p className="mt-4 text-xs text-zinc-500">
        테스트 방법: 이 주소를 인스타 DM이나 카톡으로 나에게 보내고, 앱 안에서 링크를 눌러 열어주세요.
      </p>
    </main>
  );
}
