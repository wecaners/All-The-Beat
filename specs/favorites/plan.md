# Implementation Plan: 찜

## Summary

`favorites` 테이블을 더하고, `src/server/favorites`에 찜 여부·토글·내 목록을 둔다. 클래스 상세 제목 옆에 찜 버튼(로그인 시트·복귀 자동 찜 포함)을, 마이에 찜 목록을 붙인다.

## Requirements

1. 테이블·토글·확인 (FR-2, FR-3)
2. 클래스 상세 버튼·복귀 흐름 (FR-1, FR-4)
3. 마이 목록 (FR-5, FR-6)

## Critical Files

### New Files

- `app/src/db/migrations/0009_favorites.sql` (drizzle-kit 생성)
- `app/src/server/favorites/index.ts` — `isFavorite`, `setFavorite`, `listMyFavorites`
- `app/src/app/class/[id]/favorite-button.tsx` — 토글·로그인 시트·토스트

### Modified Files

- `app/src/db/schema/activity.ts` — `favorites`
- `app/src/app/class/[id]/{page,class-view,actions}.tsx` — 찜 상태 읽기·버튼·액션
- `app/src/app/me/page.tsx` — 찜 목록
- `docs/03` F-22 메모, `docs/09` 테이블·8절, `specs/README.md`

### Reference Files

- `app/src/server/encores/index.ts`, `app/src/app/class/[id]/encore-panel.tsx`, `app/src/server/me/index.ts`

## Architecture

### User Flow

```text
/class/{id}  [모집 중][초급]            (♡ 찜)  ← 제목 줄 오른쪽
  누름 → 로그인? → 아니오: 로그인 시트 → 카카오 → /class/{id}?favorite=1 → 자동 찜
                → 예: 동의? → 아니오: /welcome?next=/class/{id}?favorite=1
                            → 예: 토글, 토스트 "찜했어요" / "찜을 뺐어요"
/me  … 내 앵콜 … 찜한 클래스 N  ClassTicket(배지: 마감·끝난 클래스·취소) …
```

### Domain Model

```text
favorites (RLS, 정책 없음)
├── user_id  uuid → profiles (cascade)
├── class_id bigint → classes (cascade)
├── created_at
└── PK (user_id, class_id)

src/server/favorites
├── isFavorite(userId, classId)
├── setFavorite(userId, classId, on)   on: 공개 클래스만, insert on conflict do nothing / delete
└── listMyFavorites(userId) → { classId, title, startsAt, endsAt, regionName, price, level, status(화면), songTitle, artistName, videoId }[]
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 버튼과 목록 모양이 먼저 정해진다
- 실제 화면이 안쪽 설계를 끌어준다. 티켓에 필요한 값이 목록 함수의 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오 1~8을 `tasks.md` Phase 4로 옮긴다.

Mocking 상태: 없음.

### Step 1: 스키마·마이그레이션

`favorites` → `pnpm db:generate --name=favorites` → SQL 검토 → 적용(새 테이블은 미리 승인받음) → generate "No schema changes".

Mocking 상태: 없음.

### Step 2: 서버·액션

`src/server/favorites`, `setFavoriteAction`.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인.

### Step 3: 화면

클래스 상세 버튼(+page에서 상태 읽기), 마이 목록. 임시 페이지(커밋 안 함)에서 버튼·목록 모양.

Mocking 상태: 임시 페이지의 가짜 값. 실제 화면은 서버.

### Step 4: 마무리

docs/03·09, `specs/README.md`, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check && pnpm db:check && pnpm db:generate
```

### Test

되돌리는 트랜잭션 안에서 가짜 사용자·클래스(모집·마감·끝남·취소·숨김)로 찜·두 번 찜·빼기·숨김 거절·목록 순서와 상태를 확인한다.

### Manual Test

임시 페이지에서 버튼 켜짐/꺼짐과 목록 배지를 375px로 본다. 로그인 복귀는 사용자 확인.

## Considerations

### 기존 코드 재사용

`publiclyVisible`, `classEnded`·`displayStatusOf`, `ClassTicket`, 로그인 시트 문구, `consentPath`, `Toast`.

### 호환성

`ClassView`에 `favorite` 값이 하나 늘어난다(임시 페이지들은 커밋되지 않았다).
