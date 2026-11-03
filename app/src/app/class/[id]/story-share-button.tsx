"use client";

import { useCallback, useState, useTransition } from "react";
import { StickerButton } from "@/components/sticker-button";
import { Toast } from "@/components/toast";

// 스토리용 이미지 (F-23, specs/story-image). 파일 공유가 되는 휴대폰은 공유 창(인스타 스토리로), 아니면 새 탭에서 저장
export function StoryShareButton({ classId, title }: { classId: number; title: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const clearToast = useCallback(() => setToast(null), []);
  const url = `/class/${classId}/story`;

  function onClick() {
    start(async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const file = new File([await res.blob()], `allthebeat-class-${classId}.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${title} | 올빗` });
          return;
        }
        window.open(url, "_blank", "noopener");
      } catch (e) {
        // 공유 창을 닫은 경우
        if (e instanceof DOMException && e.name === "AbortError") return;
        setToast("이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요");
      }
    });
  }

  return (
    <>
      <StickerButton variant="white" size="md" display={false} onClick={onClick} disabled={busy}>
        {busy ? "만드는 중…" : "스토리용 이미지 만들기"}
      </StickerButton>
      {toast && <Toast message={toast} onDone={clearToast} />}
    </>
  );
}
