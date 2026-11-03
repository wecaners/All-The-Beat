# Implementation Plan: 인스타 스토리 공유 이미지

## Summary

`/class/[id]/story/route.tsx`가 `getPublicClass`로 읽은 값을 `ImageResponse`(메이플스토리 woff)로 1080×1920 PNG로 그린다. 클래스 상세에 이미지를 받아 공유 창 또는 새 탭을 여는 버튼을 둔다.

## Requirements

1. 이미지 라우트 (FR-1, FR-2, FR-4)
2. 버튼·공유 (FR-3)

## Critical Files

### New Files

- `app/src/app/class/[id]/story/route.tsx` — 이미지
- `app/src/app/class/[id]/story-share-button.tsx` — 버튼(클라이언트)

### Modified Files

- `app/src/app/class/[id]/class-view.tsx` — "공유" 구역
- `docs/03` F-23 메모, `specs/README.md`

### Reference Files

- `app/src/app/go/[classId]/route.ts`, `app/src/components/celebration.tsx`, `app/src/lib/format.ts`

## Architecture

### User Flow

```text
/class/{id}  … 클래스 소개 … [공유] 스토리용 이미지 만들기
  → fetch /class/{id}/story → File
  → navigator.canShare({ files }) ? share() : window.open(url)
```

### Domain Model

```text
GET /class/{id}/story
  getPublicClass(id) → null → 404
  ImageResponse(<Story c host />, { width: 1080, height: 1920, fonts: [maple] })
  Story: 종이 배경 · 상태 스티커 · 곡명/아티스트 · 클래스 이름 · 날짜 크게 · 시간·권역 · 가격·난이도 · 강사 · 로고 · 주소 안내
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 이미지를 먼저 만들어 보고 다듬는다
- 실제 화면이 안쪽 설계를 끌어준다. 이미지에 넣을 값이 이미 `ClassDetail`에 다 있다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오 1~5를 `tasks.md` Phase 4로 옮긴다.

Mocking 상태: 없음.

### Step 1: 이미지 라우트

route.tsx, 글꼴 읽기, 레이아웃. 실제 dev 클래스로 열어 본다.

Mocking 상태: 없음.

### Step 2: 버튼

`StoryShareButton`, 클래스 상세 "공유" 구역.

Mocking 상태: 없음.

### Step 3: 마무리

docs/03, `specs/README.md`, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

`curl -I`로 `image/png`·200, 없는 id·숨긴 id로 404. PNG 헤더에서 1080×1920.

### Manual Test

브라우저로 이미지를 열어 글자·잘림을 본다. 휴대폰 공유 창은 사용자 확인.

## Considerations

### 기존 코드 재사용

`getPublicClass`, `formatClassDate`·`formatTimeRange`·`formatPrice`·`LEVEL_LABEL`, 색 토큰 값.

### 호환성

새 라우트와 버튼 하나. 기존 화면은 그대로다.
