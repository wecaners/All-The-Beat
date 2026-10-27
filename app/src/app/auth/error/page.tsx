import { Suspense } from "react";
import { AuthErrorDetail } from "./auth-error-detail";

export default function AuthErrorPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-xl font-bold">로그인하지 못했어요</h1>
      <Suspense fallback={<p className="mt-4 text-sm text-zinc-500">오류 정보를 불러오는 중…</p>}>
        <AuthErrorDetail />
      </Suspense>
    </main>
  );
}
