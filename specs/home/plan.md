# Implementation Plan: 홈

## Summary

`/`를 홈 화면으로 바꾼다. `src/server`에 조회 셋(이번 주 핫한 곡, 다가오는 클래스, 추가요 TOP)을 더하고, 한 `<Suspense>` 안에서 병렬로 읽어 그린다. 핫한 곡 카드는 공용 부품 `SongCard`로 만든다. 스키마는 바꾸지 않는다.

## Requirements

1. 세 묶음 조회와 공개 조건 (FR-2~4, FR-7)
2. 곡·클래스·추가요로 가는 길 (FR-5)
3. 빈 묶음 숨김, 모두 비면 안내 (FR-6)
4. 영상 표시 규칙을 한 곳으로 모으고 클래스 상세에도 적용 (FR-8)

## Critical Files

### New Files

- `app/src/components/song-card.tsx` — 누르면 곡 상세로 가는 포토카드

### Modified Files

- `app/src/app/page.tsx` — 홈
- `app/src/server/classes/index.ts` — `listUpcomingClasses`, `listHotSongsThisWeek`, 클래스 상세 영상 조건
- `app/src/server/requests/index.ts` — `listTopRequestedSongs`
- `app/src/server/songs/index.ts` — 영상 표시 조건 `visibleVideoId`
- `_agent/rules/design.md` — `SongCard` 등록

### Reference Files

- `app/src/app/song/[slug]/page.tsx` — 다가오는 클래스·Suspense 패턴
- `app/src/components/class-ticket.tsx`, `star-burst.tsx`, `tape.tsx`
- `design/concepts/round-2.html` — 홈 모양

## Architecture

### User Flow

```text
/ (비로그인)
 ├─ 로고
 ├─ 이번 주 핫한 곡 (가로로 넘김) ── 곡 → /song/{slug}
 ├─ 다가오는 클래스 (티켓 10장) ──── 티켓 → /class/{id}
 ├─ 추가요 TOP 5 ─────────────────── 곡 → /song/{slug}
 │                                    나도 추가요 → /song/{slug}?request=open
 └─ (셋 다 비면) 아직 열린 클래스가 없어요
```

### Domain Model

```text
src/server/songs
└── visibleVideoId  ← 퍼가기 막힌 영상은 null (곡 상세·클래스 상세·홈 공용)

src/server/classes
├── listUpcomingClasses(limit=10)    공개 + open/closing_soon + starts_at > now(), 대표 곡(position 1) join
└── listHotSongsThisWeek(limit=10)   위 조건 + starts_at < now()+7일, 곡별 count, 많은 순

src/server/requests
└── listTopRequestedSongs(limit=5)   최근 30일, 취소 제외, 병합 곡 제외, 곡별 count, 많은 순 → 최근 요청 순
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 임시 입구였던 `/`가 첫 Step에서 진짜 홈이 된다
- 실제 화면이 안쪽 설계를 끌어준다. 카드가 보여줄 항목이 정해진 뒤 조회 함수의 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 홈 화면과 SongCard

`page.tsx`: 로고 줄, 세 묶음(제목 + 팬진 라벨), 모두 비었을 때 안내. 핫한 곡은 `SongCard`를 가로로 넘기는 줄에(번갈아 기울임, 별 스티커 "클래스 N"), 다가오는 클래스는 `ClassTicket`, 추가요 TOP은 순위 동그라미 + 곡명·아티스트 + "N명이 기다려요" + 작은 나도 추가요 버튼. 본문은 `<Suspense>` 안 `await connection()` 뒤.

Mocking 상태: 화면이 받는 타입을 먼저 정하고 Step 2에서 바로 진짜 조회로 잇는다(고정 데이터를 커밋하지 않는다).

### Step 2: 조회 셋

`listHotSongsThisWeek`, `listUpcomingClasses`, `listTopRequestedSongs`. 시각 비교는 모두 DB 안(`now()`). 공개 조건은 `publiclyVisible`.

Mocking 상태: 없음 (dev DB).

### Step 3: 영상 표시 규칙 정리

`visibleVideoId`를 `src/server/songs`에 두고 곡 상세 조회·클래스 상세 조회·홈 조회가 같이 쓴다.

Mocking 상태: 없음.

### Step 4: 마무리

`design.md`에 `SongCard`, `docs/03` F-01에 구현 메모(검색창·탭바·더보기 보류), 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Manual Test

1. 비로그인 `/` (모바일 375px). 서버 로그 오류·"unstable value" 없음, 가로 넘침 없음(넘기는 줄 안 제외)
2. dev DB 실데이터로 세 묶음과 링크
3. 순서·제외 규칙(7일, 마감·취소, 비공개, 30일, 병합)은 읽기 전용 SQL로 조회 함수와 같은 결과인지 확인한다. DB는 바꾸지 않는다
4. 빈 묶음·모두 빔·여러 장은 임시 페이지에서 가짜 데이터로 확인하고 지운다

## Considerations

### 기존 코드 재사용

티켓·별 스티커·테이프·로고·스티커 버튼 모양을 그대로 쓴다. 추가요 입력은 곡 상세의 `?request=open`.

### 호환성

`/`의 개발용 링크가 사라진다. `/spike/song`은 주소로 계속 열린다. 클래스 상세의 영상 표시가 곡 상세와 같아진다.
