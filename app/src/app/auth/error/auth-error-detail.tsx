"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/safe-next";

export function AuthErrorDetail() {
  const params = useSearchParams();
  const reason = params.get("reason") ?? "unknown";
  const detail = params.get("detail") ?? "";
  const next = safeNextPath(params.get("next"), "/spike/song");

  return (
    <div className="mt-4 space-y-4 text-sm">
      <dl className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
        <dt className="font-semibold">reason</dt>
        <dd className="mb-2 break-all font-mono">{reason}</dd>
        <dt className="font-semibold">detail</dt>
        <dd className="break-all font-mono">{detail || "-"}</dd>
      </dl>
      <p className="text-zinc-600 dark:text-zinc-400">
        검증 중이라면 이 화면을 캡처해서 테스트 표(docs/spike-01)에 붙여주세요.
      </p>
      <Link href={next} className="inline-block rounded-lg bg-zinc-900 px-4 py-2 font-semibold text-white dark:bg-white dark:text-zinc-900">
        돌아가기
      </Link>
    </div>
  );
}
