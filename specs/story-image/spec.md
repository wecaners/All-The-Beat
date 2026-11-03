# Feature Specification: 인스타 스토리 공유 이미지

## Overview

누구나 클래스 상세에서 9:16 스토리 이미지를 받아 인스타 스토리에 올리고 링크 스티커로 올빗 주소를 건다(F-23).

## User Scenarios & Testing (mandatory)

### User Story 1: 강사가 스토리 이미지를 올린다

- As: 강사(또는 공유하려는 누구나)는
- I: 클래스 상세에서 스토리용 이미지를 받을 수 있다
- So: 스토리에 올리고 링크 스티커로 올빗 주소를 걸기 위해

#### Acceptance Scenarios

Scenario 1: **이미지 내용**

- Given: 공개 클래스에서
- When: 스토리용 이미지를 만들면
- Then: 1080×1920 PNG에 곡명·아티스트, 클래스 이름, 날짜·시간, 권역, 가격·난이도, 강사 이름, 올빗 로고, 클래스 주소와 "링크 스티커에 붙여 주세요" 안내가 들어 있다

Scenario 2: **휴대폰 공유**

- Given: 파일 공유를 지원하는 휴대폰에서
- When: 버튼을 누르면
- Then: 공유 창이 열려 인스타 스토리로 보낼 수 있다

Scenario 3: **공유 미지원**

- Given: 파일 공유를 지원하지 않는 브라우저에서
- When: 버튼을 누르면
- Then: 이미지가 새 탭에 열린다

Scenario 4: **공개 아닌 클래스**

- Given: 숨김·비공개·없는 클래스 id로
- When: 이미지 주소를 열면
- Then: 없는 것으로 답한다

Scenario 5: **지금 정보**

- Given: 클래스 일시가 바뀐 뒤
- When: 이미지를 다시 만들면
- Then: 바뀐 일시가 들어 있다

## Functional Requirements (mandatory)

- FR-1: MUST `/class/{id}/story`가 공개 클래스의 9:16(1080×1920) PNG를 그때그때 만든다. 공개 아니면 404
- FR-2: MUST 이미지에 곡명·아티스트, 클래스 이름, 날짜·시간(KST), 권역, 가격·난이도, 강사 이름, 올빗 로고, 클래스 주소와 링크 스티커 안내가 들어간다
- FR-3: MUST 클래스 상세에 버튼이 있고, 파일 공유가 되면 공유 창을, 아니면 새 탭을 연다
- FR-4: MUST 이미지에 영상 썸네일·사진을 넣지 않는다

## Constraints (mandatory)

- CON-1: MUST 메이플스토리 서체 파일을 수정·변환하지 않고 그대로 읽는다
- CON-2: MUST 스키마·환경변수를 바꾸지 않는다
- CON-3: MUST 링크 복사, 다른 공유 수단, 편집은 이번에 없다

## Success Criteria (mandatory)

- SC-1: 공개 클래스 주소가 `image/png` 1080×1920을 돌려주고, 없는·숨긴 클래스는 404다
- SC-2: 만든 이미지를 눈으로 봐서 글자가 모두 보이고 잘리지 않는다
- SC-3: `pnpm check`가 통과한다

## 서버 액션 목록

없음. 이미지는 `GET /class/{id}/story` Route Handler가 만든다.
