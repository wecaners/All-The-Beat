import Link from "next/link";
import { formatTicketDate } from "@/lib/format";
import { StickerLabel } from "./sticker-label";

const STUB = ["bg-pink-soft", "bg-[#ddf0ff]", "bg-[#fff2b8]", "bg-[#ede6ff]"];

type Props = {
  href: string;
  title: string;
  startsAt: Date;
  /** "14:00 · 홍대·합정" */
  meta: string;
  /** "30,000원 · 입문" */
  detail: string;
  thumbnailUrl?: string | null;
  badge?: string | null;
  index?: number;
};

// 클래스 = 날짜가 크게 찍힌 절취선 티켓. 날짜가 먼저 읽힌다
export function ClassTicket({ href, title, startsAt, meta, detail, thumbnailUrl, badge, index = 0 }: Props) {
  const d = formatTicketDate(startsAt);
  return (
    <Link
      href={href}
      className="press sticker-edge relative flex rounded-2xl bg-card before:absolute before:-top-[9px] before:left-[69px] before:z-[2] before:h-4 before:w-4 before:rounded-full before:border-2 before:border-ink before:bg-paper before:[clip-path:inset(50%_0_0_0)] after:absolute after:-bottom-[9px] after:left-[69px] after:z-[2] after:h-4 after:w-4 after:rounded-full after:border-2 after:border-ink after:bg-paper after:[clip-path:inset(0_0_50%_0)]"
    >
      <div className={`flex w-[78px] flex-none flex-col items-center justify-center rounded-l-[14px] border-r-2 border-dashed border-ink ${STUB[index % STUB.length]}`}>
        <span className="font-zine text-[11px] font-extrabold uppercase">{d.month}</span>
        <span className="font-display text-[34px] leading-none">{d.day}</span>
        <span className="text-[11px] font-extrabold">{d.weekday}요일</span>
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3 pl-3.5">
        <h5 className="truncate text-[15px] font-extrabold tracking-tight">{title}</h5>
        <p className="mt-0.5 text-[13px] font-semibold text-sub">{meta}</p>
        <p className="mt-1.5 text-sm font-black">
          {detail}
          {badge && <StickerLabel tone="butter" tilt={0} className="ml-1.5 align-[1px]">{badge}</StickerLabel>}
        </p>
      </div>
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- YouTube 썸네일
        <img src={thumbnailUrl} alt="" className="m-2.5 ml-0 h-16 w-16 flex-none self-center rounded-xl border-2 border-ink object-cover" />
      )}
    </Link>
  );
}
