import Link from "next/link";
import { StickerLabel } from "@/components/sticker-label";
import { stickerButtonClass } from "@/components/sticker-button";
import { VideoCard } from "@/components/video-card";
import { BOOKING_TYPE_LABEL, formatClassDate, formatDuration, formatPrice, formatTimeRange, LEVEL_LABEL } from "@/lib/format";
import type { ClassDetail, ClassDisplayStatus } from "@/server/classes";

const STATUS_LABEL: Record<ClassDisplayStatus, { text: string; tone: "lime" | "butter" | "white" }> = {
  open: { text: "모집 중", tone: "lime" },
  closing_soon: { text: "마감 임박", tone: "butter" },
  closed: { text: "마감", tone: "white" },
  ended: { text: "끝난 클래스", tone: "white" },
  canceled: { text: "취소", tone: "white" },
};

// 예약할 수 없는 이유 (F-05 상태별 버튼). 앵콜은 F-24가 생기면 이 자리에 넣는다 (MVP 원칙 6)
const UNAVAILABLE_TEXT: Record<"closed" | "ended" | "canceled", string> = {
  closed: "마감됐어요",
  ended: "끝난 클래스예요",
  canceled: "취소됐어요",
};

// 클래스 상세 화면. 데이터만 받아 그린다 (상태별 화면을 가짜 데이터로도 확인할 수 있게)
export function ClassView({ c }: { c: ClassDetail }) {
  const mainSong = c.songs[0];

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-3">
        <Link href="/" className="font-display text-[26px] leading-none text-pink text-sticker">
          올빗
        </Link>
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Class</span>
      </div>

      {/* 클래스 이미지를 올리는 곳이 아직 없어 대표 곡의 안무 영상 썸네일을 쓴다 (06 문서 4.1) */}
      {mainSong?.videoId && (
        <div className="px-[22px] pt-5">
          <VideoCard videoId={mainSong.videoId} title={`${mainSong.title} 안무 영상`} leftLabel="YOUTUBE" rightLabel={mainSong.title} />
        </div>
      )}

      <div className="px-5 pt-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <StickerLabel tone={STATUS_LABEL[c.status].tone} tilt={-3}>
            {STATUS_LABEL[c.status].text}
          </StickerLabel>
          <StickerLabel tone="sky" tilt={2}>
            {LEVEL_LABEL[c.level]}
          </StickerLabel>
        </div>
        <h1 className="mt-3 font-display text-[32px] leading-[1.15]">{c.title}</h1>

        {c.songs.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {c.songs.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/song/${s.slug}`}
                  className="press inline-flex rounded-full border-2 border-ink bg-sky px-3 py-1 text-sm font-black shadow-sticker-sm"
                >
                  {s.title} · {s.artistName} ›
                </Link>
              </li>
            ))}
          </ul>
        )}

        <ClassFacts c={c} />

        {c.description && (
          <section className="mt-7">
            <h2 className="font-display text-[23px]">
              <span className="mark-lime">클래스 소개</span>
            </h2>
            <p className="mt-2.5 whitespace-pre-line rounded-2xl border-2 border-ink bg-card p-4 text-[15px] font-medium leading-relaxed">
              {c.description}
            </p>
          </section>
        )}
      </div>

      <ActionBar c={c} />
    </>
  );
}

function ClassFacts({ c }: { c: ClassDetail }) {
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(c.address)}`;
  const instaUrl = `https://www.instagram.com/${encodeURIComponent(c.instructor.instagramHandle)}/`;
  return (
    <dl className="sticker-edge mt-6 divide-y-2 divide-dashed divide-ink/15 rounded-2xl bg-card px-4">
      <Fact label="일시">
        {formatClassDate(c.startsAt)}
        <br />
        {formatTimeRange(c.startsAt, c.endsAt)} <span className="text-sub">· {formatDuration(c.startsAt, c.endsAt)}</span>
      </Fact>
      <Fact label="장소">
        {c.studioName}
        <a href={mapUrl} target="_blank" rel="noopener" className="mt-0.5 block text-[13px] font-semibold text-sub">
          {c.address} <span className="font-extrabold text-ink">· 지도 열기 ›</span>
        </a>
      </Fact>
      <Fact label="권역">{c.regionName}</Fact>
      {/* 예약이 외부라 남은 자리는 모른다. 정원만 보여준다 (specs/class-detail CON-1) */}
      {c.capacity && <Fact label="정원">{c.capacity}명</Fact>}
      <Fact label="강사">
        <a href={instaUrl} target="_blank" rel="noopener" className="block">
          {c.instructor.displayName}
          <span className="ml-1.5 text-[13px] font-semibold text-sub">@{c.instructor.instagramHandle}</span>
          <span className="ml-1 text-[13px] font-extrabold">· 인스타 ›</span>
        </a>
      </Fact>
    </dl>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="w-10 flex-none pt-px text-[13px] font-extrabold text-sub">{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px] font-bold">{children}</dd>
    </div>
  );
}

// 아래 고정 바: 가격 + 상태별 행동 (F-05)
function ActionBar({ c }: { c: ClassDetail }) {
  const mainSong = c.songs[0];
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        {c.canBook ? (
          <>
            <p className="text-center text-[13px] font-bold text-sub">
              {BOOKING_TYPE_LABEL[c.bookingType]
                ? `예약은 강사님의 ${BOOKING_TYPE_LABEL[c.bookingType]}에서 진행돼요`
                : "예약은 강사님이 안내한 페이지에서 진행돼요"}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex-none font-display text-[24px] leading-none">{formatPrice(c.price)}</span>
              {/* next/link는 미리 불러오기로 /go를 호출해 클릭이 잘못 기록되므로 일반 링크를 쓴다 */}
              <a href={`/go/${c.id}`} target="_blank" rel="noopener" className={stickerButtonClass({ variant: "ink" })}>
                예약하러 가기
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="text-center font-display text-[22px]">{UNAVAILABLE_TEXT[c.status as keyof typeof UNAVAILABLE_TEXT]}</p>
            {mainSong && (
              <div className="mt-2 flex gap-2.5">
                <Link href={`/song/${mainSong.slug}`} className={stickerButtonClass({ variant: "white", size: "md", display: false })}>
                  같은 곡 다른 클래스
                </Link>
                {c.status === "canceled" && (
                  <Link href={`/song/${mainSong.slug}?request=open`} className={stickerButtonClass({ variant: "pink", size: "md" })}>
                    이 곡 추가요!
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
