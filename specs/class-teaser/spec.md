# Feature Specification: 강사 티저 영상

## Overview

클래스 등록·수정에 YouTube 티저 영상 링크를 선택으로 넣고, 있으면 클래스 상세 맨 위에 그 영상을 보여준다(F-25).

## User Scenarios & Testing (mandatory)

### User Story 1: 강사가 티저를 붙인다

- As: 강사(또는 대신 등록하는 운영자)는
- I: 클래스에 내 수업 영상 링크를 붙일 수 있다
- So: 수강생이 내가 어떻게 가르치는지 보고 예약하게 하기 위해

#### Acceptance Scenarios

Scenario 1: **등록 때 넣기**

- Given: 클래스 등록 폼에서
- When: 퍼갈 수 있는 YouTube 영상(일반 또는 쇼츠) 링크를 티저에 넣고 등록하면
- Then: 클래스가 저장되고 그 영상이 티저로 남는다

Scenario 2: **비워도 된다**

- Given: 클래스 등록 폼에서
- When: 티저를 비우고 등록하면
- Then: 지금처럼 저장되고 티저는 없다

Scenario 3: **거절되는 링크**

- Given: 클래스 등록·수정 폼에서
- When: YouTube가 아닌 주소, 없는·비공개 영상, 퍼가기가 막힌 영상 링크를 넣으면
- Then: 저장되지 않고 각각의 이유를 알려준다

Scenario 4: **수정으로 바꾸고 빼기**

- Given: 티저가 있는 내 클래스의 수정 폼에서
- When: 링크가 기존 영상 주소로 채워져 있고, 다른 링크로 바꾸거나 비우고 저장하면
- Then: 티저가 바뀌거나 빠진다

Scenario 5: **복사·앵콜 클래스**

- Given: 티저가 있는 클래스를
- When: 복사하거나 앵콜 클래스를 만들면
- Then: 폼에 원래 티저 링크가 채워져 있다

### User Story 2: 수강생이 티저를 본다

#### Acceptance Scenarios

Scenario 6: **맨 위에 티저**

- Given: 티저가 있는 공개 클래스를
- When: 열면
- Then: 맨 위에 티저 영상이 썸네일로 보이고 누르면 재생된다. 출처(YouTube)와 강사 이름이 표시된다. 대표 곡 영상은 맨 위에 없다

Scenario 7: **티저 없음**

- Given: 티저가 없는 클래스를
- When: 열면
- Then: 지금처럼 대표 곡 영상이 맨 위에 보인다

Scenario 8: **운영 화면**

- Given: 운영 클래스 상세에서
- When: 티저가 있는 클래스를 보면
- Then: 티저 영상 링크가 보인다

## Functional Requirements (mandatory)

- FR-1: MUST 클래스 등록·수정 입력에 선택 항목 `teaserUrl`이 있다. 비면 티저 없음이다
- FR-2: MUST 저장 전에 링크에서 YouTube 영상 ID를 뽑고 퍼가기 가능 여부를 확인한다. YouTube 아님·없음·막힘은 각각의 문구로 거절한다
- FR-3: MUST 저장은 영상 ID로 한다. 수정에서 비우면 null이 된다
- FR-4: MUST 수정·복사·앵콜 폼 초기값에 기존 티저가 링크로 채워진다
- FR-5: MUST 클래스 상세는 티저가 있으면 맨 위에 티저를, 없으면 대표 곡 영상을 보여준다. 티저는 누를 때만 플레이어를 부른다
- FR-6: MUST 운영 클래스 상세에 티저 링크가 보인다

## Constraints (mandatory)

- CON-1: MUST 스키마를 바꾸지 않는다(`teaser_video_id`가 이미 있다)
- CON-2: MUST 영상 정보 30일 갱신, 인스타 릴스, 영상 여러 개는 이번에 없다
- CON-3: MUST 영상은 YouTube 공식 임베드로 출처를 표시한다(product.md)

## Success Criteria (mandatory)

- SC-1: 되돌리는 트랜잭션 테스트에서 시나리오 1~5의 저장 결과가 기대와 같다
- SC-2: `pnpm check`가 통과하고 개발 서버 로그에 prerender 경고가 없다

## 서버 액션 목록

새 액션 없음. 기존 `createClassAction`(운영자), `createMyClassAction`·`updateMyClassAction`(강사)이 `teaserUrl`을 받는다.
