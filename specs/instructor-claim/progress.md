# Progress Log


> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**


## Session 2026-11-03


### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. 사용자가 다음 기능으로 F-19를 골랐다. F-19, 05 플로우 9·상태도, ERD `instructor_profiles`, 와이어프레임 T-01 메모를 읽고 README 작성. 이후 사용자 지시("리뷰 스킵")로 리뷰 생략
2. 강사 신청·코드 발급·확인, 대리 강사 생성·게재 동의, 공개 조건을 조사해 findings·spec 작성

**생성/수정 파일**:

- `specs/instructor-claim/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan 작성 (강사 화면 → 스키마 → 서버 → 운영 화면·문서), tasks 체크리스트

**생성/수정 파일**:

- `specs/instructor-claim/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. 스키마 `claimUserId`·`claimRequestedAt` → `0008_instructor_claim` 생성·검토 → 사용자 확인 뒤 dev DB 적용 → 다시 generate "No schema changes"
2. `src/server/instructors`: `ClaimOffer`, 신청 중 미연결 대리 핸들이면 제안, `requestClaim`·`getMyClaim`·`verifyClaimCode`(행 잠금, 반려 프로필 삭제, 이전, 숨어 있던 클래스 추가요 열기)·`cancelMyClaim`
3. `src/server/admin/instructors`: `openRequestsForUpcomingClasses`를 게재 동의에서 빼서 같이 씀, 코드 발급 조건에 가져오기 신청 추가, `listPendingClaims`·`cancelClaimByAdmin`, 목록·상세에 신청 정보
4. 강사 화면: 신청 폼 아래 제안 카드, 가져오기 진행 상태(코드 입력·취소), 마이 입구 문구. 운영 화면: 홈 배너(신청한 강사로 이동), 목록 상태 표시, 강사 상세 "가져오기 신청" 구역(발급·취소)
5. docs/03 F-19 메모, docs/09 `instructor_profiles` 칸·8절, `specs/README.md`

**생성/수정 파일**:

- `app/src/app/me/teacher/apply/claim-view.tsx`, `app/src/db/migrations/0008_instructor_claim.sql`, `meta/0008_snapshot.json` (새로 생성)
- `app/src/db/schema/users.ts`, `app/src/server/instructors/index.ts`, `app/src/server/admin/instructors.ts`, `app/src/app/me/teacher/apply/{page,actions,apply-form,status-view}.tsx`, `app/src/app/me/page.tsx`, `app/src/app/admin/{page,actions}.tsx`, `app/src/app/admin/instructors/[id]/page.tsx`, `app/src/app/admin/instructors/apply-forms.tsx`, `meta/_journal.json` (수정)
- `docs/03-기능명세서.md`, `docs/09-ERD.md`, `specs/README.md` (수정)

### Phase 4: Testing 🔄

**작업 내역**:

1. 되돌리는 트랜잭션 안에서 가짜 대리 강사(동의 없음, 다가오는 클래스 2, 그 곡의 대기 추가요)·사용자 A·B·반려·승인 강사로 23개 확인. 끝난 뒤 남은 행 0
2. 임시 페이지(375px, 커밋 안 함, 삭제)에서 제안 카드와 진행 상태 확인
3. `pnpm check`, `pnpm db:generate`, 개발 서버 로그 prerender 경고 없음
4. 사용자 지시로 운영 홈 강사 목록 클래스 수 버그(`listInstructorsForAdmin`)도 고침. dev DB 강사 6명이 1·1·1·1·1·1 → 1·1·4·4·3·3(직접 센 값과 같음)

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 제안 | 미연결 대리 핸들로 신청 | `ClaimOffer` 클래스 2 | 같음 | ✅ |
| 연결된 핸들 | 승인 강사 핸들로 신청·가져오기 | 막음 | 같음 | ✅ |
| 신청 | A 신청 | 상태 none·숨김, 소유·공개 그대로, 운영 목록에 있음 | 같음 | ✅ |
| 코드 | 미발급·틀림·만료 | 각 문구 | 같음 | ✅ |
| 바꿔치기 | B가 다시 신청 | A 신청·코드 지워짐, A 옛 코드로 안 됨 | 같음 | ✅ |
| 취소 | 강사 취소, 운영자 취소 | 신청·코드 지워짐 | 같음 | ✅ |
| 이전 | 반려 사용자가 맞는 코드 | 연결·직접·승인, 반려 프로필 삭제, 내 클래스 2, 공개, 추가요 opened | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 새 칸을 읽는 쿼리가 `reading 'replace'`로 실패 | 1 | 개발 서버가 켜진 채 스키마를 바꿔 이전 DB 객체가 남았다. 서버 재시작 |
| 2026-11-03 | 가져올 클래스 수가 2가 아니라 1 | 1 | 단일 테이블 select에서 하위 쿼리의 `"id"`가 `classes.id`로 풀렸다. 테이블 이름을 직접 씀 |
| 2026-11-03 | `npx prettier`가 프로젝트에 없는 기본 설정으로 파일 둘을 통째로 다시 포맷 | 1 | 두 파일을 커밋 상태로 되돌리고 의도한 수정만 다시 넣음 |

## 5-Question Reboot Check


작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 (사용자 확인만 남음) |
| 2. 다음에 할 일은? | 사용자가 실제 흐름(로그인 → 가져오기 신청 → 운영자 발급 → 코드 → 내 클래스) 확인 → 커밋 (사용자 지시 시) |
| 3. 목표는? | 대리 등록 강사가 본인 확인을 거쳐 프로필과 클래스를 자기 계정으로 가져온다 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
