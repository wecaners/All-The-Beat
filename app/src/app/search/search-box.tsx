"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";

const DEBOUNCE_MS = 250;

// 주소의 검색어. 서버에서 미리 그릴 때는 빈 값, 브라우저에서는 주소에서 읽는다 (뒤로 가기에도 따라온다)
function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
const readUrlQuery = () => new URLSearchParams(window.location.search).get("q") ?? "";

// 검색 칸. 치다가 잠깐 멈추면 주소(?q=)를 바꾸고, 서버가 결과를 그린다. 그동안 이전 결과는 그대로 둔다 (specs/search FR-4~5).
// 칸은 미리 그려진 화면에 바로 있어야 해서(열자마자 쳐도 글자가 사라지지 않게) 검색어를 서버에서 받지 않고 주소에서 읽는다
export function SearchBox() {
  const router = useRouter();
  const urlQuery = useSyncExternalStore(subscribe, readUrlQuery, () => "");
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? urlQuery;
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function go(next: string) {
    const q = next.trim();
    startTransition(() => router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false }));
  }

  function onChange(next: string) {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), DEBOUNCE_MS);
  }

  return (
    <form
      role="search"
      // 엔터는 검색어를 담아 클래스 목록으로 (F-02 → F-03). 빈 칸이면 그대로
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        const q = value.trim();
        (document.activeElement as HTMLElement | null)?.blur(); // 휴대폰 키보드를 내린다
        if (q) router.push(`/classes?q=${encodeURIComponent(q)}`);
        else go(value);
      }}
      className="relative mt-3"
    >
      <input
        type="search"
        enterKeyHint="search"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="추고 싶은 곡이나 아티스트"
        aria-label="곡이나 아티스트 검색"
        className="sticker-edge w-full rounded-full bg-card py-3 pr-20 pl-5 text-[16px] font-bold outline-none placeholder:text-sub/70 focus-visible:ring-2 focus-visible:ring-pink"
      />
      <span aria-live="polite" className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-[12px] font-extrabold text-sub">
        {pending ? "찾는 중…" : ""}
      </span>
    </form>
  );
}
