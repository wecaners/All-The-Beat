# Implementation Plan: 강사 프로필 페이지

## Summary

`src/server/teachers`에 `getTeacherProfile(handle)`을 두고, `/teacher/[handle]` 페이지가 요청마다 읽어 `TeacherView`로 그린다. 클래스 상세 강사 카드에 프로필로 가는 버튼을 더한다. 스키마는 바꾸지 않는다.

## Requirements

1. 프로필 머리·사진 규칙 (FR-1~3)
2. 다가오는 클래스·가르쳐 온 곡 (FR-4, FR-5)
3. 클래스 상세 입구·공유 미리보기 (FR-6, FR-7)

## Critical Files

### New Files

- `app/src/app/teacher/[handle]/page.tsx` — 라우트, 메타데이터, 요청마다 읽기
- `app/src/app/teacher/[handle]/teacher-view.tsx` — 데이터만 받아 그리는 화면
- `app/src/server/teachers/index.ts` — `getTeacherProfile`, `normalizeTeacherHandle`

### Modified Files

- `app/src/app/class/[id]/class-view.tsx` — 강사 카드에 "강사 프로필 보기"
- `docs/03` F-21 메모, `specs/README.md`

### Reference Files

- `app/src/server/classes/index.ts`(`publiclyVisible`, `showMedia`, `mediaUrl`), `app/src/app/home-view.tsx`(`ClassTicket` 쓰는 법), `app/src/components/song-row.tsx`

## Architecture

### User Flow

```text
클래스 상세 강사 카드 [강사 프로필 보기] ──→ /teacher/minji.dance
                     [인스타그램에서 더 보기] (그대로)

/teacher/{handle}
  로고
  [사진] 민지  @minji.dance  홍대·합정 · 강남
  한 줄 소개 · [인스타그램에서 더 보기]
  포트폴리오 영상
  다가오는 클래스 N   ClassTicket… (마감 배지)  /  없으면 안내
  가르쳐 온 곡 M      SongRow "2번 가르쳤어요" …
```

### Event Flow

```text
page → connection() → getTeacherProfile(normalize(decode(handle)))
  강사: handle 일치 + approved + (not proxy or consent)  없으면 notFound()
  media: !proxy or mediaConsent → 사진·소개·영상
  regions: instructor_regions ⋈ regions (sortOrder)
  upcoming: classes(강사, 숨김 아님, starts_at > now, status in open·closing_soon·closed) ⋈ 대표 곡  날짜 순
  pastSongs: class_songs ⋈ classes(강사, 숨김 아님, 취소 아님, starts_at <= now) ⋈ songs ⋈ artists
             group by 곡  count · max(starts_at) desc
```

### Domain Model

```text
TeacherProfile
├── displayName · instagramHandle · regionNames[]
├── photoUrl? · bio? · portfolioVideoIds[]
├── upcoming: { id, startsAt, endsAt, regionName, price, level, status, songTitle, artistName, videoId }[]
└── pastSongs: { slug, title, artistName, videoId, times }[]
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. View를 고정 데이터로 먼저 띄워 모양을 정한다
- 실제 화면이 안쪽 설계를 끌어준다. 티켓·곡 줄에 필요한 값이 `TeacherProfile` 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오 1~9를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 화면 (고정 데이터)

`teacher-view.tsx`를 임시 페이지(커밋 안 함)에 고정 데이터로 띄워 375px에서 본다.

Mocking 상태: 임시 페이지의 고정 값.

### Step 2: 서버·라우트·입구

`getTeacherProfile`, `/teacher/[handle]` 페이지·메타데이터, 클래스 상세 버튼. 임시 페이지를 지운다.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인.

### Step 3: 마무리

docs/03 F-21 메모, `specs/README.md`, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

되돌리는 트랜잭션 안에서 가짜 직접 강사·대리 강사(동의 여러 경우)·여러 상태의 클래스·곡으로 시나리오 2~4, 6, 7을 서버 함수로 확인한다.

### Manual Test

1. dev DB의 실제 강사 주소를 375px로 열어 본다
2. 클래스 상세에서 버튼으로 이동, 없는 아이디는 없는 페이지
3. 개발 서버 로그에 prerender 경고가 없는지 본다

## Considerations

### 기존 코드 재사용

`publiclyVisible`의 강사 조건, `mediaUrl`, `visibleVideoId`, `ClassTicket`, `SongRow`, `VideoCard`, `formatPrice`·`formatTimeRange`·`LEVEL_LABEL`.

### 호환성

스키마 변경 없음. 클래스 상세는 버튼 하나만 늘어난다.
