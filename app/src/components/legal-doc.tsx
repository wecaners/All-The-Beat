import type { ReactNode } from "react";
import { Logo } from "./logo";

// 약관·개인정보처리방침 문서 틀 (U-08). 로그인 없이 보는 글이라 꾸밈은 줄이고 읽기 쉽게
export function LegalDoc({ title, zine, updatedAt, children }: { title: string; zine: string; updatedAt: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md pb-20">
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">{zine}</span>
      </div>
      <article className="px-5 pt-6">
        <h1 className="font-display text-[30px] leading-tight">{title}</h1>
        <p className="mt-1.5 text-[13px] font-semibold text-sub">시행일 {updatedAt}</p>
        {/* 초안 표시: 책임자·연락처와 최종 문구는 출시 전에 정한다 (specs/terms-consent CON-3) */}
        <p className="mt-4 rounded-2xl border-2 border-ink bg-butter px-4 py-3 text-[13px] font-bold leading-relaxed">
          초안이에요. 출시 전에 내용을 확정하고 빈칸을 채울 거예요.
        </p>
        <div className="legal mt-6 space-y-7 text-[15px] leading-relaxed">{children}</div>
      </article>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[20px]">{title}</h2>
      <div className="mt-2 space-y-2 font-medium">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// 아직 정해지지 않은 값
export function Blank({ label }: { label: string }) {
  return <span className="rounded-md bg-pink-soft px-1.5 py-0.5 font-bold">[{label}]</span>;
}
