import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";

// 운영 화면은 검색 노출을 막는다 (CON-3, 04 IA)
export const metadata: Metadata = { title: "운영 | 올빗", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-500">확인 중…</p>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20">
      <nav className="sticky top-0 z-10 -mx-4 flex items-center gap-4 border-b border-zinc-200 bg-white/90 px-4 py-3 text-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <Link href="/admin" className="font-extrabold">
          올빗 운영
        </Link>
        <Link href="/admin/songs/new">곡 등록</Link>
        <Link href="/admin/instructors/new">강사 등록</Link>
        <Link href="/admin/classes/new">클래스 등록</Link>
      </nav>
      {children}
    </div>
  );
}
