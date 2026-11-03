# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. F-03·F-01·F-02·U-03·와이어프레임 U-03a·b를 읽고 README 작성. 사용자 지시로 리뷰 생략
2. 홈 다가오는 클래스 쿼리, 검색의 곡 찾기 SQL, 앵콜 수 식, `ClassTicket`, KST 포맷을 조사해 findings 작성
3. spec 작성 (시나리오 12개, FR-13, CON-3, SC-4)

**생성/수정 파일**:

- `specs/class-list/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. Outside-In 순서로 plan 작성 (화면·칩·입구 → 서버·파싱·검색어 → 이어 붙이기 → 마무리)
2. tasks의 Phase 3·4 체크리스트 작성

**생성/수정 파일**:

- `specs/class-list/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `src/server/classes/list.ts`: 조건 파싱(`parseClassListQuery`)·주소 만들기(`classListSearch`)·KST 날짜 경계(`dateRange`)·목록(`listClasses`, 커서)·개수(`countClasses`)
2. `searchSongs`의 곡 찾기 SQL을 `matchSongIds`로 분리해 목록의 검색어 필터와 공유
3. `/classes` 화면: 조건 칩(링크)·날짜 직접 고르기(`DatePick`)·개수와 마감 포함·날짜별 티켓 목록(`ClassList`)·빈 화면·스켈레톤. 다음 20개는 `loadMoreClassesAction`
4. 홈 다가오는 클래스에 "전체 보기", 검색 칸 엔터 → `/classes?q=`
5. 개발 서버에서 "unstable value `new Date()`"가 나 `connection()` 추가 (findings Issues 1). 2026-02-30 같은 날짜가 통과해 되돌려 비교하도록 고침
6. docs/03 F-03·F-01·F-02 구현 메모

**생성/수정 파일**:

- `app/src/app/classes/page.tsx`, `class-list.tsx`, `date-pick.tsx`, `actions.ts`, `app/src/server/classes/list.ts` (새로 생성)
- `app/src/server/songs/search.ts`, `app/src/app/search/search-box.tsx`, `app/src/app/home-view.tsx` (수정)
- `docs/03-기능명세서.md` (수정)

### Phase 4: Testing ✅

**작업 내역**:

1. 파싱·날짜 경계 11개(DB 없이) + 되돌리는 트랜잭션 안에서 가짜 클래스(내일·3일 뒤·마감·취소·숨김·진행 중·종료, 권역 셋, 난이도 셋, 둘째 곡)로 17개 확인. 같은 시각 25개로 커서 빠짐·겹침 없음. 끝난 뒤 클래스 수 원래대로
2. 375px 브라우저: `/classes`, 권역 칩·마감 포함 누르기(주소 바뀜), `?closed=1&region=1,2&date=week`, `?q=zzzz&level=intro`(빈 화면), 검색 엔터, 홈 전체 보기, 임시 페이지에서 이어 붙이기(서버 액션 POST 200, 3개 추가). 가로 넘침 없음
3. `pnpm check`, `pnpm db:check`, `pnpm db:generate`

### 날짜 고르기를 달력 시트로 (사용자 피드백) ✅

**작업 내역**:

1. 사용자 피드백 "날짜 고르기 UI가 너무 기본 UI 같다" → `<input type="date">`를 다이어리 달력 시트로 교체. `Calendar` 부품(월 넘기기 석 달, 오늘 전 비활성, 오늘 라벨, 고르면 핑크 도장)을 `BottomSheet`에 넣고 "날짜 조건 지우기"
2. 375px 브라우저: 시트 열림, 11월 6일 고르면 `?date=2026-11-06`·칩 "11월 6일"·목록 1개, 다시 열면 도장과 지우기 버튼, 다음 달 넘기기. 가로 넘침·서버 로그 오류 없음
3. README·spec CON-1·findings 결정·design.md 갱신

**생성/수정 파일**:

- `app/src/components/calendar.tsx` (새로 생성)
- `app/src/app/classes/date-pick.tsx`, `_agent/rules/design.md`, `specs/class-list/README.md`, `spec.md`, `findings.md` (수정)

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 파싱 | `q=neon&date=week&region=1,3,3,x&level=intro&closed=1` | 중복·잘못된 값 제거 | 같음 | ✅ |
| 파싱 | `date=2026-02-30`, `2026-13-01` | 무시 | 무시 | ✅ |
| 날짜 경계 | 2026-11-03(화) 기준 오늘·이번 주·이번 주말·직접 | KST 00:00 경계 | 같음 | ✅ |
| 날짜 경계 | 일요일의 이번 주·이번 주말 | 오늘까지 | 같음 | ✅ |
| 기본 목록 | 9개 중 보일 것 3개 | 시작순 3개 | 같음 | ✅ |
| 홈과 순서 | 다가오는 클래스 10개 | 목록 앞부분과 같음 | 같음 | ✅ |
| 마감 포함 | closed 1개 | 4개, 상태 closed | 같음 | ✅ |
| 권역·난이도·검색어 | 각각 | 맞는 집합 | 같음 | ✅ |
| 커서 | 같은 시각 25 + 1 | 20 + 7, 중복 0 | 같음 | ✅ |
| 브라우저 | 칩·토글·엔터·전체 보기 | 주소 바뀜·이동 | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | unstable value `new Date()` while prerendering | 1 | `connection()` 추가 |
| 2026-11-03 | `2026-02-30`이 날짜로 통과 | 1 | 되돌려 비교 |
| 2026-11-03 | `2026-13-01`에 `Intl`이 RangeError | 1 | `isNaN` 먼저 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 완료 |
| 2. 다음에 할 일은? | 없음 (완료). 날짜 입력 UI·마감 카드 모양·곡은 있는데 클래스 없음 화면은 사용자 확인 |
| 3. 목표는? | 열린 클래스를 날짜순으로 보고 조건으로 좁혀 상세로 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
