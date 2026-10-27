import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SpikeSong } from "./spike-song";

// 기술 검증 T-1: 곡 상세에서 [추가요!] → 카카오 로그인 → 이 화면으로 복귀 → 추가요 시트 자동 오픈 (05 플로우 3)
export default function SpikeSongPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16">
      <header className="pt-6">
        <p className="text-xs font-semibold text-zinc-500">기술 검증 T-1 · 가짜 곡 상세</p>
        <h1 className="mt-1 text-2xl font-extrabold">NEON</h1>
        <p className="text-sm text-zinc-500">A2O LITE</p>
      </header>

      {!isSupabaseConfigured ? (
        <p className="mt-6 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 환경변수가 없어요. app/.env.local 에 NEXT_PUBLIC_SUPABASE_URL 과
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 넣어주세요 (.env.local.example 참고).
        </p>
      ) : (
        <>
          <Suspense fallback={<StatusBox label="서버가 본 로그인" value="확인 중…" />}>
            <ServerSession />
          </Suspense>
          <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">불러오는 중…</p>}>
            <SpikeSong />
          </Suspense>
        </>
      )}
    </main>
  );
}

// 서버(쿠키)에서 세션이 보이는지 따로 확인한다. 브라우저만 로그인되고 서버는 모르면 실제 서비스에서 문제가 된다
async function ServerSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = (claims?.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.name ?? meta.full_name ?? meta.preferred_username ?? meta.user_name ?? "");

  return (
    <StatusBox
      label="서버가 본 로그인"
      value={claims ? `✓ ${name || "(닉네임 없음)"} · ${String(claims.sub).slice(0, 8)}…` : "✗ 로그인 안 됨"}
      ok={Boolean(claims)}
    />
  );
}

function StatusBox({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className={`mt-6 rounded-xl border p-3 text-sm ${ok ? "border-emerald-500" : "border-zinc-300 dark:border-zinc-700"}`}>
      <span className="text-zinc-500">{label}</span>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
