"use client";

import { useCallback, useState } from "react";
import { stickerButtonClass } from "@/components/sticker-button";
import { Toast } from "@/components/toast";

// 주소 복사. 택시·다른 지도 앱에 붙여 넣을 때. 클립보드를 못 쓰는 브라우저면 길게 눌러 복사하라고 알린다
export function CopyAddressButton({ address }: { address: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setToast("주소를 복사했어요");
    } catch {
      setToast("복사하지 못했어요. 주소를 길게 눌러 복사해 주세요");
    }
  }

  return (
    <>
      <button type="button" onClick={copy} className={stickerButtonClass({ variant: "soft", size: "md", display: false })}>
        주소 복사
      </button>
      {toast && <Toast message={toast} onDone={clearToast} />}
    </>
  );
}
