# Implementation Plan: 운영자 지표

## Summary

운영 첫 화면(`/admin`) 맨 위에 지표 영역을 붙이고, `src/server/admin/metrics.ts`가 DB에서 지표 7개를 한 번에 센다. 재방문을 위해 접속 날짜 테이블을 새로 만들고, Proxy가 로그인 확인 직후 하루 한 번 기록한다.

## Requirements

1. 지표 영역과 목표 표시 (FR-1, FR-2, FR-11, FR-12)
2. 지표 6개 집계: 클래스·자발적 강사·예약 클릭·추가요·요청 → 개설·앵콜 → 개설 (FR-3~8)
3. 접속 날짜 기록과 재방문 집계 (FR-9, FR-10)

## Critical Files

### New Files

- `app/src/app/admin/metrics.tsx` — 지표 영역(서버 컴포넌트)
- `app/src/server/admin/metrics.ts` — 지표 집계, 목표 값
- `app/src/server/visits/index.ts` — 접속 날짜 기록
- `app/src/db/migrations/00xx_*.sql` — 접속 날짜 테이블 (drizzle-kit 생성)

### Modified Files

- `app/src/app/admin/page.tsx` — 지표 영역을 맨 위에
- `app/src/db/schema/activity.ts` — 접속 날짜 테이블
- `app/src/lib/supabase/proxy.ts` — 로그인 확인 뒤 접속 기록(쿠키로 하루 한 번)
- `docs/03-기능명세서.md` — F-18 구현 메모
- `docs/09-ERD.md` — 3.6 지표에 새 테이블, 8절 구현
- `specs/README.md` — 기능 목록

### Reference Files

- `app/src/server/admin/classes.ts`(클릭 수 식, 운영 조회 패턴), `app/src/server/admin/shared.ts`(`openRequestsForClass`, KST), `app/src/server/bookings/index.ts`(이벤트 쓰기), `app/src/app/admin/ui.tsx`(`Section`·`Table`)

## Architecture

### User Flow

```text
운영자 → /admin
  ┌ 지표 ─────────────────────────────────────────────┐
  │ 등록된 클래스   12 / 30   (대리 10 · 직접 2) 이번 주 3 │
  │ 자발적 강사      1 / 3                               │
  │ 예약 클릭       21 / 50   이번 주 4                   │
  │ 요청 → 개설      1 / 1곡  ← 도달                     │
  │ 재방문           0 / 10명 (가입자 2명, 11/4부터 기록)  │
  │ 추가요          18건                                 │
  │ 앵콜 → 개설      0 / 1                               │
  ├ 클릭 많은 클래스 10 → /admin/classes/{id}             │
  ├ 추가요 많은 곡 10   → /admin/songs/{id}               │
  └ 전환된 곡          → /admin/songs/{id}               │
  (아래는 지금 그대로: 검수 대기 · 앵콜 대기 · 다가오는 클래스 · 강사 · 곡)
```

### Event Flow

```text
접속 기록
1. 모든 요청 → proxy.ts → updateSession
2. getClaims() (지금 그대로, 사이에 코드 넣지 않음)
3. 로그인 사용자이고 쿠키 ab_visit ≠ "{userId}:{오늘 KST}" 이면
     recordVisit(userId) → user_visits에 (userId, 오늘 KST) 삽입, 겹치면 무시
     성공하면 응답에 쿠키 ab_visit 설정 (httpOnly, 하루)
     실패하면 console.error만 남기고 응답은 그대로

지표 보기
1. /admin → requireAdmin() → <Suspense> 안 Metrics
2. getAdminMetrics() → 질의 여러 개를 Promise.all
3. 표로 그린다
```

### Domain Model

```text
user_visits (새 테이블, RLS 켬·정책 없음)
├── user_id    uuid → profiles.id (탈퇴 시 cascade)
├── visited_on date (KST)
└── PK (user_id, visited_on)

getAdminMetrics(): AdminMetrics
├── classes      { total, byAdmin, byInstructor, thisWeek, target: 30 }   취소·숨김 제외, 이번 주 = created_at ≥ KST 월요일 0시
├── instructors  { selfServe, target: 3 }                                 created_by_admin = false 인 클래스가 있는 강사 수
├── clicks       { total, thisWeek, target: 50, top: [{ classId, title, clicks }] ×10 }
├── requests     { total, top: [{ songId, title, artist, count }] ×10 }   status ≠ canceled
├── conversion   { songs: [{ songId, title, artist }], target: 1 }        fulfilled_class_id 가 있는 추가요의 곡
├── encore       { reached, opened }                                      reached_at 있음 / 그중 status = opened
└── revisit      { since: date | null, signups, returned, target: 10 }
     since    = min(user_visits.visited_on)
     signups  = since 이후 가입(KST 날짜), role ≠ admin, deleted_at 없음
     returned = 그중 visited_on ∈ [가입일+1, 가입일+14] 가 있는 사람

recordVisit(userId): profiles에 있는 사용자만 (insert … select … where exists), on conflict do nothing
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 지표 영역을 고정 데이터로 먼저 띄워 어떤 숫자가 어떻게 보이는지 정한다
- 실제 화면이 안쪽 설계를 끌어준다. 화면에 필요한 숫자 모양이 `AdminMetrics` 타입과 질의를 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오 1~12를 `tasks.md` Phase 4 체크리스트(입력·기대 결과)로 옮긴다.

Mocking 상태: 없음.

### Step 1: 지표 영역 (고정 데이터)

`admin/metrics.tsx`를 만들고 `/admin` 맨 위에 붙인다. `AdminMetrics` 타입은 `src/server/admin/metrics.ts`에 먼저 정의하고, `getAdminMetrics()`는 고정 값을 돌려준다. 목표 도달 여부, 비율이 없을 때("아직 없음"), 기록 시작 전(`since = null`) 문구를 이 단계에서 정한다.

Mocking 상태: `getAdminMetrics()`가 고정 값. 화면·라우트·권한은 진짜.

### Step 2: 지표 집계 (재방문 제외)

`getAdminMetrics()`의 6개 지표를 실제 질의로 바꾼다. 시각 비교와 "이번 주" 경계는 DB 안에서(`now() at time zone 'Asia/Seoul'`, `date_trunc('week', …)`) 계산한다. 클릭 수 식은 `admin/classes.ts`의 것과 같은 기준을 쓴다.

Mocking 상태: 재방문만 고정 값(`since = null`). 나머지는 dev DB.

### Step 3: 접속 날짜 테이블

`activity.ts`에 `userVisits`(복합 PK, `.enableRLS()`)를 추가한다. 순서는 `app.md`: 스키마 → `pnpm db:generate` → SQL 검토 → **사용자 확인 후** `pnpm db:migrate`(dev DB가 운영 배포와 같은 DB라서) → 다시 generate가 "No schema changes". anon·authenticated 권한은 마이그레이션 0002의 `ALTER DEFAULT PRIVILEGES`가 새 테이블에도 막으므로 회수 SQL은 따로 붙이지 않는다.

Mocking 상태: 재방문 고정 값 그대로.

### Step 4: 접속 기록과 재방문 집계

`src/server/visits`에 `recordVisit(userId)`를 만들고 `lib/supabase/proxy.ts`에서 `getClaims()` 결과로 부른다. 쿠키로 하루 한 번만 시도하고, 실패는 삼킨다. 재방문 집계를 실제 질의로 바꾼다. 고정 데이터가 남지 않았는지 확인한다.

Mocking 상태: 없음.

### Step 5: 마무리

`docs/03` F-18 구현 메모, `docs/09` 3.6·8절, `specs/README.md` 기능 목록, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

DB를 건드렸으므로:

```bash
cd app && pnpm db:check && pnpm db:generate
```

### Test

되돌리는 트랜잭션 안에서 가짜 강사·클래스·추가요·앵콜 라운드·사용자·접속 날짜를 넣고 `getAdminMetrics()` 값을 시나리오 3~8, 11과 비교한다. `recordVisit`을 같은 날 여러 번, 다음 날로 바꿔 한 번 불러 행 수를 본다(SC-2). 끝나면 넣은 행이 남지 않았는지 확인한다.

### Manual Test

1. 운영 화면은 운영자 로그인이 필요해 Claude가 직접 못 본다. 임시 확인 페이지(커밋 안 함)에서 지표 영역을 dev DB 값으로 그려 모양을 보고 지운다
2. 개발 서버 로그에 "unstable value … while prerendering"이 없는지 본다
3. 비로그인으로 여러 화면을 열어 접속 기록이 안 생기는지 본다
4. 로그인 사용자의 기록·쿠키·운영 화면 실제 모습은 사용자 확인

## Considerations

### 기존 코드 재사용

`requireAdmin`, `Section`·`Table`·`Td`, 클릭 수 기준(`events.type = 'booking_click'`), `openRequestsForClass`가 남긴 `fulfilledClassId`, `encore_rounds.reachedAt`.

### 호환성

- 기존 운영 홈 목록은 그대로 아래에 둔다
- Proxy는 `getClaims()` 앞뒤 순서를 지키고, 기록 실패가 요청을 막지 않는다. 비로그인 요청은 지금과 똑같이 지나간다
- 탈퇴 기능이 생기면 접속 날짜도 함께 지워진다(cascade)
