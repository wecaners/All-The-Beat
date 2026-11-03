# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. README 작성. 와이어프레임 U-09에 맞춰 마이는 보기만 하고 수정·취소는 상세에서. 회원 탈퇴는 관리자 키·카카오 연결 끊기·기록 범위가 정해지지 않아 뺌. 사용자 지시("리뷰 스킵")로 이후 리뷰 생략
2. 로그인·추가요·앵콜 코드와 와이어프레임 조사 → findings.md, spec 작성

**생성/수정 파일**:

- `specs/my-page/README.md`, `spec.md`, `findings.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md(마이 화면·홈 입구 → 서버 → 로그아웃 → 마무리), tasks.md 인수 체크리스트

**생성/수정 파일**:

- `specs/my-page/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `src/server/me`: 내 추가요(취소 제외, 열린 것 먼저, 열린 클래스는 공개일 때만 링크, 곡 상세와 같은 90일 기다리는 수), 내 앵콜(취소·비공개 제외, 앵콜 서버와 같은 상태·인원·기준, 열린 것 먼저)
2. `/me`: 비로그인 안내 카드(카카오 시작, 카톡 복귀 안내), 닉네임, 내 추가요(`SongRow`에 `meta`·`status`·`href`), 내 앵콜(`ClassTicket`), 빈 목록 안내·검색 입구, 로그아웃
3. 홈 머리 오른쪽 마이 입구, `formatShortDate`
4. docs/03 F-10 구현 메모, design.md `SongRow` 설명

**생성/수정 파일**:

- 새로: `app/src/server/me/index.ts`, `app/src/app/me/page.tsx`, `login-card.tsx`, `actions.ts`
- 수정: `app/src/app/page.tsx`, `app/src/components/song-row.tsx`, `app/src/lib/format.ts`, `docs/03-기능명세서.md`, `_agent/rules/design.md`

### Phase 4: Testing 🔄

**작업 내역**:

1. 목록 쿼리 9개를 되돌리는 트랜잭션 안 가짜 사용자로 확인, 남은 테스트 사용자 0
2. 홈 입구 → `/me` 비로그인 화면, 로그인 화면 모양(가짜 데이터 임시 미리보기, 커밋 안 함) 375px 확인, 가로 넘침 없음

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 내 추가요 | 기다림·열림·취소 | 2건, 열림 먼저, 열린 클래스 링크 | 같음 | ✅ |
| 기다리는 수 | 같은 곡 다른 사람 | 곡 상세 90일 기준과 같음 | 같음 | ✅ |
| 열린 클래스 숨김 | 비공개 | 링크 없음(곡 상세로) | 같음 | ✅ |
| 다른 사람 | 다른 사용자 목록 | 내 요청 없음 | 같음 | ✅ |
| 내 앵콜 | 모으는 중·오픈 | 2건, 오픈 먼저, 상세와 같은 상태·인원 | 같음 | ✅ |
| 취소·비공개 앵콜 | 취소 / 원 클래스 숨김 | 빠짐 | 같음 | ✅ |
| 로그인 후 화면·로그아웃 | 카카오 로그인 | — | 미확인 | ⏸️ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 임시 미리보기에서 `Date.now()` prerender 경고 | 1 | 미리보기 전용 코드라 지움. 실제 `/me`는 `getCurrentUser()`가 요청 시점에 읽는다 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 — 로그인이 필요한 확인만 남음 |
| 2. 어디로 가는가? | 사용자가 카카오 로그인으로 `/me` 목록·빈 목록·로그아웃 확인 |
| 3. 목표는? | 내 추가요·앵콜의 결과를 한곳에서 보고 열린 클래스로 바로 간다 |
| 4. 지금까지 배운 것은? | findings.md 참조 |
| 5. 무엇을 했는가? | Phase 3 완료, 목록 쿼리 9개 확인, 화면 미리보기 확인 |
