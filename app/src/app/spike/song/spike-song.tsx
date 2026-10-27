"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { detectInAppBrowser, type InAppBrowser } from "@/lib/in-app-browser";
import { createClient } from "@/lib/supabase/client";

const LOG_KEY = "allbeat-spike-log";
const RETURN_PATH = "/spike/song?request=open";

type LogEntry = { at: string; msg: string };

function readLog(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function appendLog(msg: string) {
  try {
    const next = [...readLog(), { at: new Date().toLocaleTimeString("ko-KR"), msg }].slice(-30);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    // 저장소가 막힌 브라우저도 있다. 그 자체가 검증 결과
  }
}

export function SpikeSong() {
  const router = useRouter();
  const params = useSearchParams();
  const requestOpen = params.get("request") === "open";

  const [nickname, setNickname] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [env, setEnv] = useState<{ ua: string; inApp: InAppBrowser; cookies: boolean; href: string } | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        setEnv({
          ua: navigator.userAgent,
          inApp: detectInAppBrowser(navigator.userAgent),
          cookies: navigator.cookieEnabled,
          href: location.href,
        });

        const meta = data.user?.user_metadata ?? {};
        const name = data.user ? String(meta.name ?? meta.full_name ?? meta.preferred_username ?? "(닉네임 없음)") : null;
        setNickname(name);
        setChecked(true);

        if (requestOpen) {
          appendLog(name ? `복귀 성공 · 로그인됨(${name}) · request=open 유지` : "복귀했지만 로그인 안 됨");
          if (name) setSheetOpen(true);
        }
        setLog(readLog());
      });
  }, [requestOpen]);

  async function startLogin() {
    appendLog(`로그인 시작 · ${detectInAppBrowser(navigator.userAgent) ?? "일반 브라우저"}`);
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(RETURN_PATH)}`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo },
    });
    if (error) {
      appendLog(`로그인 시작 실패: ${error.message}`);
      setLog(readLog());
    }
  }

  async function logout() {
    await createClient().auth.signOut();
    appendLog("로그아웃");
    setNickname(null);
    setSheetOpen(false);
    setDone(false);
    router.replace("/spike/song");
    router.refresh();
    setLog(readLog());
  }

  function onRequestClick() {
    if (!nickname) return startLogin();
    setSheetOpen(true);
  }

  function submitRequest() {
    appendLog("추가요 제출 (검증용, 저장 안 함)");
    setSheetOpen(false);
    setDone(true);
    setLog(readLog());
  }

  function clearLog() {
    localStorage.removeItem(LOG_KEY);
    setLog([]);
  }

  return (
    <>
      <div className="mt-3 rounded-xl border border-zinc-300 p-3 text-sm dark:border-zinc-700">
        <span className="text-zinc-500">브라우저가 본 로그인</span>
        <p className="mt-1 font-semibold">{!checked ? "확인 중…" : nickname ? `✓ ${nickname}` : "✗ 로그인 안 됨"}</p>
      </div>

      {requestOpen && checked && (
        <p className={`mt-3 rounded-xl p-3 text-sm font-semibold ${nickname ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {nickname ? "✓ 원래 화면으로 돌아왔고 추가요 시트가 자동으로 열렸어요" : "✗ 돌아왔지만 로그인이 유지되지 않았어요"}
        </p>
      )}

      <section className="mt-6 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900">
        <p className="font-bold">
          <span className="text-2xl">{done ? 13 : 12}</span>명이 이 곡 클래스를 기다려요
        </p>
        <button
          onClick={onRequestClick}
          className="mt-4 h-12 w-full rounded-xl bg-zinc-900 font-bold text-white dark:bg-white dark:text-zinc-900"
        >
          {done ? "추가요 완료 ✓" : nickname ? "추가요!" : "추가요! (로그인 필요)"}
        </button>
      </section>

      {nickname && (
        <button onClick={logout} className="mt-3 w-full text-sm text-zinc-500 underline">
          로그아웃하고 다시 테스트
        </button>
      )}

      <section className="mt-8 text-xs">
        <h2 className="mb-2 text-sm font-bold">진단 정보 (캡처해서 테스트 표에)</h2>
        <dl className="space-y-1 rounded-xl border border-zinc-300 p-3 dark:border-zinc-700">
          <div><dt className="inline font-semibold">인앱 브라우저: </dt><dd className="inline">{env?.inApp ?? "아님"}</dd></div>
          <div><dt className="inline font-semibold">쿠키 허용: </dt><dd className="inline">{String(env?.cookies)}</dd></div>
          <div><dt className="inline font-semibold">현재 주소: </dt><dd className="inline break-all">{env?.href}</dd></div>
          <div><dt className="font-semibold">User-Agent</dt><dd className="break-all font-mono text-[11px] text-zinc-500">{env?.ua}</dd></div>
        </dl>

        <div className="mt-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">기록 (리다이렉트를 거쳐도 남는지 확인)</h3>
          <button onClick={clearLog} className="text-zinc-500 underline">지우기</button>
        </div>
        <ol className="mt-1 space-y-0.5 rounded-xl border border-zinc-300 p-3 font-mono dark:border-zinc-700">
          {log.length === 0 ? <li className="text-zinc-500">기록 없음</li> : log.map((e, i) => <li key={i}>{e.at} · {e.msg}</li>)}
        </ol>

        <ExternalBrowserLinks inApp={env?.inApp ?? null} />
      </section>

      {sheetOpen && (
        <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={() => setSheetOpen(false)}>
          <div className="w-full rounded-t-2xl bg-white p-5 pb-8 dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded bg-zinc-300" />
            <h3 className="text-lg font-bold">NEON 추가요!</h3>
            <p className="text-sm text-zinc-500">검증용 시트예요. 실제로 저장되지는 않아요.</p>
            <button onClick={submitRequest} className="mt-6 h-12 w-full rounded-xl bg-zinc-900 font-bold text-white dark:bg-white dark:text-zinc-900">
              추가요!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// 로그인이 인앱 브라우저에서 깨질 때의 대안(AR-1)을 같이 시험한다. 동작 여부가 기기·앱 버전마다 달라 결과를 표에 기록한다
function ExternalBrowserLinks({ inApp }: { inApp: InAppBrowser }) {
  if (!inApp) return null;
  const href = typeof window === "undefined" ? "" : location.href;
  const url = new URL(href || "http://localhost");
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  const links: { label: string; href: string }[] = [];
  if (inApp === "kakaotalk") links.push({ label: "카카오톡 → 외부 브라우저로 열기", href: `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}` });
  if (isAndroid) links.push({ label: "안드로이드 → 크롬으로 열기", href: `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end` });
  else links.push({ label: "iOS → 사파리로 열기 (실험)", href: `x-safari-${href}` });

  return (
    <div className="mt-4 rounded-xl border border-dashed border-zinc-400 p-3">
      <p className="mb-2 font-bold">외부 브라우저로 열기 시험 (대안 AR-1)</p>
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.label}><a className="underline" href={l.href}>{l.label}</a></li>
        ))}
      </ul>
    </div>
  );
}
