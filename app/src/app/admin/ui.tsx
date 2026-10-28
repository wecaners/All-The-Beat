// 운영 화면 공용 UI. 운영자만 쓰는 화면이라 꾸밈보다 빠른 입력을 우선한다
import type { ReactNode } from "react";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {hint && <span className="ml-2 text-xs text-zinc-500">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export const buttonClass = "h-10 rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900";

export const linkButtonClass = "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold dark:border-zinc-700";

export function Result({ state }: { state: { ok: boolean; error?: string; message?: string } }) {
  if (state.error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>;
  if (state.ok && state.message) return <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>;
  return null;
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-3 py-6 text-center text-zinc-500">
                아직 없어요
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
