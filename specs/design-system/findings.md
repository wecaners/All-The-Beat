# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- `design/README.md`의 확정 결정: 덕질 스크랩북 컨셉, 인터랙션 채택, 3D 미사용
- 03 명세 F-04(곡 상세), F-07(추가요), MVP 원칙 6

## Research Findings

### 코드베이스 구조

- `app/src/app/globals.css`는 create-next-app 기본값(Geist, 다크 모드 변수)이다
- 공용 UI 폴더 `src/components/`는 아직 없다. 곡 상세의 칩·시트는 `request-panel.tsx` 안에 있다
- `saveRequest`는 반환값이 없고, 클라이언트는 성공 여부만 안다

### 기존 패턴

- 클라이언트 폼은 `useActionState`, 서버 액션 뒤 `refresh()`
- 곡 상세는 곡 정보 캐시(`"use cache"`), 요청별 데이터는 `connection()` 뒤

## Resources

### 문서

- 시안: `design/concepts/round-2.html`(모양), `round-3.html`(움직임)
- next/font 가이드: `app/node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
- Pretendard: <https://github.com/orioncactus/pretendard> (OFL)
- 메이플스토리 서체 약관 요약: <https://www.sandollcloud.com/free-font/16195/Maplestory-OTF> (넥슨, 원문은 넥슨 브랜드 사이트)

### 코드 참조

- 추가요 저장: `app/src/server/requests/index.ts`
- 곡 상세: `app/src/app/song/[slug]/page.tsx`, `request-panel.tsx`

### API 엔드포인트

- 서버 액션 `saveRequestAction` 반환값에 `isNew`, `position` 추가

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| Bagel Fat One·Bricolage는 `next/font/google`, `preload: false` | `next/font`의 Google 데이터에 한글 서브셋이 없어 미리 불러오기 대상이 없다. 자체 호스팅되고, 쓰는 글자 범위만 받는다 (Bagel은 아래 메이플스토리로 교체) |
| Pretendard는 npm 패키지의 동적 분할 CSS를 `globals.css`에서 import | 한글 전체 폰트(수 MB)를 피하고 쓰인 글자 묶음만 받는다. 외부 CDN 없이 자체 호스팅 |
| 다크 모드 변수 제거, 밝은 화면만 | 스크랩북 컨셉은 크림 속지가 정체성. 기존 화면의 `dark:` 클래스는 남겨도 무해 |
| 영상은 썸네일 → 누르면 iframe | YouTube 플레이어는 무겁다. 첫 화면 속도(홈 3초 기준)와 인앱 브라우저를 위해 누를 때만 부른다 |
| 움직임은 Web Animations API + CSS, 라이브러리 없음 | framer-motion 등은 번들이 커진다. 시안 3차가 같은 방식으로 충분히 동작했다 |
| 완료 순번은 서버가 계산 | "N번째"는 시스템이 보장할 수 있는 숫자여야 한다(원칙 6). 클라이언트 추정 금지 |
| 디스플레이 폰트를 메이플스토리 Bold 하나로 (로고 포함) | 사용자 판단: Bagel은 한글 가독성이 떨어지고 오래 보면 피로하다. 후보 12종 비교(`design/concepts/font-compare.html`) 뒤 선택. 굵은 디스플레이 폰트 두 개를 섞으면 위계가 흐려져 하나로 통일 |
| 메이플스토리는 원본 woff(약 410KB)를 `next/font/local`로 통째로 서빙 — FR-2(쓰인 글자만 받기)의 예외 | 넥슨 약관이 폰트 파일 수정·재배포를 금한다. 서브셋·woff2 변환도 수정이라 하지 않는다. `display: swap`이라 받기 전엔 Pretendard로 먼저 보인다. 약관: 웹 임베딩·BI 사용 가능, 저작권 표기 필요 (산돌구름 요약) |
| 인터랙션은 규칙만이 아니라 "붙는 곳" 표로 `design.md`에 둔다 | 규칙만 있을 때 화면을 만들며 티켓 찢기 등이 빠졌다. 새 화면을 만들 때 표에서 확인한다 |
| 티켓 찢기는 `ClassTicket` 안에 둔다. 새 탭 클릭(⌘·Ctrl·Shift·가운데)은 브라우저에 맡기고, 동작 줄이기면 바로 이동, 연속 클릭은 한 번만 | 링크 기본 동작과 접근성을 해치지 않고 모든 티켓에 같은 손맛 |
| 찢긴 모양은 화면을 떠날 때(effect 정리) 애니메이션을 취소해 되돌린다 | Next 16은 뒤로 가기 때 화면 상태를 보존한다. 되돌리지 않으면 돌아왔을 때 날짜 조각이 없다 |
| 포토카드 기울기는 li의 `rotate`·`translate` 속성만 바꾼다(스크롤 이벤트 passive + 프레임당 한 번) | 카드 자체 기울기(`transform`)와 등장 애니메이션을 덮지 않고, 스크롤을 막지 않는다 |
| 당겨서 새로고침·흐르는 글자 띠는 보류 | 기본 당겨서 새로고침과 충돌 / 계속 움직이는 글자(WCAG 2.2.2) |

## Issues Encountered

### 1. 순번의 기준

**문제**:

"몇 번째로 기다리는 중"의 순번을 무엇으로 셀지.

**원인**:

곡 상세의 기다리는 수는 최근 90일 기준이다.

**해결**:

같은 기준(최근 90일, 취소 제외)에서 내 `created_at` 이하인 요청 수로 센다. 첫 추가요는 가장 최근이므로 사실상 총수와 같다.

**결과**:

결정

### 2. 첫 추가요인데 완료 순간이 안 떴다

**문제**:

사용자 테스트에서 취소 후 다시 추가요했는데 완료 순간 없이 숫자만 바뀌었다. 서버가 `isNew: true, position: 0`을 돌려줬다.

**원인**:

순번을 셀 때 저장한 행의 `created_at`을 JS `Date`로 받아 비교했다. DB는 마이크로초, `Date`는 밀리초라 값이 잘려 내 요청 자신이 "이하" 조건에서 빠졌다.

**해결**:

내 생성 시각을 DB 안의 서브쿼리로 비교한다 (`app/src/server/requests/index.ts`). 같은 데이터로 기존 방식 0, 수정 후 1 확인.

**결과**:

해결

## Learnings

### 컨셉은 토큰 이름에 남긴다 (2026-10-28)

색을 `pink-500` 같은 일반 이름이 아니라 `paper`, `ink`, `pink`(추가요), `lime`(형광펜) 같은 역할 이름으로 둔다. 다음 화면을 만드는 사람이 "이 색은 어디에 쓰는가"를 토큰 이름에서 바로 알 수 있다.

### 시간은 앱으로 꺼내지 말고 DB 안에서 비교한다 (2026-10-28)

Postgres `timestamptz`는 마이크로초, JS `Date`는 밀리초다. 저장한 시각을 앱으로 가져와 다시 조건에 넣으면 같은 행도 어긋난다. 시각 비교는 DB 안(서브쿼리, `now()`)에서 끝낸다.

### 키치해도 마감은 정교해야 한다 (2026-10-28)

사용자 피드백: 도는 별 스티커, 체크 기호, 밑줄 링크가 "완성도가 떨어진다". CSS로 자른 별은 테두리가 계단처럼 깨지고, 계속 도는 글자는 읽히지 않고, 기호·밑줄은 스티커 말투에서 벗어난다. 귀여운 컨셉일수록 가장자리·움직임·말투가 정확해야 싸 보이지 않는다. 별은 SVG 다이컷 스티커로, 회전은 살랑임으로, 상태는 고무 도장과 내가 고른 내용으로, 보조 행동도 스티커 버튼으로 바꿨다.

### 결정은 "어디에 붙는가"까지 적어야 지켜진다 (2026-10-28)

round-3에서 인터랙션 9가지를 채택했지만 `design.md`에는 "언제 크게 움직이는가" 규칙만 남았다. 화면을 만들 때는 부품 표를 따라가서, 부품에 묶이지 않은 움직임(티켓 찢기, 착착 붙기)이 빠졌다. 결정은 그 결정을 지켜야 하는 자리(부품·화면)와 함께 적어야 다음 작업에서 살아남는다.

