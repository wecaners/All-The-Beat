# Implementation Plan: 강사 클래스 등록과 내 클래스

## Summary

`/me/classes`(목록·상태·앵콜 응답)와 `/me/classes/new`·`/{id}/edit`(스크랩북 폼)를 만들고, 서버는 `src/server/instructors/classes.ts`가 소유를 확인한 뒤 운영자 함수(`createClass`·`setClassClosed`·`respondToEncore`·`saveStudio`)를 부른다. 수정은 새 함수. 클래스 상세에 "변경됨"을 더한다. 스키마는 바꾸지 않는다.

## Requirements

1. 강사 권한·입구 (FR-1, FR-11)
2. 등록 폼·검증·공개·곡·장소 (FR-2~5)
3. 내 클래스 목록·상태·취소 (FR-6~7)
4. 수정·변경됨·복사 (FR-8~9)
5. 앵콜 응답·앵콜 클래스 (FR-10)
6. 서버 재확인 (FR-12)

## Critical Files

### New Files

- `app/src/app/me/classes/page.tsx` — 내 클래스
- `app/src/app/me/classes/class-card.tsx` — 항목(상태 버튼·취소 시트·복사·수정 링크)(클라이언트)
- `app/src/app/me/classes/encore-card.tsx` — 앵콜 응답 카드(클라이언트)
- `app/src/app/me/classes/new/page.tsx`, `app/src/app/me/classes/[id]/edit/page.tsx` — 등록·수정
- `app/src/app/me/classes/class-form.tsx` — 폼(클라이언트)
- `app/src/app/me/classes/song-picker.tsx`, `studio-picker.tsx`, `time-sheet.tsx` — 곡·장소·시간 고르기(클라이언트)
- `app/src/app/me/classes/actions.ts` — 강사 액션
- `app/src/server/instructors/classes.ts` — 강사 클래스 서버(소유 확인·목록·수정·상태·취소·프리필)

### Modified Files

- `app/src/server/admin/classes.ts` — `createClass(input, origin)`로 일반화(`createClassByAdmin` 유지)
- `app/src/server/admin/encores.ts` — `listEncoresForAdmin(instructorId?)`
- `app/src/server/classes/index.ts`, `app/src/app/class/[id]/class-view.tsx` — `changedRecently` + "변경됨"
- `app/src/app/me/page.tsx` — 승인 강사 줄 → 내 클래스
- `app/src/app/song/[slug]/page.tsx` — 승인 강사의 "이 곡으로 클래스 열기"
- `_agent/rules/design.md`, `docs/03-기능명세서.md` — 메모

### Reference Files

- `app/src/app/admin/classes/new/class-form.tsx`·`song-picker.tsx`, `app/src/app/admin/instructors/studio-forms.tsx`(운영자 폼 동작)
- `app/src/components/calendar.tsx`, `app/src/app/classes/date-pick.tsx`(시트 패턴)
- `wireframes/index.html` T-02a·b, T-03a·b

## Architecture

### User Flow

```text
마이 "강사로 승인됐어요 ›" ─→ /me/classes
  [앵콜 응답 필요 · 1]  NEON 원데이 10/28 · 12명  [검토할게요] [이번엔 어려워요]  (검토 중이면 [앵콜 클래스 열기])
  다가오는 N  |  지난 M                                   [+ 새 클래스]
  🎫 10/28 NEON 원데이 · 홍대·합정 · 19:30~21:00 · 35,000원 · 입문   [모집 중]
     예약 클릭 38 · 앵콜 12        [마감 임박] [마감하기] [수정] [취소]
  🎫 (지난) … [복사해서 다시 열기]

/me/classes/new?song=&copy=&encoreOf=   (탭바 없음, "내 클래스로")
  (곡 미리 선택이면) "23명이 기다리는 곡이에요"
  배우는 곡 [검색 칩…] (+ 새 곡)   이름(선택)
  날짜 [달력 시트]  시작 [시간 시트]  종료 [시간 시트]
  장소 [내 스튜디오 칩…] [+ 새 장소 찾기 → 시트]   권역 [칩, 장소로 자동]
  가격  난이도 [칩]  예약 링크  정원(선택)  설명(선택)
  [등록하고 바로 공개] → /class/{id}
/me/classes/{id}/edit  같은 폼, 값 채움, [저장] → /class/{id}
```

### Domain Model

```text
requireMyInstructor(userId) → approved 강사 id (아니면 null)
listMyClasses(instructorId) → { upcoming: MyClassRow[], past: MyClassRow[], encores: AdminEncoreDetail[] }
  MyClassRow: id, title, startsAt, endsAt, regionName, price, level, status(표시), bookingClicks, encoreCount, encoreStatus
createMyClass(instructorId, input)   → createClass({ ...input, instructorId }, { createdByAdmin: false })
updateMyClass(instructorId, classId, input)
  소유·종료 전·취소 아님 확인 → 장소 결정(운영자와 같은 규칙) → classes update(+ scheduleChangedAt if 일시·장소 변경) → class_songs 교체
setMyClassStatus(instructorId, classId, to)  closing_soon ↔ open: 직접 update / closed·open: setClassClosed
cancelMyClass(instructorId, classId, reason) → status canceled + cancelReason (종료 전만)
respondToMyEncore(instructorId, classId, answer) → 소유 확인 → respondToEncore
getMyClassForEdit / getCopySource(instructorId, classId) → 폼 초기값
ClassDetail.changedRecently = scheduleChangedAt > now() - 24h
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 내 클래스·등록 폼부터
- 실제 화면이 안쪽 설계를 끌어준다. 폼 초기값 모양(복사·앵콜·수정)이 서버 프리필 함수를 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 서버 — 일반화와 강사 모듈

`createClass(input, origin)`, `listEncoresForAdmin(instructorId?)`, `src/server/instructors/classes.ts`(목록·등록·수정·상태·취소·앵콜·프리필), `ClassDetail.changedRecently`.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인.

### Step 2: 내 클래스 화면과 액션

`/me/classes`, 카드·앵콜 카드, 액션, 마이 입구, 클래스 상세 "변경됨".

Mocking 상태: 없음.

### Step 3: 등록·수정 폼

폼·곡·장소·시간·달력 시트, `?song=`·`?copy=`·`?encoreOf=`, 곡 상세 입구.

Mocking 상태: 없음.

### Step 4: 마무리

docs/03 F-12·F-24·F-10 메모, design.md, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

되돌리는 트랜잭션 안에서 가짜 승인 강사 둘로: 등록(공개·추가요 열림·createdByAdmin false), 검증 실패, 타인 소유 거절, 상태 전이(마감 임박·마감·풀기·앵콜 있으면 풀기 거절), 취소 사유, 수정(일시 변경 → scheduleChangedAt, 가격만 → 없음, 종료·취소 거절), 복사 초기값, 앵콜 응답(소유), 목록(클릭·앵콜 수·분리).

### Manual Test

1. 비로그인 `/me/classes` → `/me`
2. 가짜 데이터 미리보기로 목록·폼·시트(375px)
3. 실제 등록·상태·앵콜은 로그인이 필요해 사용자 확인

## Considerations

### 기존 코드 재사용

`classInput`·`createClassByAdmin`·`guessRegion`·`guessBookingType`·`listPlacesForInstructor`·`getEncoreSource`·`setClassClosed`·`respondToEncore`·`saveStudio`·카카오 검색, `searchSongs`·`registerSong`, `Calendar`·`BottomSheet`·`ChoiceChip`·`ClassTicket`.

### 호환성

스키마 변경 없음. 운영자 함수는 시그니처를 유지하고 옵션만 늘어난다. 클래스 상세에 "변경됨" 라벨이 추가된다.
