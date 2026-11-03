# Implementation Plan: 강사 신청과 승인

## Summary

`/me/teacher/apply`가 내 강사 프로필을 읽어 없으면 신청 폼, 있으면 3단계 상태(코드 입력·재신청 포함)를 보여준다. 서버는 `src/server/instructors`에 신청·코드 확인을, `src/server/admin/instructors`에 코드 발급·승인·반려를 둔다. 마이에 입구·상태 한 줄, 운영 강사 목록·상세에 신청 상태와 버튼을 더한다. 스키마는 바꾸지 않는다.

## Requirements

1. 마이 입구·상태, 신청 화면 로그인 (FR-1)
2. 신청 입력·저장·중복 (FR-2~4)
3. 상태 3단계·코드 입력·재신청 (FR-5, FR-7, FR-9)
4. 운영자 코드 발급·승인·반려·목록 (FR-6, FR-8, FR-10)
5. 권한·소유 재확인 (FR-11)

## Critical Files

### New Files

- `app/src/app/me/teacher/apply/page.tsx` — 신청/상태 화면
- `app/src/app/me/teacher/apply/apply-form.tsx` — 신청 폼(클라이언트)
- `app/src/app/me/teacher/apply/status-view.tsx` — 3단계·코드 입력·재신청(클라이언트)
- `app/src/app/me/teacher/apply/actions.ts` — 신청·코드 확인 액션
- `app/src/server/instructors/index.ts` — 내 강사 프로필 읽기, 신청·재신청, 코드 확인
- `app/src/app/admin/instructors/apply-forms.tsx` — 운영자 코드 발급·승인·반려(클라이언트)

### Modified Files

- `app/src/app/me/page.tsx` — 입구·상태 한 줄
- `app/src/components/chip.tsx` — `ChoiceChip` 체크박스 모드
- `app/src/server/admin/instructors.ts` — 목록·상세에 상태, 코드 발급·승인·반려
- `app/src/app/admin/actions.ts` — 운영자 액션 셋
- `app/src/app/admin/page.tsx`, `app/src/app/admin/instructors/[id]/page.tsx` — 상태 열, 신청 섹션
- `docs/03-기능명세서.md`, `_agent/rules/design.md` — 메모

### Reference Files

- `app/src/app/welcome/consent-form.tsx`(수강생 폼 스타일), `app/src/app/admin/instructors/instructor-forms.tsx`(운영 폼)
- `wireframes/index.html` T-01a·b

## Architecture

### User Flow

```text
마이 ─ [강사 신청] ──→ /me/teacher/apply (비로그인 → /me)
       또는 "강사 신청 대기 중 ›" / "확인됨 ›" / "강사로 승인됐어요" / "반려됐어요 ›"
  프로필 없음: 안내("예약은 지금 쓰는 그대로") + 활동명·@계정·지역 칩(여러 개)·소개 → [신청하기]
  있음: ① 신청 완료(@계정 · 지역)  ② 인스타 본인 확인 [ 6칸 코드 ] [확인하기]  ③ 운영자 승인
        반려: 사유 + 폼 다시 열림 → [다시 신청하기]
운영 /admin: 강사 표에 상태 열(대기·확인됨 위로) → /admin/instructors/{id}
  "강사 신청" 섹션: 상태·신청일·확인 여부 · [코드 발급] → 코드 한 번 표시 · [승인] · 사유 + [반려]
```

### Domain Model

```text
getMyInstructor(userId) → { id, status, displayName, handle, bio, regionIds, regionNames, rejectedReason,
                            code: "none" | "issued" | "expired" } | null
applyInstructor(userId, input)
  ├ 내 프로필 없음 → insert(userId, isProxy=false, status=pending) + regions
  ├ 내 프로필 rejected → update(필드, status=pending, rejectedReason=null) + regions 교체
  ├ 그 밖의 상태 → 오류
  └ 핸들 unique 위반 → 같은 핸들 프로필을 찾아 isProxy면 "운영자가 대신 등록한 계정", 아니면 "이미 있는 계정"
verifyInstructorCode(userId, code)
  pending + hash 있음 + 만료 전 + sha256(id:code) 일치 → status=verified, hash 비움
issueVerifyCode(id) → code(6자리) ; hash·expires=now+24h 저장 (pending·verified·rejected 아닌 approved는 거절)
approveInstructor(id) → approved, approvedAt ; rejectInstructor(id, reason) → rejected, rejectedReason
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 신청 폼·상태 화면·마이 입구부터
- 실제 화면이 안쪽 설계를 끌어준다. 상태 화면에 필요한 값(단계·코드 상태·사유)이 서버 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 신청·상태 화면과 마이 입구

페이지·폼·상태 뷰, `ChoiceChip` 체크박스 모드, 마이 배너/상태.

Mocking 상태: Step 2와 바로 이어 진행해 고정 데이터를 커밋하지 않는다.

### Step 2: 강사 서버·액션

`src/server/instructors`, 신청·코드 액션.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인.

### Step 3: 운영자 코드·승인·반려

서버 함수, 액션, 목록 상태 열, 상세 신청 섹션.

Mocking 상태: 없음.

### Step 4: 마무리

docs/03 F-11·F-14·F-10 메모, design.md(`ChoiceChip`), 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

되돌리는 트랜잭션 안에서 가짜 사용자로: 신청 → pending·regions, 중복 핸들(대리/일반) 거절, 빈 입력 거절, 코드 발급 → 틀림/맞음/만료, 승인 → approved·publiclyVisible, 반려 → 재신청 → pending, 승인 상태에서 재신청 거절, 다른 사용자 코드 입력 거절.

### Manual Test

1. 비로그인 `/me/teacher/apply` → `/me`
2. 로그인 화면은 가짜 데이터 미리보기(폼·상태 3단계·반려)로 375px 확인
3. 실제 신청·코드·승인은 로그인이 필요해 사용자 확인

## Considerations

### 기존 코드 재사용

`instructorInput`·`normalizeInstagramHandle`, `listRegions`, `ChoiceChip`, `StickerButton`, `ActionButton`, `requireAdmin`·`parse`·`toState`.

### 호환성

스키마 변경 없음. 대리 강사 흐름(`createProxyInstructor`·동의)은 그대로. `publiclyVisible`은 approved만 보므로 신청 중 강사는 영향이 없다.
