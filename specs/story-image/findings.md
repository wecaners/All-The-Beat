# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-23: 클래스 상세 [스토리용 이미지 만들기] → 9:16 이미지(곡명, 일시, 권역, 올빗 로고, 링크 스티커용 URL 안내). 목적: 강사가 스토리에 올빗 링크를 걸게
- 05 플로우: 강사 내 클래스에서 [스토리 공유 이미지 만들기](Should)
- design.md: 메이플스토리 서체는 파일을 수정(서브셋·변환)해 배포할 수 없다. 원본 woff를 그대로 쓴다

## Research Findings

### 코드베이스 구조

- Next 16 `ImageResponse`(`next/og`): JSX+CSS → PNG. 글꼴은 ttf·otf·woff만(woff2 불가). 번들 500KB 제한은 import한 자산에 해당하고, 문서 예시처럼 `readFile(join(process.cwd(), …))`로 실행 때 읽으면 된다
- 글꼴: `src/app/fonts/MaplestoryOTFBold.woff`(420KB, 한글 포함). Pretendard 패키지는 woff2뿐이라 쓸 수 없다. 영문 라벨 Bricolage는 구글 폰트로만 로드된다
- 공개 클래스 조회 `getPublicClass`(공개 아니면 null). `/go/[classId]/route.ts`가 Route Handler 패턴
- 공유: `celebration.tsx`가 `navigator.share` → 없으면 클립보드 폴백. 파일 공유는 `navigator.canShare({ files })`로 지원 여부를 본다
- 색 토큰 값: paper #fff7ec, card #fff, ink #161616, sub #6f655a, pink #ff6fb5, lime #cff23a, sky #7cc8ff, butter #ffe15c, lilac #c9b6ff

### 기존 패턴

- 화면 문구는 실제로 일어나는 것만(원칙 6). 공유 창이 안 열리면 새 탭으로

## Resources

### 문서

- F-23: `docs/03-기능명세서.md` "F-23", S4: `docs/01-기획서_One-pager.md:93`
- ImageResponse: `app/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`

### 코드 참조

- 공개 클래스: `app/src/server/classes/index.ts:123`, Route Handler: `app/src/app/go/[classId]/route.ts`
- 공유 폴백: `app/src/components/celebration.tsx:55`

### API 엔드포인트

- `GET /class/{id}/story` → `image/png` 1080×1920 (공개 클래스만, 아니면 404)
- 서버 액션: 없음

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| Route Handler `/class/{id}/story`에서 `ImageResponse`로 그때그때 만든다. 저장하지 않는다 | 일시·상태가 바뀌면 이미지도 바뀌어야 한다. Vercel 함수에서 바로 된다 |
| 글꼴은 메이플스토리 woff 하나만, 모듈 수준에서 한 번 읽는다 | woff2뿐인 Pretendard는 못 쓴다. 디스플레이 서체 하나로 통일하면 산만하지 않다(design.md). 원본을 수정하지 않고 읽기만 한다 |
| 영상 썸네일·사진을 넣지 않는다 | 남의 저작물을 스토리 이미지로 복제하게 된다. 글자와 스티커 색으로 그린다 |
| 주소는 요청의 호스트로 만든다(`request.url`) | 새 환경변수 없이 로컬·배포에서 각각 맞는 주소가 나온다 |
| 버튼은 클라이언트에서 이미지를 받아 `navigator.canShare({ files })`면 공유 창, 아니면 새 탭 | 휴대폰에서 스토리로 바로 보낼 수 있다. 데스크톱은 새 탭에서 저장 |
| 버튼은 클래스 소개 아래 "공유" 구역에 흰 스티커 버튼 하나 | 누구나 쓴다. 링크 복사는 범위 밖 |
| 공개 아닌 클래스는 404 | 클래스 상세와 같은 조건 |

## Issues Encountered

### 1. Satori가 글자와 식이 섞인 div를 거부한다

**문제**:

이미지 라우트가 500 "Expected <div> to have explicit display: flex … more than one child node"로 실패했다.

**원인**:

`<div>{c.regionName} · {c.studioName}</div>`는 JSX에서 자식 노드가 셋이다. Satori는 자식이 여럿인 요소에 `display: flex`를 요구한다.

**해결**:

템플릿 문자열 하나로 합쳤다.

**결과**:

해결됨

## Learnings

### 이미지 생성에 쓸 글꼴은 포맷부터 본다 (2026-11-03)

화면에서 잘 쓰던 글꼴이라도 Satori는 woff2를 못 읽는다. 패키지에 ttf·woff가 있는지 먼저 보고, 없으면 쓸 수 있는 글꼴 하나로 디자인을 맞춘다.

### Satori에서는 한 줄 글자도 문자열 하나로 (2026-11-03)

JSX에서 `{a} · {b}`는 눈에는 한 줄이지만 노드가 셋이라 Satori가 거부한다. 이미지용 JSX에서는 글자를 템플릿 문자열로 합치고, 자식이 둘 이상인 div에는 전부 `display: flex`를 준다.

