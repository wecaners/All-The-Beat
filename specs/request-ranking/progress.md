# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. F-08·F-01·U-06·와이어프레임 U-06a를 읽고 README 작성. 사용자 지시로 리뷰 생략
2. 홈 TOP 5 집계, 검색의 다가오는 클래스 수, `SongRow`, 권역 읽기를 조사해 findings 작성
3. spec 작성 (시나리오 11개, FR-13, CON-3, SC-4)

**생성/수정 파일**:

- `specs/request-ranking/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. Outside-In 순서로 plan 작성 (화면·홈 입구 → 랭킹 서버 → 마무리)
2. tasks의 Phase 3·4 체크리스트 작성

**생성/수정 파일**:

- `specs/request-ranking/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `listRequestRanking(regionId, limit)`: 지금 랭킹·7일 전 랭킹·다가오는 클래스 수 세 쿼리, JS에서 순위·변화 계산
2. `/requests` 화면: 권역 칩(링크), 검색 입구, 랭킹 줄(`RankRow`), 빈 화면, 스켈레톤
3. `SongRow`에 `stickers`·`action` 자리, `RankSticker` 부품(홈 TOP 5도 같이 씀), 홈 TOP 5 머리에 "랭킹 더보기"
4. 줄 둘째 줄이 375px에서 잘려 이번 주 증가를 썸네일 스티커로 옮김 (findings Learnings)
5. docs/03 F-08·F-01 구현 메모, design.md `SongRow`·`RankSticker`

**생성/수정 파일**:

- `app/src/app/requests/page.tsx`, `rank-row.tsx`, `app/src/components/rank-sticker.tsx` (새로 생성)
- `app/src/server/requests/index.ts`, `app/src/components/song-row.tsx`, `app/src/app/home-view.tsx` (수정)
- `docs/03-기능명세서.md`, `_agent/rules/design.md` (수정)

### Phase 4: Testing ✅

**작업 내역**:

1. 랭킹 함수를 되돌리는 트랜잭션 안에서 가짜 사용자 8명·추가요(10일 전·9일 전·2일 전·취소·opened·권역·어디든)로 17개 확인. 트랜잭션 안에서 기존 추가요를 비우고 돌렸고, 끝난 뒤 사용자 0명·추가요 수 원래대로
2. 375px 브라우저: 실제 `/requests`(빈 화면), `?region=2`, `?region=abc`, 가짜 데이터 미리보기로 줄 모양·홈 더보기·버튼 링크. 가로 넘침·콘솔 오류·서버 로그 오류 없음
3. `pnpm check`, `pnpm db:check`, `pnpm db:generate`("No schema changes")

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 3명 미만 제외 | s4에 2명 | 랭킹에 없음 | 없음 | ✅ |
| 순서·수·이번 주 증가 | s1 6(1주 1)·s2 4·s3 3(1주 3) | 1·2·3위 | 같음 | ✅ |
| 순위 변화 | 지난주 s2>s1, s3 없음 | s1 ▲1, s2 ▼1, s3 NEW | 같음 | ✅ |
| 취소 요청의 지난주 | 10일 전 생성, 3일 전 취소 | 지난주엔 셈, 지금은 안 셈 | 같음 | ✅ |
| 클래스 수 | s3에 공개 클래스 1 | s3 1, 나머지 0 | 같음 | ✅ |
| 홈 TOP 5와 순서 | 3명 이상 곡 | 랭킹 앞부분과 같음 | 같음 | ✅ |
| 권역 r1 | 어디든·r2 제외 | s2 4 > s1 4 > s3 3, same·same·new | 같음 | ✅ |
| 권역 r2 | s1 1명뿐 | 비어 있음 | 비어 있음 | ✅ |
| 되살린 요청 | 취소 → 다시 추가요 | 지금 5, 이번 주 +1 | 같음 | ✅ |
| `?region=abc` | 모르는 값 | 전체 | 전체 칩 켜짐 | ✅ |
| 375px | 미리보기 5줄 | 가로 넘침 없음 | scrollWidth 375 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 줄 둘째 줄 "이번 주 +6" 잘림 | 1 | 썸네일 스티커로 이동 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 완료 |
| 2. 다음에 할 일은? | 없음 (완료). 인수 10의 시트 자동 열림은 사용자 확인 |
| 3. 목표는? | 30일 추가요 랭킹을 권역별로 보고 바로 추가요 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
