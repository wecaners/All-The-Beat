# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. F-12·F-24·F-13·F-06, 04 IA T-02·T-03, 05 플로우 5·6, 와이어프레임 T-02a·b·T-03a·b를 읽고 README 작성. 사용자 지시로 리뷰 생략
2. 운영자 등록(`createClassByAdmin`·`classInput`)·마감·앵콜 응답·스튜디오·카카오 검색, 클릭 기록, 클래스 상세, 마이·곡 상세 입구를 조사해 findings 작성
3. spec 작성 (시나리오 12개, FR-12, CON-4, SC-4)

**생성/수정 파일**:

- `specs/instructor-classes/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. Outside-In 순서로 plan 작성 (서버 일반화·강사 모듈 → 내 클래스 → 폼 → 마무리)
2. tasks의 Phase 3·4 체크리스트 작성

**생성/수정 파일**:

- `specs/instructor-classes/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. 운영자 `createClassByAdmin`을 `createClass(input, { createdByAdmin })`로 일반화, `listEncoresForAdmin(instructorId?)`
2. `src/server/instructors/classes.ts`: 승인 강사 id, 소유 확인(`ownedClass`), 목록(클릭·앵콜·다가오는/지난·답 필요 앵콜), 등록, 수정(일시·장소 변경 시 `scheduleChangedAt`), 상태(마감 임박·마감·풀기), 취소(사유), 앵콜 응답, 수정·복사·앵콜 폼 초기값, 내 장소, 곡 옵션(대기 수)
3. `ClassDetail.changedRecently` + 클래스 상세 "일시·장소 변경됨" 스티커
4. `/me/classes`(앵콜 카드·다가오는·지난·새 클래스), `MyClassCard`(상태 버튼·취소 시트·수정·복사), `EncoreCard`
5. `/me/classes/new`(`?song=`·`?copy=`·`?encoreOf=`)·`/{id}/edit`, `ClassForm`(곡 고르기·달력 시트·시간 칩 시트·내 스튜디오 칩 + 카카오 검색 시트·권역 칩·난이도·링크·설명), 강사 액션 11개
6. 마이 승인 줄 → 내 클래스, 곡 상세 "이 곡으로 클래스 열기"(승인 강사)
7. 린트: JSX 따옴표 → `&ldquo;`, 미사용 구조분해 → `formFields` 헬퍼
8. docs/03 F-12·F-24·F-10 메모, design.md 시트 고르기 메모

**생성/수정 파일**:

- `app/src/server/instructors/classes.ts`, `app/src/app/me/classes/page.tsx`, `class-card.tsx`, `encore-card.tsx`, `class-form.tsx`, `song-picker.tsx`, `studio-picker.tsx`, `time-sheet.tsx`, `actions.ts`, `new/page.tsx`, `[id]/edit/page.tsx` (새로 생성)
- `app/src/server/admin/classes.ts`, `app/src/server/admin/encores.ts`, `app/src/server/classes/index.ts`, `app/src/app/class/[id]/class-view.tsx`, `app/src/app/me/page.tsx`, `app/src/app/song/[slug]/page.tsx` (수정)
- `docs/03-기능명세서.md`, `_agent/rules/design.md` (수정)

### Phase 4: Testing ✅

**작업 내역**:

1. 되돌리는 트랜잭션 안에서 가짜 승인 강사 둘·대기 강사·수강생으로 63개 확인: 권한, 입력 검증 6종, 등록(공개·추가요·createdByAdmin·자동 이름·링크 유형·권역 추정·장소 저장), 타인 거절(수정·상태·취소·앵콜·앵콜 클래스), 목록·클릭 수, 상태 전이 전부, 앵콜 있으면 풀기 거절, 수정 초기값·가격만/날짜 변경·곡 교체·`changedRecently`, 복사 초기값, 취소 사유·취소 뒤 거절, 종료 클래스 수정 거절·복사 가능, 앵콜 전달 → 검토 → 앵콜 클래스 → 라운드 opened, 곡 옵션. 끝난 뒤 강사·사용자 0
2. 375px 브라우저: 비로그인 `/me/classes`·`/new` → `/me`. 임시 페이지에서 앵콜 카드·상태별 카드(버튼 조합)·취소 시트·폼·시작/종료 시간 시트(시작 전 시간 비활성)·장소 검색 시트(서버 거절 문구). 가로 넘침 없음
3. `pnpm check`, `pnpm db:check`, `pnpm db:generate`

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 등록 | 새 장소·naver 링크·곡 1 | 공개, 추가요 열림, naver, 마포구→권역 | 같음 | ✅ |
| 검증 | 과거/종료<시작/ftp/곡 0·4/장소 없음 | 각 문구 | 같음 | ✅ |
| 타인 | B가 A 클래스 수정·상태·취소·앵콜 | "내 클래스가 아니에요" | 같음 | ✅ |
| 상태 | 임박 → 해제 → 마감 → 풀기 → 앵콜 뒤 풀기 | 전이 / 거절 | 같음 | ✅ |
| 수정 | 가격만 / 날짜+곡 | changed false / true·곡 2 | 같음 | ✅ |
| 취소 | low_turnout | canceled·"인원 미달"·이후 수정 거절 | 같음 | ✅ |
| 앵콜 | threshold 채움 → 검토 → 앵콜 클래스 | delivered → reviewing → opened | 같음 | ✅ |
| 비로그인 | `/me/classes`, `/me/classes/new` | `/me` | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 테스트 "곡 4개"에 병합 곡 id가 섞임, "추가요 1 열림"에 dev 데이터 영향 | 1 | 유효 곡 4개로, 기대값 ≥1로 |
| 2026-11-03 | 린트 `react/no-unescaped-entities`, 미사용 구조분해 | 1 | `&ldquo;`, `formFields` 헬퍼 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 완료 |
| 2. 다음에 할 일은? | 없음 (완료). 실제 로그인 흐름은 사용자 확인 |
| 3. 목표는? | 강사가 직접 클래스를 올리고 관리한다 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
