# Implementation Plan: 운영자 클래스 관리

## Summary

`src/server/admin/classes.ts`에 전체 목록(필터)·상세·숨김·링크 수정·종료·취소를 더하고, `/admin/classes`(목록)와 `/admin/classes/{id}`(상세·버튼)를 만든다. 운영 홈·메뉴에 입구를 둔다. 스키마는 바꾸지 않는다.

## Requirements

1. 목록·필터·숫자 (FR-1~2)
2. 상세 (FR-3)
3. 숨김·링크·종료·취소 (FR-4~8)

## Critical Files

### New Files

- `app/src/app/admin/classes/page.tsx` — 전체 목록·필터
- `app/src/app/admin/classes/[id]/page.tsx` — 상세
- `app/src/app/admin/classes/[id]/manage-forms.tsx` — 링크 수정·취소 폼(클라이언트)

### Modified Files

- `app/src/server/admin/classes.ts` — `listClassesForAdmin(filters)`, `getClassForAdmin`, `setClassHidden`, `updateBookingUrl`, `endClass`, `cancelClassByAdmin`, 취소 사유
- `app/src/app/admin/actions.ts` — 액션 넷
- `app/src/app/admin/page.tsx`, `app/src/app/admin/layout.tsx` — 입구
- `docs/03-기능명세서.md` — F-17 메모

### Reference Files

- `app/src/server/instructors/classes.ts`(강사 상태·취소 규칙), `app/src/app/admin/songs/page.tsx`(주소 필터), `app/src/app/admin/instructors/[id]/page.tsx`(상세 패턴)

## Architecture

### User Flow

```text
/admin "클래스 전체 보기 ›" · 메뉴 "클래스" → /admin/classes?status=&instructor=&region=&q=&hidden=
  [상태 ▾] [강사 ▾] [권역 ▾] [검색어] [숨김만]  [적용]
  표: 일시 · 클래스 · 강사 · 권역 · 공개 · 상태 · 클릭 · 앵콜 → /admin/classes/{id}
    정보 전체 · 수강생 화면 ↗
    [숨기기 / 숨김 풀기]  [마감하기 / 마감 풀기]  [강제 종료(confirm)]
    예약 링크 [input] [저장]       취소 사유 [select] [취소(confirm)]
```

### Domain Model

```text
listClassesForAdmin({ status?, instructorId?, regionId?, q?, hiddenOnly? })
  classes ⋈ instructors ⋈ regions ⋈ class_songs(1) ⋈ songs ⋈ artists
  displayStatus = canceled | (ends_at ≤ now → ended) | status ; 필터는 displayStatus로
  q → title / song.title / artist.name ILIKE
  + bookingClicks(events), encoreCount, isPublic
getClassForAdmin(id) → getEncoreSource + status·isHidden·isPublic·createdByAdmin·instructor·clicks·encore·cancelReason
setClassHidden(id, hidden) ; updateBookingUrl(id, url) → bookingType = guess ; endClass(id) ; cancelClassByAdmin(id, reason)
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 목록·상세부터
- 실제 화면이 안쪽 설계를 끌어준다. 표에 필요한 수와 필터가 서버 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 서버·액션

목록·상세·네 동작·액션.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인.

### Step 2: 운영 화면

목록 페이지·상세 페이지·폼·입구.

Mocking 상태: 없음.

### Step 3: 마무리

docs/03 F-17 메모, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

되돌리는 트랜잭션 안에서 가짜 강사·클래스(상태·권역·숨김·종료 시각 다양)로 필터 5종, 숨김 ↔ `getPublicClass`, 링크 수정·유형·거절, 종료·취소·재처리 거절.

### Manual Test

운영 화면은 로그인이 필요해 임시 페이지에서 폼 모양 확인. 실제 동작은 사용자 확인.

## Considerations

### 기존 코드 재사용

`getEncoreSource`, `setClassClosed`, `guessBookingType`, `classInput.shape.bookingUrl`, `activeEncoreCount`, `ActionButton`·`Table`.

### 호환성

스키마 변경 없음. 운영 홈 표는 그대로. 숨김은 기존 `publiclyVisible`로 바로 반영된다.
