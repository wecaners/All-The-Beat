// 순위 스티커. 1~5위는 색이 다르고 그 아래는 흰색 (홈 추가요 TOP, 추가요 랭킹)
const TONE = ["bg-pink text-white", "bg-sky", "bg-butter", "bg-lilac", "bg-lime"];

export function RankSticker({ rank, size = "md" }: { rank: number; size?: "sm" | "md" }) {
  const sizing = size === "md" ? "h-9 w-9 text-lg" : "h-7 w-7 text-[14px] shadow-sticker-sm";
  return (
    <span className={`grid flex-none place-items-center rounded-full border-2 border-ink font-display leading-none ${sizing} ${TONE[rank - 1] ?? "bg-card"}`}>
      {rank}
    </span>
  );
}
