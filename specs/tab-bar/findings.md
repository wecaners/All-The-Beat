# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- 04 IA 1절: 탭 홈(U-01)·찾기(U-02→U-03, 누르면 검색창에 바로 포커스)·추가요(U-06)·마이(U-09, 비로그인이면 로그인 유도). 보이는 화면 U-01·U-03·U-06·U-09, 숨는 화면 상세·입력·검색 입력 중·운영
- design.md 인터랙션 표 "탭바 알약": 하단 탭바를 만들 때. round-3: 라임 알약이 통통 튀며 따라가고 아이콘이 뛴다
- F-01·F-10 구현 메모: 탭바가 생기면 더보기·마이 입구를 정리한다

## Research Findings

### 코드베이스 구조

- 네 화면(`/`, `/classes`, `/requests`, `/me`)은 모두 `<main className="mx-auto w-full max-w-md pb-16">`로 시작한다. 탭바 높이만큼 아래 여백을 늘리면 된다
- 홈 머리에 임시 "마이" 버튼이 있다(`app/src/app/page.tsx`, specs/my-page). 탭바가 대신한다
- 검색 칸은 이미 `autoFocus`라 `/search`로 가면 커서가 들어간다
- 클래스 상세는 아래에 고정 막대(예약·앵콜)가 있지만 탭바가 없는 화면이라 겹치지 않는다
- `motion.ts`: `play`(동작 줄이기면 1ms), `SPRING`. `globals.css`에 `--ease-spring`. Tailwind v4라 `motion-safe:` 변형으로 전환 효과를 끌 수 있다
- round-3 시안: 탭바는 양옆 14px·아래 22px 띄운 흰 알약 카드(높이 66, 반지름 24, 2px 테두리, 스티커 그림자), 라임 알약(42×30, 반지름 11)이 `left`를 스프링으로 옮기고, 켜진 아이콘이 `hop`(40%에서 위로 6px·1.15배) 한다. 아이콘은 집·돋보기·별·사람 SVG

### 기존 패턴

- 클라이언트 부품은 `src/components/`에 두고 design.md 표에 적는다
- 현재 경로는 `usePathname()`으로 읽는다(검색 칸의 `useSyncExternalStore`와 달리 경로만 필요)

## Resources

### 문서

- 탭바: `docs/04-IA.md:17`, 숨는 화면: `docs/04-IA.md:27`
- 인터랙션 표: `_agent/rules/design.md` "탭바 알약"
- 시안: `design/concepts/round-3.html:136`(스타일), `design/concepts/round-3.html:287`(아이콘), `design/concepts/round-3.html:417`(움직임)

### 코드 참조

- 홈 머리: `app/src/app/page.tsx:14`
- 움직임 도구: `app/src/components/motion.ts`

### API 엔드포인트

- 없음 (화면 부품만)

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 탭바는 루트 레이아웃이 아니라 보이는 네 화면이 각자 붙인다 | IA가 화면별로 보임·숨김을 정했다. 레이아웃에서 경로를 맞추는 것보다 화면이 스스로 드는 쪽이 명확하고, 숨는 화면에 조건이 안 생긴다 |
| 켜진 탭은 경로로 정한다: `/`→홈, `/search`·`/classes`→찾기, `/requests`→추가요, `/me`→마이 | IA의 찾기 탭은 검색→목록이다. `/search`에는 탭바가 없지만 켜짐 규칙은 같은 부품이 들고 있다 |
| 탭을 누르면 먼저 알약을 옮기고 아이콘을 뛰게 한 뒤 링크 이동은 `Link`에 맡긴다 | 서버 화면 사이의 이동이라 다음 화면에서 부품이 새로 그려진다. 누른 순간의 반응(0.45초)이 이동을 기다리게 하지 않는다(design.md) |
| 알약 위치는 `left: calc((n·2+1)·12.5% − 21px)`, 이동은 `motion-safe:transition` | 네 칸 그리드의 가운데. 동작 줄이기면 전환 없이 바로 |
| 탭바는 `fixed` + `max-w-md` 가운데, 아래는 `env(safe-area-inset-bottom)`을 더한다. 네 화면의 `main`은 `pb-32` | 홈 바 있는 기기에서 가려지지 않게. 내용 끝이 탭바에 가려지지 않게 |
| 진동(buzz)은 넣지 않는다 | design.md: 진동은 감정 순간에만. 시안의 buzz(6)은 빼고 알약·아이콘 움직임만 |
| 홈 머리의 "마이" 버튼을 없앤다 | 탭바가 대신한다(specs/my-page에서 임시로 둔 것) |

## Issues Encountered

(없음)

## Learnings

(없음)
