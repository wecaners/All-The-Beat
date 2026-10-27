"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { startKakaoLogin } from "@/lib/auth/kakao-login";
import { TIME_PREF_LABEL } from "@/lib/format";
import type { Region } from "@/server/regions";
import type { MyRequest, RequestSummary } from "@/server/requests";
import { cancelRequestAction, type RequestActionState, saveRequestAction } from "./actions";

type Props = {
  songId: number;
  songTitle: string;
  summary: RequestSummary;
  loggedIn: boolean;
  myRequest: MyRequest | null;
  regions: Region[];
};

// 로그인 후 돌아왔을 때 시트를 자동으로 여는 신호 (04 IA: ?request=open)
const AUTO_OPEN_PARAM = "request";

export function RequestPanel({ songId, songTitle, summary, loggedIn, myRequest, regions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const autoOpen = useSearchParams().get(AUTO_OPEN_PARAM) === "open";
  const active = myRequest && myRequest.status !== "canceled" ? myRequest : null;

  const [sheet, setSheet] = useState<"none" | "login" | "request">(() => (autoOpen && loggedIn ? "request" : "none"));
  const [justSaved, setJustSaved] = useState(false);
  const [canceling, startCancel] = useTransition();
  const [cancelError, setCancelError] = useState<string>();

  // 자동 오픈 신호는 한 번 쓰고 주소에서 지운다 (새로고침·공유 때 다시 열리지 않게)
  useEffect(() => {
    if (autoOpen) router.replace(pathname, { scroll: false });
  }, [autoOpen, pathname, router]);

  const [state, formAction, saving] = useActionState(
    async (prev: RequestActionState, formData: FormData) => {
      const result = await saveRequestAction(songId, prev, formData);
      if (result.ok) {
        setSheet("none");
        setJustSaved(true);
      }
      return result;
    },
    { ok: false },
  );

  function onMainButton() {
    setJustSaved(false);
    setSheet(loggedIn ? "request" : "login");
  }

  function onCancel() {
    setCancelError(undefined);
    startCancel(async () => {
      const result = await cancelRequestAction(songId);
      if (!result.ok) setCancelError(result.error);
      setJustSaved(false);
    });
  }

  return (
    <section className="mt-6 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900">
      <p className="font-bold">
        {summary.total > 0 ? (
          <>
            <span className="text-2xl">{summary.total}</span>명이 이 곡 클래스를 기다려요
          </>
        ) : (
          "아직 기다리는 사람이 없어요. 첫 추가요를 남겨 주세요!"
        )}
      </p>
      {summary.topRegions.length > 0 && (
        <p className="mt-1 text-sm text-zinc-500">{summary.topRegions.map((r) => `${r.name} ${r.count}명`).join(" · ")}</p>
      )}

      <button
        onClick={onMainButton}
        className={`mt-4 h-12 w-full rounded-xl font-bold ${
          active ? "border border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" : "bg-pink-600 text-white"
        }`}
      >
        {active ? "추가요 완료 ✓ · 수정하기" : "추가요!"}
      </button>

      {active && (
        <button onClick={onCancel} disabled={canceling} className="mt-2 w-full text-sm text-zinc-500 underline disabled:opacity-50">
          {canceling ? "취소하는 중…" : "추가요 취소"}
        </button>
      )}
      {cancelError && <p className="mt-2 text-sm text-red-600">{cancelError}</p>}

      {/* 알림(F-20)은 아직 없으니 약속하지 않는다 (MVP 원칙 6) */}
      {justSaved && active && (
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          추가요 완료! 강사님들이 볼 수 있게 모아둘게요
        </p>
      )}

      {sheet === "login" && (
        <Sheet onClose={() => setSheet("none")}>
          <h3 className="text-lg font-bold">로그인하고 추가요 남기기</h3>
          <p className="mt-1 text-sm text-zinc-500">카카오로 3초면 끝나요. 로그인 후 이 화면으로 돌아와요.</p>
          {/* 카톡 앱으로 넘어가면 자동으로 안 돌아온다 (spike-01 발견) */}
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            카카오톡이 열리면 확인을 누른 뒤, 화면 <b>왼쪽 위 ◀</b>를 눌러 돌아와 주세요
          </p>
          <button
            onClick={() => startKakaoLogin(`${pathname}?${AUTO_OPEN_PARAM}=open`)}
            className="mt-5 h-12 w-full rounded-xl bg-[#FEE500] font-bold text-black"
          >
            카카오로 시작하기
          </button>
        </Sheet>
      )}

      {sheet === "request" && (
        <Sheet onClose={() => setSheet("none")}>
          <h3 className="text-lg font-bold">{songTitle} 추가요!</h3>
          <p className="text-sm text-zinc-500">누가 요청했는지는 다른 사람에게 보이지 않아요</p>

          <form action={formAction} className="mt-4 space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold">희망 권역</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip name="regionId" value="any" label="어디든 좋아요" defaultChecked={active?.regionId === null} />
                {regions.map((r) => (
                  <Chip key={r.id} name="regionId" value={String(r.id)} label={r.shortName} defaultChecked={active?.regionId === r.id} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">
                희망 시간대 <span className="font-normal text-zinc-500">(선택)</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(TIME_PREF_LABEL).map(([value, label]) => (
                  <Chip key={value} name="timePref" value={value} label={label} defaultChecked={(active?.timePref ?? "any") === value} />
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-sm font-semibold">
                한마디 <span className="font-normal text-zinc-500">(선택, 강사님만 봐요)</span>
              </span>
              <textarea
                name="message"
                maxLength={100}
                rows={2}
                defaultValue={active?.message ?? ""}
                placeholder="킬링파트만이라도!"
                className="mt-2 w-full rounded-xl border border-zinc-300 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}

            <button disabled={saving} className="h-12 w-full rounded-xl bg-pink-600 font-bold text-white disabled:opacity-50">
              {saving ? "저장하는 중…" : active ? "수정하기" : "추가요!"}
            </button>
          </form>
        </Sheet>
      )}
    </section>
  );
}

function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="mx-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 pb-8 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded bg-zinc-300" />
        {children}
      </div>
    </div>
  );
}

function Chip({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-block rounded-full border border-zinc-300 px-3 py-1.5 text-sm peer-checked:border-pink-600 peer-checked:bg-pink-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-pink-400 dark:border-zinc-700">
        {label}
      </span>
    </label>
  );
}
