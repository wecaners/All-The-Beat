# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-10: 내 추가요 목록(대기중/열렸어요), 강사 신청·내 클래스, 로그아웃·회원 탈퇴·약관 보기
- F-24: 앵콜 오픈 알림은 F-20 전까지 마이 "내 앵콜"에서 확인
- U-09 (`/me`, 로그인 필요, 비로그인이면 로그인 유도). 와이어프레임 U-09a·U-09b: 비로그인은 할 수 있는 것을 먼저 말하고 카카오로 시작, 로그인은 내 추가요/내 앵콜, 열렸어요류는 위로, 항목을 누르면 곡 상세·원 클래스 상세, 수정·취소는 그 화면에서(마이는 보기만), 닉네임 수정 없음

## Research Findings

### 코드베이스 구조

- 로그인 사용자는 `getCurrentUser()`(서명 검증 클레임). 카카오 로그인은 `startKakaoLogin(nextPath)`, 돌아오는 주소는 `safeNextPath`로 상대 경로만
- 로그아웃하는 곳이 없다. 서버 Supabase 클라이언트(`src/lib/supabase/server.ts`)는 서버 액션에서 쿠키를 쓸 수 있다
- 추가요: 사용자 × 곡 1건, 상태 `waiting`·`opened`·`canceled`, 열린 클래스는 `fulfilled_class_id`. 곡 상세의 기다리는 수는 최근 90일·취소 제외
- 앵콜: `src/server/encores`의 `effectiveEncoreStatus`(만료 계산), `activeEncoreCount`, `encoreThreshold`를 그대로 쓸 수 있다
- 홈 머리에는 로고와 "Home" 라벨뿐이다. 하단 탭바는 없다

### 기존 패턴

- 요청마다 다른 데이터는 `<Suspense>` 안에서 `await connection()` 뒤에 읽는다
- 공개 조건 `publiclyVisible`. 공개가 아닌 클래스로 가는 링크는 404가 된다
- 곡 한 줄 `SongRow`, 클래스 티켓 `ClassTicket`, 상태 표시는 고무 도장·스티커 라벨(체크 기호 금지)

## Resources

### 문서

- F-10: `docs/03-기능명세서.md:282`, F-09: `docs/03-기능명세서.md:273`
- U-09: `docs/04-IA.md:167`
- 와이어프레임: `wireframes/index.html:1275`(U-09a), `wireframes/index.html:1324`(U-09b)

### 코드 참조

- 추가요: `app/src/server/requests/index.ts`
- 앵콜: `app/src/server/encores/index.ts`
- 로그인: `app/src/lib/auth/current-user.ts`, `app/src/lib/auth/kakao-login.ts`

### API 엔드포인트

- 페이지 `GET /me`
- 서버 액션(로그인 사용자): 로그아웃

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 마이에서는 보기만 하고 수정·취소는 곡·클래스 상세에서 | 와이어프레임 U-09b. 같은 일을 두 곳에서 하면 시트·규칙이 둘이 된다 |
| 추가요가 열렸으면 열린 클래스로, 그 클래스가 공개가 아니면 곡 상세로 | 가장 궁금한 것이 열린 클래스다. 비공개 클래스 링크는 404 |
| 앵콜은 원 클래스가 공개일 때만 목록에 둔다 | 숨긴 클래스로 가는 항목은 열 수 없다 |
| 앵콜 상태는 앵콜 서버의 같은 계산(만료·인원·기준)을 쓴다 | 클래스 상세와 마이의 상태가 다르면 혼란 |
| 기다리는 수는 곡 상세와 같은 최근 90일·취소 제외 | 같은 곡의 숫자가 화면마다 다르면 혼란 |
| 마이 입구는 홈 머리의 오른쪽 | 탭바가 없다. 홈이 모든 화면의 출발점(로고)이다 |
| 회원 탈퇴는 이번에 하지 않는다 | 로그인 계정 삭제에 서버 전용 관리자 키와 카카오 연결 끊기가 필요하고, 남길 기록 범위를 정해야 한다(사용자 결정 필요) |

## Issues Encountered

### 1. 회원 탈퇴

**문제**:

F-09·F-10은 마이에서 탈퇴를 요구하고, 출시 전에 있어야 한다.

**원인**:

Supabase 로그인 계정 삭제는 서버 전용 관리자 키(`sb_secret_`)가 필요한데 지금 환경변수에 없다. 카카오 연결 끊기, 추가요·앵콜·클릭 기록 처리 범위도 정해지지 않았다.

**해결**:

이번 범위에서 빼고 출시 전에 따로 한다.

**결과**:

보류 (사용자 결정 필요)

## Learnings
