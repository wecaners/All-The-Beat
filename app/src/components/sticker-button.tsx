import type { ButtonHTMLAttributes } from "react";

const VARIANT = {
  // 추가요·행동: 흰 버블 글씨에 검정 외곽선
  pink: "bg-pink text-white text-sticker [text-shadow:2px_2px_0_var(--color-ink)] [-webkit-text-stroke:1px_var(--color-ink)]",
  lime: "bg-lime text-ink",
  white: "bg-card text-ink",
  // 취소처럼 한발 물러선 행동
  soft: "bg-pink-soft text-ink",
  // 예약처럼 밖으로 나가는 버튼
  ink: "bg-ink text-lime shadow-sticker-pink",
  kakao: "bg-kakao text-black",
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  size?: "md" | "lg";
  /** 디스플레이 글씨(메이플스토리). 긴 문장은 false */
  display?: boolean;
};

type Look = Pick<Props, "variant" | "size" | "display">;

// 링크(<a>, <Link>)도 같은 모양을 쓸 때
export function stickerButtonClass({ variant = "lime", size = "lg", display = true }: Look = {}) {
  const sizing = size === "lg" ? "h-14 text-[22px]" : "h-12 text-[17px]";
  const font = display ? "font-display" : "font-sans font-extrabold text-base";
  return `press sticker-edge flex w-full items-center justify-center gap-2 rounded-[18px] ${sizing} ${font} ${VARIANT[variant]}`;
}

// 스티커 버튼: 굵은 테두리 + 딱 떨어지는 그림자, 누르면 도장처럼 눌린다
export function StickerButton({ variant, size, display, className = "", ...rest }: Props) {
  return <button {...rest} className={`${stickerButtonClass({ variant, size, display })} disabled:opacity-50 ${className}`} />;
}
