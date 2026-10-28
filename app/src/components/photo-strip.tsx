"use client";

import { useEffect, useRef, useState } from "react";

type Photo = { url: string; thumbUrl: string };

// 작은 사진 목록 + 크게 보기 (specs/instructor-studio FR-10).
// 크게 보기는 <dialog>(포커스 가둠·Esc 기본 제공)로, 옆으로 넘기고, 휴대폰 뒤로 가기로도 닫힌다
export function PhotoStrip({ photos, label }: { photos: Photo[]; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [index, setIndex] = useState(0);
  const [isOpen, setOpen] = useState(false);

  // 크게 보는 동안 뒤 화면이 스크롤되지 않게
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [isOpen]);

  // 뒤로 가기: 크게 보기를 열 때 기록을 하나 쌓고, 뒤로 가면 닫는다 (Next 라우터와 함께 쓰는 pushState)
  useEffect(() => {
    const onPop = () => {
      if (!dialog.current?.open) return;
      pushed.current = false;
      dialog.current.close();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function open(i: number) {
    const d = dialog.current;
    if (!d) return;
    setIndex(i);
    d.showModal();
    setOpen(true);
    window.history.pushState(null, "", window.location.href);
    pushed.current = true;
    requestAnimationFrame(() => track.current?.children[i]?.scrollIntoView({ inline: "start", block: "nearest", behavior: "instant" }));
  }

  function close() {
    if (pushed.current) {
      pushed.current = false;
      window.history.back(); // popstate에서 닫힌다
    } else {
      dialog.current?.close();
    }
  }

  function go(step: number) {
    const next = Math.max(0, Math.min(photos.length - 1, index + step));
    track.current?.children[next]?.scrollIntoView({ inline: "start", block: "nearest", behavior: "smooth" });
  }

  if (photos.length === 0) return null;

  return (
    <>
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((p, i) => (
          <li key={p.thumbUrl} className="flex-none">
            <button type="button" onClick={() => open(i)} aria-label={`${label} 사진 ${i + 1} 크게 보기`} className="press block overflow-hidden rounded-lg border-2 border-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- Storage 공개 주소, 이미 줄인 사진 */}
              <img src={p.thumbUrl} alt="" loading="lazy" className="h-20 w-20 object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`${label} 사진`}
        onCancel={(e) => {
          e.preventDefault(); // Esc도 같은 길로 닫아 기록을 맞춘다
          close();
        }}
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
      >
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((p, i) => (
            <div key={p.url} className="grid h-full w-screen flex-none snap-start place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- Storage 공개 주소 */}
              <img src={p.url} alt={`${label} 사진 ${i + 1}`} loading="lazy" className="max-h-full max-w-full object-contain" />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold" aria-live="polite">
            {index + 1} / {photos.length}
          </span>
          <button type="button" onClick={close} className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-ink">
            닫기
          </button>
        </div>
        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 flex justify-between px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => go(-1)} disabled={index === 0} className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold disabled:opacity-30">
              이전
            </button>
            <button type="button" onClick={() => go(1)} disabled={index === photos.length - 1} className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold disabled:opacity-30">
              다음
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
