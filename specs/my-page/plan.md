# Implementation Plan: 마이

## Summary

`/me` 페이지에 내 추가요·내 앵콜 목록과 로그아웃을 두고, 홈 머리에 입구를 붙인다. 목록은 `src/server/me`가 로그인 사용자 id로만 읽고, 앵콜 상태는 앵콜 서버의 계산을 그대로 쓴다. 스키마는 바꾸지 않는다.

## Requirements

1. 홈 입구, `/me` 비로그인 안내·카카오 로그인 (FR-1~2)
2. 내 추가요 목록·링크 (FR-3~5)
3. 내 앵콜 목록·링크 (FR-6~8)
4. 닉네임·로그아웃 (FR-9~10)

## Critical Files

### New Files

- `app/src/app/me/page.tsx` — 마이 화면
- `app/src/app/me/login-card.tsx` — 비로그인 카카오 시작 (클라이언트)
- `app/src/app/me/actions.ts` — 로그아웃 서버 액션
- `app/src/server/me/index.ts` — 내 추가요·내 앵콜 읽기

### Modified Files

- `app/src/app/page.tsx` — 홈 머리 마이 입구
- `app/src/server/encores/index.ts` — 앵콜 상태 계산을 목록에서도 쓰게 내보내기(필요하면)
- `docs/03-기능명세서.md` — F-10 구현 메모

### Reference Files

- `app/src/server/requests/index.ts`(90일 기준), `app/src/server/classes/index.ts`(`publiclyVisible`)
- `wireframes/index.html` U-09a·U-09b

## Architecture

### User Flow

```text
홈 [마이] → /me
  비로그인: 안내 + [카카오로 시작하기] → 카카오 → /auth/callback?next=/me → /me
  로그인: 닉네임
          내 추가요: [열렸어요] 곡 · 권역 · 날짜 → /class/{열린 클래스} (비공개면 /song/{slug})
                     [N명이 기다려요] 곡 · 권역 · 날짜 → /song/{slug} (수정·취소는 거기서)
          내 앵콜:   [앵콜 클래스 열림] → /class/{앵콜 클래스}
                     [모으는 중 3/5 · 전달됨 · 검토 중 · 어려워요 · 기간 끝남] → /class/{원 클래스}
          [로그아웃] → 세션 끊기 → /
```

### Domain Model

```text
listMyRequests(userId)
  requests(user, status ≠ canceled) ⋈ songs ⋈ artists ⟕ regions
  + 열린 클래스 id (공개일 때만), 기다리는 수(최근 90일·취소 제외)
  정렬: opened 먼저 → created_at 최근

listMyEncores(userId)
  encores(user, canceled_at NULL) ⋈ classes(공개) ⋈ instructor_profiles ⟕ encore_rounds
  + effectiveEncoreStatus, activeEncoreCount, threshold(없으면 정원으로 계산), 앵콜 클래스 id(공개일 때만)
  정렬: opened 먼저 → created_at 최근
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 마이 화면과 홈 입구부터 만든다
- 실제 화면이 안쪽 설계를 끌어준다. 항목에 필요한 값(상태·숫자·링크)이 서버 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 마이 화면·홈 입구

`/me`: 머리(로고·"My"), `<Suspense>` 안에서 로그인 확인 → 비로그인 카드 또는 목록. 목록 항목은 스티커 카드(썸네일·제목·한 줄 정보·상태 라벨), 열린 항목은 라임 도장. 빈 목록 안내와 검색 입구. 홈 머리 오른쪽 마이 버튼.

Mocking 상태: Step 2와 바로 이어 진행해 고정 데이터를 커밋하지 않는다.

### Step 2: 내 추가요·내 앵콜 서버

`listMyRequests`, `listMyEncores`. 로그인 사용자 id만 받는다.

Mocking 상태: 없음 (dev DB). 실제 데이터는 되돌리는 트랜잭션 안 가짜 사용자로 확인.

### Step 3: 로그아웃

서버 액션: Supabase 세션 끊기 → 홈으로.

Mocking 상태: 없음. 실제 로그아웃은 로그인이 필요해 사용자 확인.

### Step 4: 마무리

docs/03 F-10 구현 메모, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

목록 쿼리는 되돌리는 트랜잭션 안에서 가짜 사용자·추가요·앵콜로 확인한다(specs/encore findings Learnings 방식).

### Manual Test

1. 비로그인 `/me` 375px: 안내·카카오 버튼, 홈 입구
2. 로그인 화면 모양은 가짜 데이터 미리보기(커밋 안 함)
3. 실제 로그인·로그아웃은 사용자 확인

## Considerations

### 기존 코드 재사용

`getCurrentUser`, `startKakaoLogin`, 앵콜 상태 계산, 90일 기다리는 수 기준, 스티커 부품(`StickerLabel`, `stickerButtonClass`).

### 호환성

스키마 변경이 없다. 새 페이지와 홈 머리 버튼만 늘어난다.
