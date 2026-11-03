# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-18: 기획서 6절 성공 지표를 한 화면에서. 등록된 클래스 수(누적/이번 주, 대리 vs 직접), 자발적 등록 강사 수, 예약 링크 클릭(누적/클래스별), 요청 → 개설 전환, 재방문(가입 후 2주 안에 다른 날 다시 접속), 추가요 수(누적/곡별), 앵콜 → 개설 전환. MVP는 표, 차트는 나중
- 기획서 6절 목표(8주): 클래스 누적 30, 자발적 강사 3, 예약 클릭 누적 50, 요청 → 개설 1곡, 재방문 10명
- 04 IA: A-06 지표 대시보드가 운영 첫 화면. 거기서 강사 승인·대리 등록·곡 관리·클래스 관리·앵콜 목록으로 간다

## Research Findings

### 코드베이스 구조

- 예약 클릭: `events(type='booking_click')`만 실제로 쌓인다(`/go/{id}`, 10분 중복 제거). `song_view`·`class_view`·`search`는 enum에만 있고 기록하는 곳이 없다
- 클래스별 클릭 수 식은 운영 클래스 목록(`admin/classes.ts`의 `bookingClicksSql`)과 강사 내 클래스에 이미 있다
- 대리 vs 직접: `classes.createdByAdmin`(운영자 등록이면 true). 강사 직접 등록은 `createClass(input, { createdByAdmin: false })`
- `classes.fromRequest`(요청→개설 지표용)는 스키마에만 있고 어디서도 true로 바꾸지 않는다. 와이어프레임 T-0x의 "추가요에서 ✓" 체크는 구현되지 않았다
- 요청 → 개설: 클래스가 공개될 때 `openRequestsForClass`가 그 곡의 대기 중 추가요를 `opened`로 바꾸고 `fulfilledClassId`를 남긴다. 추가요를 나중에 취소해도 `fulfilledClassId`는 남는다. 다시 추가요하면 상태만 `waiting`으로 바뀌고 `createdAt`이 새로 찍힌다(취소였을 때)
- 추가요: `requests.status`(`waiting`·`opened`·`canceled`). 사용자 × 곡 1건
- 앵콜 → 개설: `encore_rounds.reachedAt`(기준 인원 도달 시각), `status='opened'`·`encoreClassId`(앵콜 클래스가 열림). 기준은 생성 때 고정
- 가입: `profiles.createdAt`. 탈퇴는 `deletedAt`(탈퇴 기능은 아직 없다). 운영자는 `role='admin'`
- 재방문: 접속 기록이 없다. `proxy.ts` → `updateSession`이 모든 요청에서 `getClaims()`로 로그인 여부를 이미 확인한다. Next 16 Proxy는 Node.js 런타임이 기본이라 DB 드라이버를 쓸 수 있다
- 운영 홈(`admin/page.tsx`)은 `requireAdmin()` 뒤 `<Suspense>` 안에서 할 일 목록을 그린다. 운영 화면은 zinc 색 단순 표(`admin/ui.tsx`의 `Section`·`Table`·`Td`)

### 기존 패턴

- 운영 화면: `requireAdmin()` → `src/server/admin/*`에서 읽기 → `Section`·`Table`로 표. 요청마다 다른 데이터는 `<Suspense>` 안
- KST 날짜: `todayKst()`(`admin/shared.ts`). 시각 비교는 DB 안에서 한다(handoff: `timestamptz`를 JS `Date`로 꺼냈다 넣으면 마이크로초가 잘림)
- 사용자 × 대상 1건 규칙은 유니크 제약 + upsert(`app.md`)

## Resources

### 문서

- F-18: `docs/03-기능명세서.md` "F-18. 운영자: 지표"
- 성공 기준: `docs/01-기획서_One-pager.md` 6절
- A-06: `docs/04-IA.md:126`
- events 테이블: `docs/09-ERD.md` 3.6절, 지표 집계 방침: `docs/08-시스템아키텍처.md:254`
- Proxy 런타임: `app/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` "Runtime"

### 코드 참조

- 운영 홈: `app/src/app/admin/page.tsx`
- 운영 표 부품: `app/src/app/admin/ui.tsx`
- 클릭 수 식: `app/src/server/admin/classes.ts:287`
- 예약 클릭 기록: `app/src/server/bookings/index.ts:55`
- 추가요 열림 처리: `app/src/server/admin/shared.ts:26` (`openRequestsForClass`)
- 추가요 다시 하기(createdAt 재설정): `app/src/server/requests/index.ts:97`
- 앵콜 라운드: `app/src/db/schema/activity.ts:64`
- 클래스 `createdByAdmin`·`fromRequest`: `app/src/db/schema/classes.ts:97`
- 세션 갱신: `app/src/lib/supabase/proxy.ts`, `app/src/proxy.ts`

### API 엔드포인트

- 페이지(운영자): `GET /admin` (지표 + 기존 할 일 목록)
- 서버 액션: 없음(읽기 전용)
- 접속 기록: 모든 요청의 Proxy에서(로그인 사용자, 하루 한 번)

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 지표는 운영 첫 화면(`/admin`) 맨 위에 두고 기존 할 일 목록은 아래에 그대로 | 04 IA A-06이 운영 첫 화면. 새 주소를 만들면 들어가는 곳이 하나 늘 뿐이다 |
| 숫자는 화면을 열 때마다 DB에서 센다. 캐시·집계 테이블 없음 | `docs/08` 방침("events → 바로 집계"). 데이터가 작고, 숫자를 두 곳에 두지 않는다(`app.md`) |
| 요청 → 개설은 `requests.fulfilledClassId`가 있는 곡으로 센다. `classes.fromRequest`는 쓰지 않는다 | 시스템이 실제로 남긴 기록이다. `fromRequest`는 아무도 채우지 않고, 강사 체크에 기대면 원칙 6(수동 협조)에 걸린다 |
| 등록된 클래스 수는 취소·숨김 제외, "이번 주"는 `createdAt` 기준 KST 월요일 0시부터 | 수강생에게 보이는 공급을 센다. 등록 활동은 일정이 아니라 올린 시각이다 |
| 자발적 등록 강사는 `createdByAdmin=false`인 클래스가 하나라도 있는 강사(상태 무관) | 기획서: 스스로 올린 사례가 "존재"하는가. 나중에 취소해도 올린 사실은 남는다 |
| 예약 클릭은 숨김·취소된 클래스 것도 센다 | 실제로 일어난 클릭이다 |
| 추가요 수는 취소 아닌 것(`waiting`·`opened`) | 곡 상세·랭킹과 같은 "살아 있는 추가요" |
| 앵콜 → 개설은 `reachedAt`이 있는 라운드 중 `status='opened'`인 비율 | 기준 인원을 넘었는지는 `reachedAt`이 이미 남긴다 |
| 재방문 기록은 새 테이블(사용자 × KST 날짜 = 1행, 유니크 + 아무것도 안 함). `events`에 넣지 않는다 | 하루 한 번이 제약으로 지켜진다. `events`는 `sessionId` 필수·익명 중복 제거용이라 맞지 않는다 |
| 기록은 Proxy에서 로그인 확인 직후, 그날 이미 남긴 브라우저는 쿠키로 건너뛴다. 실패해도 요청은 그대로 통과 | 페이지마다 코드를 넣지 않고 한 곳에서. 매 요청 DB 쓰기를 막는다. 지표 때문에 사용자 화면이 깨지면 안 된다 |
| 재방문 = 기록 시작일 이후 가입자 중, 가입한 KST 날짜 다음 날부터 14일 안에 접속 날짜가 있는 사람. 운영자·탈퇴자는 뺀다 | 기획서 정의("가입자 중 2주 안에 다시 온 사람"). 그 전 가입자는 기록이 없어 셀 수 없다 |

## Issues Encountered

### 1. 재방문 기록 시작 전 가입자

**문제**:

접속 기록이 없던 기간에 가입한 사람(현재 dev DB 사용자들)은 재방문 여부를 알 수 없다.

**원인**:

지금까지 접속을 기록하지 않았다.

**해결**:

기록 시작일 이후 가입자만 센다. 화면에 기록 시작일을 같이 보여준다.

**결과**:

README·spec에 반영. 사용자가 README 리뷰("다음")로 이 방향을 받아들였다

### 2. 운영 DB 분리 전이라 테스트 데이터가 지표에 섞인다

**문제**:

dev DB가 곧 운영 DB라 테스트 클래스·클릭·추가요가 숫자에 들어간다.

**원인**:

운영 DB 분리가 출시 전 할 일로 남아 있다(handoff 4절).

**해결**:

이번에는 걸러내지 않는다. 운영 DB 분리·테스트 데이터 정리 때 해결된다.

**결과**:

README "이번에 하지 않는 것"에 적음

## Learnings

### 스키마에 있는 지표 칸이 실제로 채워지는지 먼저 본다 (2026-11-03)

`classes.fromRequest`와 `event_type`의 조회·검색 값은 ERD 설계 때 지표용으로 만들었지만, 채우는 코드는 없다. 지표를 정의할 때는 칸 이름이 아니라 실제로 값을 쓰는 코드를 찾아야 한다. 대신 `requests.fulfilledClassId`처럼 다른 기능이 부수적으로 남긴 기록이 더 정확한 근거가 됐다.

### 지표용 쓰기는 Proxy 한 곳에, 쿠키로 하루 한 번 (2026-11-03)

재방문처럼 "모든 화면"에서 일어나는 일을 기록할 때 페이지마다 코드를 넣으면 빠지는 화면이 생긴다. Proxy는 이미 모든 요청에서 로그인을 확인하므로 그 결과(`getClaims`)를 돌려받아 한 곳에서 기록했다. 대신 Proxy는 RSC·프리페치 요청까지 받으므로 "{사용자}:{날짜}" 쿠키로 DB 쓰기를 하루 한 번으로 줄였고, 계정을 바꿔 로그인해도 값에 사용자가 들어 있어 새로 남는다. 기록 실패가 화면을 막지 않도록 예외는 Proxy에서 삼킨다.

### raw SQL 결과의 bigint는 문자열이다 (2026-11-03)

``db.execute(sql`...`)``로 받은 `bigint` 컬럼은 문자열로 온다. 쿼리 빌더의 `{ mode: "number" }` 컬럼은 숫자다. 테스트 픽스처를 raw SQL로 만들고 서버 함수 결과와 비교할 때는 id를 숫자로 바꿔 비교한다.

