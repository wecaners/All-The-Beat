# Implementation Plan: 대리 등록 강사의 계정 연결 (클레임)

## Summary

`instructor_profiles`에 가져오기 신청 칸(`claim_user_id`, `claim_requested_at`)을 더하고, 강사 신청 화면에서 미연결 대리 강사의 핸들이면 가져오기를 제안한다. 운영자가 기존 코드 발급으로 DM을 보내고, 강사가 코드를 넣으면 프로필의 `user_id`를 채워 이전한다.

## Requirements

1. 신청 화면의 가져오기 제안·신청·상태·취소 (FR-1, FR-2, FR-7, FR-9)
2. 코드 확인과 이전, 새로 공개되는 클래스의 추가요 열기 (FR-4~6)
3. 운영자 코드 발급·취소·배너 (FR-3, FR-8)

## Critical Files

### New Files

- `app/src/app/me/teacher/apply/claim-view.tsx` — 가져오기 제안 카드, 진행 상태(코드 입력·취소)
- `app/src/db/migrations/0008_instructor_claim.sql` — 새 칸 둘 (drizzle-kit 생성)

### Modified Files

- `app/src/db/schema/users.ts` — `claimUserId`, `claimRequestedAt`
- `app/src/server/instructors/index.ts` — 신청에서 제안 돌려주기, `requestClaim`, `getMyClaim`, `verifyClaimCode`, `cancelMyClaim`
- `app/src/server/admin/instructors.ts` — 목록·상세에 신청 정보, 코드 발급 조건, `cancelClaimByAdmin`, 신청 건수, 공개 시 추가요 열기 함수 분리
- `app/src/app/me/teacher/apply/{page,actions,apply-form}.tsx` — 제안·상태 분기
- `app/src/app/me/page.tsx` — 마이의 강사 입구에 가져오기 상태
- `app/src/app/admin/{page,actions}.tsx`, `app/src/app/admin/instructors/[id]/page.tsx`, `apply-forms.tsx` — 배너, 신청 정보, 발급·취소
- `docs/03` F-19 메모, `docs/09` `instructor_profiles`·8절, `specs/README.md`

### Reference Files

- `app/src/app/me/teacher/apply/status-view.tsx`(코드 입력), `app/src/server/admin/shared.ts`(`openRequestsForClass`)

## Architecture

### User Flow

```text
/me/teacher/apply  (강사 프로필 없음 또는 반려)
  폼 → 신청하기
    핸들 = 미연결 대리 강사 → 제안 카드
      "이미 올빗에 등록된 클래스가 N개 있어요. 내 계정으로 가져올까요?"
      "가져오면 숨어 있던 클래스도 수강생에게 보여요"
      [가져오기 신청]
  가져오기 신청 상태
    1 가져오기 신청 ✔  2 인스타 본인 확인 [코드 입력]  3 내 계정으로 연결
    [신청 취소]
  코드 맞음 → 승인된 강사 상태 보기 → 내 클래스

/admin  "가져오기 신청 N건 — 코드를 보내 주세요 ›"
/admin/instructors/{id} (대리)
  가져오기 신청: 닉네임 · 신청 시각 · 코드 상태  [코드 발급] [신청 취소]
```

### Event Flow

```text
applyInstructor → 핸들 unique 위반
  → 미연결 대리면 ClaimOffer(handle, displayName, classCount) → 액션이 { claim } 로 돌려줌
requestClaim(userId, handle)  트랜잭션
  내 강사 프로필이 있고 반려가 아니면 거절
  대상 = is_proxy and user_id is null and handle
  내가 다른 대리에 걸어 둔 신청은 지움
  대상.claim_user_id = 나, claim_requested_at = now(), 코드 비움
verifyClaimCode(userId, code)  트랜잭션
  대상 = claim_user_id = 나 ; 코드 발급·만료·일치 확인
  wasPublic = consent_at is not null
  반려된 내 프로필 삭제
  대상.user_id = 나, is_proxy = false, claim·코드 비움
  wasPublic 아니면 다가오는 공개 클래스의 대기 추가요 열기
```

### Domain Model

```text
instructor_profiles
├── claim_user_id      uuid FK → profiles (set null), unique
└── claim_requested_at timestamptz

src/server/instructors
├── ClaimOffer(InstructorError)   { handle, displayName, classCount }
├── requestClaim · getMyClaim · verifyClaimCode · cancelMyClaim
src/server/admin/instructors
├── openRequestsForUpcomingClasses(tx, instructorId)   recordConsent·verifyClaimCode 공용
├── issueVerifyCode: 직접 신청 대기 OR 가져오기 신청 있는 대리
├── cancelClaimByAdmin · countPendingClaims
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 제안 카드와 진행 상태 문구가 먼저 정해진다
- 실제 화면이 안쪽 설계를 끌어준다. 제안에 필요한 값(클래스 수)과 상태 보기에 필요한 값(코드 상태)이 서버 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오 1~11을 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 강사 화면 (제안·진행 상태)

`claim-view.tsx`, 신청 화면 분기, 마이 입구. 서버 함수는 타입과 함께 먼저 만들고 화면은 임시 페이지에서 가짜 값으로 확인한다.

Mocking 상태: 임시 페이지의 가짜 값. 실제 화면은 서버 함수를 부른다.

### Step 2: 스키마·마이그레이션

`users.ts` → `pnpm db:generate --name=instructor_claim` → SQL 검토 → **사용자 확인 후** `pnpm db:migrate` → 다시 generate가 "No schema changes".

Mocking 상태: 없음.

### Step 3: 서버 (신청·확인·이전·운영)

강사 쪽 함수와 액션, 운영 쪽 발급 조건·취소·건수, 추가요 열기 함수 분리.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인.

### Step 4: 운영 화면·문서

배너, 강사 상세의 신청 정보·발급·취소. docs/03·09, specs/README, `specs/instructor-apply`의 "가져오기 없음" 문구 정리.

Mocking 상태: 없음. 임시 페이지를 지운다.

## Verification

### Build

```bash
cd app && pnpm check && pnpm db:check && pnpm db:generate
```

### Test

되돌리는 트랜잭션 안에서 가짜 대리 강사(동의 없음, 다가오는 클래스 2, 그 곡의 대기 추가요), 가짜 사용자 A·B·반려 사용자·승인 강사로 시나리오 1~9, 11을 서버 함수로 확인하고 남은 행이 없는지 본다.

### Manual Test

1. 로그인 화면은 임시 페이지(커밋 안 함)에 가짜 값으로 띄워 375px에서 본다
2. 실제 흐름(신청 → 운영자 발급 → 코드 입력 → 내 클래스)은 사용자 확인

## Considerations

### 기존 코드 재사용

`hashVerifyCode`·`verifyCodeInput`·코드 입력 UI 모양, `issueVerifyCodeAction`·`IssueCodeButton`, `openRequestsForClass`, `ChoiceChip` 폼 그대로.

### 호환성

- 새 칸은 NULL 허용이라 기존 행과 화면에 영향이 없다
- 회원 탈퇴 시 `claim_user_id`는 NULL이 된다(신청이 사라진다)
