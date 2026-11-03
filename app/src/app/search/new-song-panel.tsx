"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { StickerButton } from "@/components/sticker-button";
import { startKakaoLogin } from "@/lib/auth/kakao-login";
import { consentPath } from "@/lib/consent-path";
import { type RegisterSongState, registerSongAction, searchArtistsAction } from "./actions";

// 로그인·동의 뒤 돌아왔을 때 시트를 자동으로 여는 신호 (추가요 패널의 ?request=open과 같은 방식)
const AUTO_OPEN_PARAM = "newsong";
const SUGGEST_MS = 250;

// 검색 결과 없음 → 그 자리에서 곡을 만들고 곡 상세의 추가요 시트로 (F-13, specs/song-register).
// 곡 이름은 검색어로 미리 채우고 아티스트만 받는다. 희망 권역·시간대는 곡 상세의 추가요 시트가 받는다
export function NewSongPanel({ query, loggedIn }: { query: string; loggedIn: boolean }) {
  const router = useRouter();
  const autoOpen = useSearchParams().get(AUTO_OPEN_PARAM) === "open";
  const returnTo = `/search?q=${encodeURIComponent(query)}&${AUTO_OPEN_PARAM}=open`;
  const [sheet, setSheet] = useState<"none" | "login" | "song">(() => (autoOpen && loggedIn ? "song" : "none"));
  const closeSheet = useCallback(() => setSheet("none"), []);

  // 자동 오픈 신호는 한 번 쓰고 주소에서 지운다
  useEffect(() => {
    if (autoOpen) router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
  }, [autoOpen, query, router]);

  const [state, formAction, saving] = useActionState(
    async (prev: RegisterSongState, formData: FormData) => {
      const result = await registerSongAction(prev, formData);
      if (result.consentRequired) router.push(consentPath(returnTo));
      // 만든(또는 이미 있던) 곡 상세로 가면서 추가요 시트를 연다
      if (result.ok && result.slug) router.push(`/song/${result.slug}?request=open`);
      return result;
    },
    { ok: false },
  );

  return (
    <>
      <StickerButton variant="pink" className="mt-4" onClick={() => setSheet(loggedIn ? "song" : "login")}>
        이 곡 추가요!
      </StickerButton>

      <BottomSheet open={sheet === "login"} onClose={closeSheet} label="로그인">
        <h3 className="font-display text-[28px]">로그인하고 추가요!</h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">카카오로 3초면 끝나요. 로그인 후 이 화면으로 돌아와요.</p>
        {/* 카톡 앱으로 넘어가면 자동으로 안 돌아온다 (spike-01 발견) */}
        <p className="mt-4 rounded-2xl border-2 border-ink bg-butter p-3 text-[13px] font-bold leading-relaxed">
          카카오톡이 열리면 확인을 누른 뒤, 화면 <b>왼쪽 위 ◀</b>를 눌러 돌아와 주세요
        </p>
        <StickerButton variant="kakao" display={false} className="mt-5" onClick={() => startKakaoLogin(returnTo)}>
          카카오로 시작하기
        </StickerButton>
      </BottomSheet>

      <BottomSheet open={sheet === "song"} onClose={closeSheet} label="새 곡 추가요">
        <h3 className="font-display text-[30px]">
          새 곡 <span className="mark-lime">추가요!</span>
        </h3>
        <p className="mt-1 text-[13px] font-semibold text-sub">올빗에 없는 곡이라 곡 정보를 같이 받아요. 영상은 나중에 운영자가 붙여요.</p>

        <form action={formAction} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-black">곡 이름</span>
            <input name="title" defaultValue={query} maxLength={100} required autoComplete="off" placeholder="예: NEON" className={inputClass} />
          </label>
          <ArtistField />
          {state.error && <p className="text-sm font-bold text-[#d6246e]">{state.error}</p>}
          <StickerButton variant="pink" disabled={saving}>
            {saving ? "만드는 중…" : "만들고 추가요!"}
          </StickerButton>
        </form>
      </BottomSheet>
    </>
  );
}

const inputClass = "mt-2 w-full rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-[16px] font-bold outline-none focus:shadow-sticker-pink";

// 아티스트 칸. 치다가 잠깐 멈추면 기존 아티스트를 제안한다(브라우저 datalist). 다른 표기로 써도 서버가 같은 아티스트로 묶는다
function ArtistField() {
  const listId = useId();
  const [value, setValue] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    if (!next.trim()) {
      setOptions([]);
      return;
    }
    timer.current = setTimeout(() => start(async () => setOptions(await searchArtistsAction(next))), SUGGEST_MS);
  }

  return (
    <label className="block">
      <span className="text-sm font-black">아티스트</span>
      <input
        name="artistName"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={100}
        required
        autoComplete="off"
        placeholder="예: A2O LITE, 에이투오"
        className={inputClass}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <span className="mt-1.5 block text-[12px] font-semibold text-sub">한글·영문 어느 쪽으로 써도 같은 아티스트로 묶여요</span>
    </label>
  );
}
