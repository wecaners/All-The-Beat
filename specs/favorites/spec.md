# Feature Specification: 찜

## Overview

로그인한 수강생이 클래스 상세에서 찜하고 마이에서 모아 보며, 찜한 클래스의 마감·취소를 바로 안다(F-22).

## User Scenarios & Testing (mandatory)

### User Story 1: 찜하고 빼기

- As: 수강생은
- I: 클래스를 찜하고 뺄 수 있다
- So: 고민 중인 클래스를 모아 두기 위해

#### Acceptance Scenarios

Scenario 1: **찜**

- Given: 로그인·동의한 수강생이 공개 클래스 상세에서
- When: 찜 버튼을 누르면
- Then: 찜됐다는 안내를 받고 버튼이 켜진 모양이 된다. 다시 열어도 켜져 있다

Scenario 2: **빼기**

- Given: 찜한 클래스에서
- When: 찜 버튼을 다시 누르면
- Then: 바로 빠지고 버튼이 꺼진다(묻지 않는다)

Scenario 3: **두 번 찜**

- Given: 이미 찜한 클래스에
- When: 서버에 찜을 다시 요청하면
- Then: 한 건 그대로다

Scenario 4: **비로그인**

- Given: 로그인하지 않은 사람이
- When: 찜 버튼을 누르면
- Then: 로그인 시트가 열리고, 로그인한 뒤 같은 클래스로 돌아와 자동으로 찜된다

Scenario 5: **동의 전**

- Given: 약관 동의 전 사용자가
- When: 찜하면
- Then: 저장되지 않고 동의 화면으로 간다. 동의 뒤 돌아오면 찜된다

Scenario 6: **공개 아닌 클래스**

- Given: 숨긴 클래스 id로
- When: 서버에 찜을 요청하면
- Then: 저장되지 않는다

### User Story 2: 찜 목록

#### Acceptance Scenarios

Scenario 7: **마이 목록·순서·표시**

- Given: 찜한 클래스가 다가오는 모집중 1, 마감 1, 끝난 1, 취소 1, 숨겨진 1개일 때
- When: 마이를 열면
- Then: 다가오는 둘이 날짜 순으로 먼저(마감에는 마감 표시), 끝난·취소가 뒤에(각각 표시), 숨겨진 것은 없다. 누르면 클래스 상세로 간다

Scenario 8: **없을 때**

- Given: 찜이 없으면
- When: 마이를 열면
- Then: 아직 찜한 클래스가 없다고 보인다

## Functional Requirements (mandatory)

- FR-1: MUST 클래스 상세에 찜 토글이 있고, 로그인 사용자의 찜 여부를 보여준다
- FR-2: MUST 찜은 사용자 × 클래스 1건이다. 다시 찜해도 늘지 않고, 빼면 지워진다
- FR-3: MUST 서버는 로그인·약관 동의·클래스 공개 여부를 다시 확인한다
- FR-4: MUST 비로그인은 로그인 시트 → 복귀 → 자동 찜, 동의 전은 동의 화면 → 복귀 → 찜
- FR-5: MUST 마이에 찜 목록: 다가오는 것 날짜 순 → 지난·취소 최근 순. 마감·끝남·취소 표시. 공개 아닌 것 제외
- FR-6: MUST 찜 수는 보여주지 않는다

## Constraints (mandatory)

- CON-1: MUST 새 테이블 하나(`favorites`). RLS 켬, 정책 없음
- CON-2: MUST design.md: 기호로 상태 표시 안 함, 아이콘 버튼 `aria-label`, 토글에 큰 움직임 없음
- CON-3: MUST 곡·강사 찜, 찜 수, 알림은 이번에 없다

## Success Criteria (mandatory)

- SC-1: 되돌리는 트랜잭션 테스트에서 시나리오 1~3, 6, 7의 데이터가 기대와 같다
- SC-2: 마이그레이션 뒤 `pnpm db:generate`가 "No schema changes", `pnpm check` 통과

## 서버 액션 목록

| 이름 | 입력 | 결과 | 권한 |
| --- | --- | --- | --- |
| `setFavoriteAction` | 클래스 id, 켬/끔 | `{ ok, error?, consentRequired? }` | 로그인·동의 |
