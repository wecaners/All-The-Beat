# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. README 작성. 강사 화면·알림이 없어 강사 응답은 운영자가 대신 남기고, 마감으로 바꾸는 곳이 없어 운영자 마감하기를 범위에 더함. 사용자 지시("리뷰 스킵")로 이후 리뷰 생략
2. 앵콜 스키마(이미 있음)·추가요 흐름·클래스 상세·운영자 클래스 등록·시안 응원봉 조사 → findings.md, spec 작성

**생성/수정 파일**:

- `specs/encore/README.md`, `spec.md`, `findings.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md(클래스 상세 앵콜 패널 → 앵콜 서버·수강생 액션 → 운영 목록·응답·마감 → 앵콜 클래스 등록 → 마무리), tasks.md 인수 체크리스트

**생성/수정 파일**:

- `specs/encore/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `src/server/encores`: 기준 인원(정수 계산), 앵콜할 수 있는 상태, 읽을 때 정하는 만료, 상세용 요약, 내 앵콜, 저장(라운드 행 잠금 → 기준 도달 시 전달됨), 취소
2. 클래스 상세: 마감·종료면 하단 막대 대신 앵콜 패널(핑크 카드·응원봉·진행 막대·내 앵콜 도장·수정·취소, 입력·로그인·취소 시트, 처음 앵콜하면 응원봉 움직임). 앵콜 클래스에는 원래 클래스 링크. 공용 `Lightstick`
3. 운영: `/admin/encores`(응답 필요 카드: 인원·두 숫자·분포·한마디 5개·날짜·인스타·기대치 안내, 검토할게요·이번엔 어려워요·앵콜 클래스 등록 / 모으는 중 표), 첫 화면 알림, 메뉴, 다가오는 클래스의 상태·마감하기·마감 풀기
4. 앵콜 클래스 등록: `?encoreOf=`로 원 클래스 값 미리 채움, 강사 고정, 같은 트랜잭션에서 원 앵콜 오픈
5. design.md(`Lightstick`, 인터랙션 표 앵콜 응원봉), docs/03 F-05·F-24 구현 메모

**생성/수정 파일**:

- 새로: `app/src/server/encores/index.ts`, `app/src/server/admin/encores.ts`, `app/src/app/class/[id]/encore-panel.tsx`, `actions.ts`, `app/src/components/lightstick.tsx`, `app/src/app/admin/encores/page.tsx`, `app/src/app/admin/action-button.tsx`
- 수정: `app/src/server/classes/index.ts`, `app/src/app/class/[id]/page.tsx`, `class-view.tsx`, `app/src/server/admin/classes.ts`, `app/src/app/admin/actions.ts`, `page.tsx`, `layout.tsx`, `classes/new/page.tsx`, `class-form.tsx`, `song-picker.tsx`, `_agent/rules/design.md`, `docs/03-기능명세서.md`

### Phase 4: Testing 🔄

**작업 내역**:

1. 규칙 34개를 서버 함수로 되돌리는 트랜잭션 안에서 확인(findings Learnings), 남은 테스트 사용자 0
2. 상태별 화면(모으는 중 0명·3명, 검토 중+내 앵콜+앵콜 클래스 표시, 오픈, 어려워요)을 임시 미리보기로 375px 확인, 비로그인 앵콜 → 로그인 시트, 가로 넘침·콘솔 오류 없음
3. 문구 고침: 큰 숫자 아래 "이 앵콜을 기다려요"가 "이 앵콜"로 읽혀 "앵콜을 기다리고 있어요"로

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 기준 인원 | 정원 10·11·20·1·없음 | 3·4·6·3·5 | 같음 | ✅ |
| 모집 중 앵콜 | open 클래스 | 거절 | 거절 | ✅ |
| 같은 사람 두 번 | 다시 저장 | 인원 그대로, 내용 바뀜 | 같음 | ✅ |
| 기준 도달 | 기준 인원째 앵콜 | 전달됨, 운영 목록 | 같음 | ✅ |
| 전달 뒤 취소 | 기준 아래로 | 전달됨 유지 | 같음 | ✅ |
| 검토할게요 | 전달됨 | 검토 중, 검토 시작 인원 저장 | 같음 | ✅ |
| 검토 중 취소 | 2명 취소 | 검토 중 유지, 두 숫자 | 같음 | ✅ |
| 앵콜 클래스 | 다른 강사 / 같은 강사 | 거절 / 오픈·링크 | 같음 | ✅ |
| 어려워요·오픈 뒤 앵콜 | 저장 | 거절 | 거절 | ✅ |
| 만료 | 종료 40일 / 10일 / 만료 시각 지남 | 만료 / 가능 / 만료 | 같음 | ✅ |
| 마감 풀기 | 앵콜 있음 / 없음 | 거절 / 모집 중 | 같음 | ✅ |
| 운영 화면·실제 저장 | 로그인 필요 | — | 미확인 | ⏸️ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 검증 스크립트 `UNDEFINED_VALUE` (가짜 사용자 4명 < 기준 5명) | 1 | 가짜 사용자 7명으로 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 — 로그인이 필요한 확인만 남음 |
| 2. 어디로 가는가? | 사용자가 운영자·카카오 로그인으로 운영 앵콜 화면, 마감, 앵콜 클래스 등록, 실제 앵콜 저장(응원봉) 확인 |
| 3. 목표는? | 마감·종료 클래스에 앵콜을 모아 운영자가 강사에게 전하고 앵콜 클래스로 잇는다 |
| 4. 지금까지 배운 것은? | findings.md Learnings 참조 |
| 5. 무엇을 했는가? | Phase 3 완료, 규칙 34개 확인, 상태별 화면 미리보기 확인 |
