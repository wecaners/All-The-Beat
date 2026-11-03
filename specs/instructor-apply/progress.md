# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. F-11·F-14·F-10·F-19, 04 IA T-01, 05 플로우 4·9, 와이어프레임 T-01a·b를 읽고 README 작성. 사용자 지시로 리뷰 생략
2. 강사 스키마(상태·코드 해시·반려 사유), 운영자 대리 등록·목록·상세, 마이, `ChoiceChip`을 조사해 findings 작성
3. spec 작성 (시나리오 10개, FR-11, CON-3, SC-4)

**생성/수정 파일**:

- `specs/instructor-apply/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. Outside-In 순서로 plan 작성 (화면·마이 → 강사 서버·액션 → 운영자 → 마무리)
2. tasks의 Phase 3·4 체크리스트 작성

**생성/수정 파일**:

- `specs/instructor-apply/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `src/server/instructors`: `getMyInstructor`(상태·권역·코드 상태), `applyInstructor`(신청·반려 뒤 재신청, 핸들 중복은 대리 여부에 따라 안내), `verifyInstructorCode`(본인·대기·미발급·만료·불일치 구분). 코드 해시는 운영자 모듈의 `hashVerifyCode`를 같이 쓴다(순환 import를 피해 운영자 쪽에 둠)
2. 운영자: 목록에 `status`·`createdAt`(대기·확인됨 위로), 상세에 소개·사유·승인일·코드 유효, `issueVerifyCode`(6자리, sha256(id:code), 24시간)·`approveInstructor`·`rejectInstructor`
3. `/me/teacher/apply`: 비로그인 → `/me`. 폼(`ApplyForm`, 반려 뒤 이전 값 채움)·3단계 상태(`StatusView`, 코드 입력). 마이에 강사 신청 입구/상태 한 줄
4. 운영 강사 상세에 "강사 신청" 섹션(상태·신청일·소개·코드·승인·반려), 목록에 상태 열. `ChoiceChip`에 `multiple`(체크박스)
5. 코드 입력칸이 버튼 옆에서 눌려 세로로 바꿈. "클래스 등록 화면은 준비 중"은 약속이라 뺌(원칙 6)
6. docs/03 F-11·F-14·F-10 메모, design.md `ChoiceChip`

**생성/수정 파일**:

- `app/src/server/instructors/index.ts`, `app/src/app/me/teacher/apply/page.tsx`, `apply-form.tsx`, `status-view.tsx`, `actions.ts`, `app/src/app/admin/instructors/apply-forms.tsx` (새로 생성)
- `app/src/server/admin/instructors.ts`, `app/src/app/admin/actions.ts`, `app/src/app/admin/page.tsx`, `app/src/app/admin/instructors/[id]/page.tsx`, `app/src/app/me/page.tsx`, `app/src/components/chip.tsx` (수정)
- `docs/03-기능명세서.md`, `_agent/rules/design.md` (수정)

### Phase 4: Testing ✅

**작업 내역**:

1. 되돌리는 트랜잭션 안에서 가짜 사용자 3명·대리 강사로 45개 확인: 입력 검증·핸들 정규화, 신청(pending·권역·trim·isProxy·userId), 중복(사용자·일반 핸들·대리 핸들 문구), 코드(미발급·대리 불가·6자리·해시만·재발급 무효·타인·만료·성공·verified 뒤 거절), 목록 정렬·상세, 반려(사유 필수)·재신청(같은 행·권역 교체)·승인(approvedAt·공개 조건)·승인 뒤 재신청 거절, 대리 강사 영향 없음. 끝난 뒤 강사·사용자 0
2. 375px 브라우저: 비로그인 `/me/teacher/apply` → `/me`. 임시 페이지에서 폼(체크박스 칩 여러 개), 대기(코드 입력)·반려(이전 값·다시 신청하기)·승인 상태, 비로그인 코드 제출 → 서버 거절. 가로 넘침 없음
3. `pnpm check`, `pnpm db:check`, `pnpm db:generate`

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 신청 | 민지 / @Apply.Test_1 / 권역 2(중복 포함) / 소개 | pending, 권역 2, trim, code none | 같음 | ✅ |
| 중복 | 같은 사용자·같은 핸들·대리 핸들 | 각각 거절 + 문구 | 같음 | ✅ |
| 코드 | 미발급·재발급·타인·만료·성공 | 구분된 오류 / verified | 같음 | ✅ |
| 반려·재신청 | 사유 → 재신청 | rejected → pending, 같은 행 | 같음 | ✅ |
| 승인 | approve | approved, approvedAt, 공개 조건 | 같음 | ✅ |
| 비로그인 | `/me/teacher/apply` | `/me`로 | 같음 | ✅ |
| 비로그인 제출 | 코드 123456 | "로그인이 필요해요" | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 코드 입력칸이 버튼에 눌려 좁음 | 1 | 세로 배치 |
| 2026-11-03 | 테스트의 `publiclyVisible` 단독 사용(classes 조인 없음) | 1 | 강사 조건만 SQL로 확인 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 완료 |
| 2. 다음에 할 일은? | 없음 (완료). 실제 로그인 흐름은 사용자 확인 |
| 3. 목표는? | 강사 신청 → 코드 확인 → 운영자 승인 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
