# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-21: `/teacher/{handle}` — 활동명, 소개, 인스타 링크, 다가오는 클래스, 지난 클래스(곡 목록)
- 04 IA: 강사 프로필은 F-21(Should). 상세 화면이라 탭바를 두지 않는다
- 와이어프레임 U-05: "강사 카드 → 인스타 프로필로 나감. 강사 프로필 페이지(F-21)는 Should"
- specs/instructor-studio: 대리 등록 강사의 사진·영상·소개는 게재 동의(`media_consent`)가 있을 때만

## Research Findings

### 코드베이스 구조

- `publiclyVisible`(`src/server/classes`): 숨김 아님 + 승인된 강사 + (직접 강사 또는 게재 동의). 강사 단위 공개 조건은 이 중 강사 두 조건이다
- `getPublicClass`가 강사 사진(`mediaUrl`)·소개·포트폴리오를 `showMedia = !isProxy || mediaConsent`로 거른다. 같은 규칙을 강사 프로필에 쓴다
- 강사 권역은 `instructor_regions` ⋈ `regions`(`sortOrder`)
- 클래스 티켓 `ClassTicket`(href·title·startsAt·meta·detail·thumbnail·badge), 곡 한 줄 `SongRow`(slug·title·artist·videoId·meta)
- 클래스 상세 페이지는 `connection()` 뒤에 읽고(종료 여부가 시각에 달림), `generateMetadata`로 제목·설명·OG를 만든다
- 한글이 섞일 수 있는 경로 값은 `decodeURIComponent`로 읽는다(곡 상세 `readSlug`). 인스타 아이디는 영문 소문자·숫자·`.`·`_`라 대문자만 소문자로 맞추면 된다(`normalizeInstagramHandle`)
- 탈퇴한 강사는 `status = suspended`(specs/account-withdrawal), 가져온 강사는 `is_proxy = false`(specs/instructor-claim)

### 기존 패턴

- 공개 화면은 데이터만 받아 그리는 View 컴포넌트 + 서버 컴포넌트(`ClassView`, `HomeView`)
- 상세 화면 머리: 로고(홈), 탭바 없음

## Resources

### 문서

- F-21: `docs/03-기능명세서.md` "F-21"
- IA: `docs/04-IA.md:99`

### 코드 참조

- 공개 조건·클래스 상세: `app/src/server/classes/index.ts:23`, `:123`
- 클래스 상세 강사 섹션: `app/src/app/class/[id]/class-view.tsx:149`
- 강사 권역 읽기: `app/src/server/instructors/index.ts` `getMyInstructor`

### API 엔드포인트

- 페이지: `GET /teacher/{handle}` (공개)
- 서버 액션: 없음

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 주소의 핸들은 디코드 후 소문자로 맞춰 찾는다. 다른 모양(대문자·@)으로 와도 같은 강사 | 인스타 아이디는 대소문자를 구분하지 않고, 저장은 소문자다 |
| 강사 공개 조건 = 승인 + (직접 강사 또는 게재 동의). 아니면 없는 페이지 | 클래스 공개 조건과 같은 기준. 정지·탈퇴·동의 전 강사를 드러내지 않는다 |
| 사진·소개·영상은 `getPublicClass`와 같은 `showMedia` 규칙 | 클래스 상세와 프로필이 다른 것을 보여주지 않게 |
| 다가오는 클래스 = 시작 전 + 숨김 아님 + 모집중·마감 임박·마감. 마감은 배지로 | 마감된 클래스로 가서 앵콜할 수 있게(F-24) |
| 지난 클래스는 곡 목록: 종료됐거나(상태 ended 또는 종료 시각 지남) 시작한 클래스의 곡을 중복 없이, 최근에 가르친 순, 가르친 횟수와 함께. 숨김·취소 제외 | F-21 "지난 클래스(곡 목록)". 곡이 주인공(MVP 원칙 1) |
| 요청마다 읽는다(`connection()`) | 클래스 상태·시작 여부가 시각에 달려 있다. 클래스 상세와 같다 |
| 클래스 상세 강사 카드에 "강사 프로필 보기"(lime)를 더하고 인스타 버튼은 그대로 | 올빗 안에서 다른 클래스로 이어지게. 기존 동선은 유지 |

## Issues Encountered

(없음)

## Learnings

### 강사 공개는 클래스 공개 조건에서 나온다 (2026-11-03)

강사 프로필을 따로 공개할지 정하는 칸은 없지만, 클래스 공개 조건(`publiclyVisible`)의 강사 쪽 두 조건이 곧 "이 강사를 수강생에게 보여도 되는가"다. 같은 조건을 쓰면 정지·탈퇴·동의 전 강사가 클래스 상세에선 숨는데 프로필에선 보이는 어긋남이 생기지 않는다.
