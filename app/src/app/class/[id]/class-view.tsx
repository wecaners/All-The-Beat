import Link from "next/link";
import { InfoChip } from "@/components/chip";
import { Logo } from "@/components/logo";
import { PhotoStrip } from "@/components/photo-strip";
import { StaticMap } from "@/components/static-map";
import { StickerLabel } from "@/components/sticker-label";
import { stickerButtonClass } from "@/components/sticker-button";
import { VideoCard } from "@/components/video-card";
import { FACILITIES } from "@/lib/facilities";
import { BOOKING_TYPE_LABEL, formatClassDate, formatDuration, formatPrice, formatTimeRange, LEVEL_LABEL } from "@/lib/format";
import type { ClassDetail, ClassDisplayStatus } from "@/server/classes";
import type { EncoreSummary, MyEncore } from "@/server/encores";
import { CopyAddressButton } from "./copy-address";
import { EncorePanel } from "./encore-panel";

const STATUS_LABEL: Record<ClassDisplayStatus, { text: string; tone: "lime" | "butter" | "white" }> = {
  open: { text: "모집 중", tone: "lime" },
  closing_soon: { text: "마감 임박", tone: "butter" },
  closed: { text: "마감", tone: "white" },
  ended: { text: "끝난 클래스", tone: "white" },
  canceled: { text: "취소", tone: "white" },
};

// 예약할 수 없는 이유 (F-05 상태별 버튼). 마감·종료 클래스는 앵콜 패널이 하단 막대를 대신한다 (F-24)
const UNAVAILABLE_TEXT: Record<"closed" | "ended" | "canceled", string> = {
  closed: "마감됐어요",
  ended: "끝난 클래스예요",
  canceled: "취소됐어요",
};

export type ClassEncore = { summary: EncoreSummary; loggedIn: boolean; mine: MyEncore | null };

// 클래스 상세 화면. 데이터만 받아 그린다 (상태별 화면을 가짜 데이터로도 확인할 수 있게)
// encore: 마감·종료 클래스일 때만 (F-24)
export function ClassView({ c, encore }: { c: ClassDetail; encore: ClassEncore | null }) {
  const mainSong = c.songs[0];

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-7">
        <Logo />
        <span className="font-zine text-[11px] font-extrabold uppercase tracking-[.04em]">Class</span>
      </div>

      {/* 맨 위: 강사 티저 영상이 있으면 그것(F-25), 없으면 대표 곡의 안무 영상 썸네일 (06 문서 4.1) */}
      {c.teaserVideoId ? (
        <div className="px-[22px] pt-5">
          <VideoCard videoId={c.teaserVideoId} title={`${c.instructor.displayName} 강사 티저 영상`} leftLabel="TEASER · YOUTUBE" rightLabel={c.instructor.displayName} />
        </div>
      ) : (
        mainSong?.videoId && (
          <div className="px-[22px] pt-5">
            <VideoCard videoId={mainSong.videoId} title={`${mainSong.title} 안무 영상`} leftLabel="YOUTUBE" rightLabel={mainSong.title} />
          </div>
        )
      )}

      <div className="px-5 pt-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <StickerLabel tone={STATUS_LABEL[c.status].tone} tilt={-3}>
            {STATUS_LABEL[c.status].text}
          </StickerLabel>
          <StickerLabel tone="sky" tilt={2}>
            {LEVEL_LABEL[c.level]}
          </StickerLabel>
          {/* 강사가 일시·장소를 바꾼 지 24시간 안 (F-12) */}
          {c.changedRecently && (
            <StickerLabel tone="pink" tilt={3}>
              일시·장소 변경됨
            </StickerLabel>
          )}
          {c.encoreOfClassId && (
            <Link href={`/class/${c.encoreOfClassId}`} className="press inline-block -rotate-2 rounded-full border-2 border-ink bg-lilac px-2.5 py-0.5 text-[11px] font-black leading-tight">
              앵콜 클래스 · 원래 클래스 보기 ›
            </Link>
          )}
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

        {encore && (c.status === "closed" || c.status === "ended") && (
          <EncorePanel
            classId={c.id}
            classTitle={c.title}
            classStatus={c.status}
            summary={encore.summary}
            loggedIn={encore.loggedIn}
            mine={encore.mine}
            mainSongSlug={mainSong?.slug ?? null}
          />
        )}

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

        <InstructorSection c={c} />
        <PlaceSection c={c} />
      </div>

      {!encore && <ActionBar c={c} />}
    </>
  );
}

// 언제·몇 명. 강사·장소는 아래에 섹션을 따로 둔다 (강사는 자기를 알리고, 수강생은 연습실 위치를 꼼꼼히 본다)
function ClassFacts({ c }: { c: ClassDetail }) {
  return (
    <dl className="sticker-edge mt-6 divide-y-2 divide-dashed divide-ink/15 rounded-2xl bg-card px-4">
      <Fact label="일시">
        {formatClassDate(c.startsAt)}
        <br />
        {formatTimeRange(c.startsAt, c.endsAt)} <span className="text-sub">· {formatDuration(c.startsAt, c.endsAt)}</span>
      </Fact>
      {/* 예약이 외부라 남은 자리는 모른다. 정원만 보여준다 (specs/class-detail CON-1) */}
      {c.capacity && <Fact label="정원">{c.capacity}명</Fact>}
    </dl>
  );
}

function SectionTitle({ title, zine }: { title: string; zine: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-[23px]">
        <span className="mark-lime">{title}</span>
      </h2>
      <span className="font-zine text-xs font-extrabold uppercase">{zine}</span>
    </div>
  );
}

// 강사. 사진·소개·포트폴리오는 넣은 것만, 대리 등록이면 사진·영상 게재 동의가 있을 때만 서버가 준다 (specs/instructor-studio FR-12)
function InstructorSection({ c }: { c: ClassDetail }) {
  const { instructor } = c;
  const instaUrl = `https://www.instagram.com/${encodeURIComponent(instructor.instagramHandle)}/`;
  return (
    <section className="mt-8">
      <SectionTitle title="강사" zine="Instructor" />
      <div className="sticker-edge mt-2.5 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-3.5">
          {instructor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage 공개 주소, 이미 줄인 사진
            <img src={instructor.photoUrl} alt={`${instructor.displayName} 프로필 사진`} className="h-16 w-16 flex-none rounded-full border-2 border-ink object-cover" />
          ) : (
            <span aria-hidden className="grid h-16 w-16 flex-none place-items-center rounded-full border-2 border-ink bg-pink-soft font-display text-2xl">
              {instructor.displayName.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-[22px] leading-tight">{instructor.displayName}</p>
            <p className="truncate text-[13px] font-semibold text-sub">@{instructor.instagramHandle}</p>
          </div>
        </div>
        {instructor.bio && <p className="mt-3 text-[15px] font-semibold leading-relaxed">{instructor.bio}</p>}
        {/* 이 강사의 다른 클래스·가르쳐 온 곡 (F-21) */}
        <Link href={`/teacher/${encodeURIComponent(instructor.instagramHandle)}`} className={`mt-3.5 ${stickerButtonClass({ variant: "lime", size: "md", display: false })}`}>
          강사 프로필 보기
        </Link>
        <a href={instaUrl} target="_blank" rel="noopener" className={`mt-2.5 ${stickerButtonClass({ variant: "white", size: "md", display: false })}`}>
          인스타그램에서 더 보기
        </a>
      </div>
      {/* 포트폴리오 영상: YouTube 공식 임베드, 누를 때만 플레이어를 부른다 (product.md 화면 문구) */}
      {instructor.portfolioVideoIds.length > 0 && (
        <div className="mt-6 space-y-6 px-1">
          {instructor.portfolioVideoIds.map((id, i) => (
            <VideoCard key={id} videoId={id} title={`${instructor.displayName} 포트폴리오 영상 ${i + 1}`} leftLabel="PORTFOLIO" rightLabel="YOUTUBE" />
          ))}
        </div>
      )}
    </section>
  );
}

// 장소. 이름·주소는 클래스에 저장된 값, 지도·시설·사진은 스튜디오의 지금 값 (specs/instructor-studio FR-8).
// 지도는 움직이지 않는 미리보기, 누르면 카카오맵. 주소는 길게 눌러도 복사되게 일반 글자로 둔다
function PlaceSection({ c }: { c: ClassDetail }) {
  const { studio } = c;
  const hasLocation = studio.lat !== null && studio.lng !== null;
  // 위치가 있으면 그 지점에 핀을 꽂아 열고, 없으면 주소로 검색해 연다
  const mapUrl = hasLocation
    ? `https://map.kakao.com/link/map/${encodeURIComponent(c.studioName)},${studio.lat},${studio.lng}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(c.address)}`;
  return (
    <section className="mt-8">
      <SectionTitle title="장소" zine="Studio" />
      <div className="sticker-edge mt-2.5 rounded-2xl bg-card p-4">
        {hasLocation && (
          <div className="mb-3.5">
            <StaticMap lat={studio.lat!} lng={studio.lng!} label={c.studioName} />
          </div>
        )}
        <p className="font-display text-[22px] leading-tight">{c.studioName}</p>
        <p className="mt-1 text-[14px] font-semibold text-sub">{c.address}</p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          <li>
            <InfoChip>{c.regionName}</InfoChip>
          </li>
          {studio.facilities.map((f) => (
            <li key={f}>
              <span className="inline-block rounded-full border-2 border-ink/30 bg-paper px-3 py-1 text-[13px] font-bold">{FACILITIES[f]}</span>
            </li>
          ))}
        </ul>
        {studio.photos.length > 0 && (
          <div className="mt-3.5">
            <PhotoStrip photos={studio.photos} label={c.studioName} />
          </div>
        )}
        <div className="mt-3.5 flex gap-2.5">
          <a href={mapUrl} target="_blank" rel="noopener" className={stickerButtonClass({ variant: "white", size: "md", display: false })}>
            카카오맵
          </a>
          <CopyAddressButton address={c.address} />
        </div>
        {/* 지도 서비스의 사진·리뷰는 가져오지 않고 그곳으로 보낸다 (약관·저작권, CON-1) */}
        {studio.kakaoPlaceUrl && (
          <a href={studio.kakaoPlaceUrl} target="_blank" rel="noopener" className={`mt-2.5 ${stickerButtonClass({ variant: "soft", size: "md", display: false })}`}>
            카카오맵에서 연습실 사진·리뷰 보기
          </a>
        )}
      </div>
    </section>
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
