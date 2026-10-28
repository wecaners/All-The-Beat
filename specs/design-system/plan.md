# Implementation Plan: 디자인 시스템 (덕질 스크랩북)

## Summary

Tailwind v4 `@theme`에 토큰을 정의하고, `src/components/`에 스크랩북 부품을 만든 뒤 곡 상세와 추가요 시트를 그 부품으로 다시 짠다. 첫 추가요 여부와 순번은 서버가 계산해 돌려준다.

## Requirements

1. 토큰·폰트 (FR-1, FR-2, CON-2)
2. 공통 컴포넌트·움직임 (FR-5, FR-6)
3. 곡 상세·시트·완료 순간 (FR-3, FR-4, CON-1)

## Critical Files

### New Files

- `app/src/components/` — `sticker-button`, `chip`, `bottom-sheet`, `photo-card`, `video-card`, `class-ticket`, `star-burst`, `sticker-label`, `confetti`, `motion`
- `_agent/rules/design.md`

### Modified Files

- `app/src/app/globals.css`, `app/src/app/layout.tsx` — 토큰·폰트
- `app/src/app/song/[slug]/page.tsx`, `request-panel.tsx`, `actions.ts`
- `app/src/server/requests/index.ts` — 첫 추가요 여부·순번
- `app/src/app/admin/layout.tsx` — 운영 화면은 흰 배경 유지

### Reference Files

- `design/concepts/round-2.html`, `round-3.html`

## Architecture

### User Flow

```text
곡 상세 → [나도 추가요!] → (로그인 시트) → 추가요 시트 → 제출
   → 서버: 저장 + 첫 추가요인가 + 순번
   → 첫 추가요면 완료 순간(스티커 쾅·터짐·순번) / 아니면 "수정했어요" 안내
   → 닫으면 기다리는 수 +1 반영
```

### Domain Model

```text
saveRequest(user, song, input) → { isNew, position }
  isNew   = 이전 행이 없거나 canceled였다
  position = 최근 90일 유효 추가요 중 created_at이 내 것 이하인 수
```

### Outside-In 으로 가는 이유

1. 화면(곡 상세)이 먼저 새 모양이 되어야 토큰·컴포넌트가 실제로 필요한 만큼만 생긴다.
2. 완료 순간이 순번을 필요로 해서, 서버가 돌려줄 값이 화면에서 정해진다.

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 tasks.md Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 토큰·폰트

`@theme`에 색·폰트·그림자·모서리·이징, 속지 배경·형광펜·눌림 유틸리티. Bagel Fat One·Bricolage는 `next/font/google`, Pretendard는 패키지의 동적 분할 CSS.

Mocking 상태: 없음.

### Step 2: 컴포넌트

시안 round-2·3의 모양과 움직임을 React 컴포넌트로 옮긴다. 움직임은 Web Animations API와 CSS, 동작 줄이기는 `prefers-reduced-motion`.

Mocking 상태: 없음.

### Step 3: 곡 상세·시트·완료

곡 상세를 컴포넌트로 다시 짠다. 서버 `saveRequest`가 `isNew`·`position`을 돌려주고, 클라이언트가 완료 순간을 띄운다.

Mocking 상태: 없음.

### Step 4: 규칙·마무리

`_agent/rules/design.md` 작성, AGENTS.md 목록 갱신, 검증.

## Verification

### Build

```bash
cd app && pnpm check
```

### Manual Test

1. 비로그인 곡 상세 (영상 있는 곡·없는 곡), 로그인 시트
2. 로그인 후 첫 추가요 → 완료 순간·순번, 수정 → 안내, 취소 후 다시 → 완료 순간
3. 동작 줄이기 켜고 같은 흐름

## Considerations

### 기존 코드 재사용

서버 액션·검증·로그인 흐름은 그대로 두고 모양과 반환값만 바꾼다.

### 호환성

다른 화면(홈 임시, 스파이크, 운영)은 기존 모양을 유지한다. 운영 화면은 흰 배경을 명시한다.
