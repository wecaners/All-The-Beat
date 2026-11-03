# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. `_agent/handoff.md`를 읽고 `docs/03` Must 중 남은 것(F-18, 회원 탈퇴)을 확인. 사용자가 F-18을 골랐다
2. 기획서 6절·F-18·04 IA A-06을 읽고 README 작성. 사용자 리뷰("다음")
3. 지표마다 실제로 값을 쓰는 코드를 조사해 findings 작성: 예약 클릭만 기록됨, `fromRequest`는 채우는 곳 없음, 재방문 기록 없음
4. spec 작성 (시나리오 12개, FR-12, CON-7, SC-5). 이후 사용자 지시("리뷰 스킵")로 리뷰 생략

**생성/수정 파일**:

- `specs/admin-metrics/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan 작성 (지표 영역 고정 데이터 → 집계 → 접속 날짜 테이블 → Proxy 기록·재방문 → 마무리)
2. 마이그레이션 0002의 기본 권한 회수가 새 테이블에도 적용되는 것을 확인
3. tasks의 Phase 3·4 체크리스트 작성

**생성/수정 파일**:

- `specs/admin-metrics/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. Step 1: `AdminMetrics` 타입·목표(`METRIC_TARGETS`)와 고정 값, 지표 영역 `MetricsView`(지표 표 + 클릭 많은 클래스·추가요 많은 곡·전환된 곡), `/admin` 맨 위에 별도 `<Suspense>`로 붙임. 임시 페이지에서 모양 확인
2. Step 2: 6개 지표를 실제 질의로. "이번 주"는 DB 안에서 `date_trunc('week', now() at time zone 'Asia/Seoul')`
3. Step 3: `user_visits` 스키마 → `0007_user_visits` 생성·검토 → 사용자 확인 뒤 dev DB에 적용 → 다시 generate "No schema changes"
4. Step 4: `src/server/visits`(`recordVisit`, `visitDateKst`), `updateSession`이 로그인 사용자 id를 돌려주고 `proxy.ts`가 쿠키 `ab_visit`로 하루 한 번 기록(실패는 `console.error`만). 재방문 집계를 실제 질의로
5. Step 5: `docs/03` F-18 메모, `docs/09` 3.6·8절, `specs/README.md`, 스키마 index의 테이블 수 주석

**생성/수정 파일**:

- `app/src/server/admin/metrics.ts`, `app/src/app/admin/metrics.tsx`, `app/src/server/visits/index.ts`, `app/src/db/migrations/0007_user_visits.sql`, `app/src/db/migrations/meta/0007_snapshot.json` (새로 생성)
- `app/src/app/admin/page.tsx`, `app/src/db/schema/activity.ts`, `app/src/db/schema/index.ts`, `app/src/lib/supabase/proxy.ts`, `app/src/proxy.ts`, `app/src/db/migrations/meta/_journal.json` (수정)
- `docs/03-기능명세서.md`, `docs/09-ERD.md`, `specs/README.md` (수정)

### Phase 4: Testing 🔄

**작업 내역**:

1. 되돌리는 트랜잭션 안에서(관련 테이블을 먼저 비우고) 가짜 강사 3·클래스 6·클릭 4·사용자·추가요 6·앵콜 라운드 5·접속 날짜로 15개 확인. 끝난 뒤 테스트 아티스트·강사·접속 날짜 0
2. 임시 페이지(커밋 안 함, 삭제)에서 dev DB 값으로 지표 영역 확인: 클래스 15(대리 15), 클릭 3, 전환 1곡 도달, 추가요 1, 앵콜 아직 없음, 재방문 기록 없음
3. 비로그인 `/admin` → 404 화면, 개발 서버 로그에 prerender 경고 없음
4. `pnpm check`, `pnpm db:check`, `pnpm db:generate`

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 빈 상태 | 관련 테이블 비움 | 앵콜 0/0, 재방문 since null | 같음 | ✅ |
| 클래스 | 대리 2(이번 주 1)·직접 1·취소 2·숨김 1 | 3 / 대리 2 / 직접 1 / 이번 주 1 | 같음 | ✅ |
| 자발적 강사 | A 직접 2(하나 취소), B 직접 취소, C 대리만 | 2 | 2 | ✅ |
| 클릭 | 숨김 클래스 3(하나 지난달), 대리 1 | 누적 4, 이번 주 3, 숨김 → 대리 순 | 같음 | ✅ |
| 추가요 | 곡1 대기 3·열림 1, 곡2 취소 2(하나는 열렸던 것) | 4, 곡1 4건만 | 같음 | ✅ |
| 요청 → 개설 | 위와 같음 | 곡1, 곡2(취소돼도 남음) | 같음 | ✅ |
| 앵콜 | 도달 4(열림 1) + 미도달 1 | 1 / 4 | 같음 | ✅ |
| 접속 기록 | 같은 날 3번, 다음 날 1번, 프로필 없음, 잘못된 날짜 | 1 → 2, 0·오류 없음, 예외 | 같음 | ✅ |
| 재방문 | D 다음 날, E 같은 날만, F 20일 뒤, H KST 자정 넘어 가입·같은 날, I 14일째, 운영자·탈퇴자·기록 전 가입자 | since 1/5, 가입자 5, 재방문 2 | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 마이그레이션 전 임시 페이지가 `user_visits` 없음으로 실패 | 1 | 적용 뒤 정상 |
| 2026-11-03 | 테스트 비교 실패 3건(raw SQL이 bigint id를 문자열로 돌려줌) | 1 | 테스트 기대값을 `Number()`로. 서버 코드는 문제 없음 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 (사용자 확인만 남음) |
| 2. 다음에 할 일은? | 사용자가 운영자로 로그인해 실제 운영 첫 화면과 접속 기록 확인 → 커밋·PR (사용자 지시 시) |
| 3. 목표는? | 운영 첫 화면에서 성공 지표 7개를 목표와 함께 본다 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
