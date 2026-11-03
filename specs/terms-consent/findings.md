# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-09: 최초 로그인 시 이용약관·개인정보처리방침 동의(필수 2개), 마케팅 수신 동의(선택). 수집 항목은 카카오 고유 ID·닉네임·프로필 이미지(선택 동의), 이메일·전화번호는 받지 않음
- F-10: 마이에 약관 보기
- U-08(04 IA): 로그인·약관 동의, 약관 화면 `/terms`·`/privacy`
- 08 아키텍처 2.2: 콜백 뒤 "첫 로그인(약관 미동의)이면 약관 동의 시트 → 동의 저장" 뒤에 원래 화면으로. AR-2: 세션 ID 쿠키(`ab_sid`)에 대한 개인정보처리방침 문구
- 와이어프레임 U-09a: "올빗 시작하기 / 처음이시군요! 약관에 동의하면 바로 시작돼요", 전체 동의, 필수 2·선택 1, 각 약관 보기

## Research Findings

### 코드베이스 구조

- `profiles`에 `terms_agreed_at`·`privacy_agreed_at`·`marketing_agreed_at`이 이미 있다(NULL이면 동의 전). 마이그레이션이 필요 없다
- 로그인 콜백 `src/app/auth/callback/route.ts`: 코드 → 세션 교환 → `upsertProfileOnLogin` → `safeNextPath(next)`로 302. 여기서 동의 여부를 보고 동의 화면으로 보낼 수 있다
- `startKakaoLogin(nextPath)`를 부르는 곳 셋: 추가요 패널(`?request=open`), 앵콜 패널(`?encore=open`), 마이 로그인 카드(`/me`)
- 추가요·앵콜 서버 액션은 `getCurrentUser()` 뒤 `ensureProfile`로 프로필을 보장한다. 결과는 `{ ok, error }` 모양이고 패널이 `error`를 토스트·문구로 보여준다
- 예약 클릭은 `ab_sid` 쿠키(httpOnly, 1년)로 비로그인 중복을 거른다(`src/app/go/[classId]/route.ts`). 이벤트에는 referrer가 남고 IP는 남지 않는다
- 운영 DB는 Supabase `allbeat-dev`(서울), 배포는 Vercel(함수 리전 `icn1`)

### 기존 패턴

- 로그인이 필요한 화면은 `<Suspense>` 안에서 `getCurrentUser()`. 주소로 돌아갈 곳은 `safeNextPath`로 상대 경로만
- 고르는 칩 `ChoiceChip`은 라디오다. 체크박스는 아직 없다
- 수강생 화면은 스크랩북 규칙(design.md). 상태를 ✓ 기호로 표시하지 않는다(동의 체크는 입력이라 예외)

## Resources

### 문서

- F-09·F-10: `docs/03-기능명세서.md:273`, `docs/03-기능명세서.md:282`
- U-08·약관 화면: `docs/04-IA.md:166`, `docs/04-IA.md:173`
- 로그인 흐름: `docs/08-시스템아키텍처.md:105`, AR-2: `docs/08-시스템아키텍처.md:263`
- 와이어프레임 동의 시트: `wireframes/index.html:1275`
- 인앱 로그인 복귀: `docs/spike-01-인앱로그인검증.md`

### 코드 참조

- 콜백: `app/src/app/auth/callback/route.ts`
- 프로필: `app/src/server/profiles/index.ts`, `app/src/db/schema/users.ts:9`
- 로그인 시작: `app/src/lib/auth/kakao-login.ts`, 돌아갈 곳: `app/src/lib/safe-next.ts`

### API 엔드포인트

- 페이지 `GET /welcome?next=`(동의), `GET /terms`, `GET /privacy`
- 서버 액션(로그인 사용자): 동의 저장

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 동의는 카카오 로그인이 끝난 뒤 첫 로그인에만 받는다(콜백에서 동의 전이면 `/welcome?next=`로) | 05 플로우 3·08 2.2. 카카오에 가기 전에는 첫 로그인인지 알 수 없어 와이어프레임의 "동의하고 카카오로 시작"은 매번 체크를 요구하게 된다 |
| 동의 화면은 바텀시트가 아니라 한 화면(`/welcome`) | 콜백이 302로 보내는 곳이라 어느 화면 위에 시트를 띄울지 정할 수 없다. 모양은 시트처럼 카드 하나 |
| 동의 저장은 서버 액션. 필수 둘이 모두 체크된 요청만 저장하고, 시각은 서버가 `now()`로 | 동의 시각은 증빙이라 브라우저 값을 믿지 않는다 |
| 추가요·앵콜 저장 액션은 동의 전이면 `consentRequired`를 돌려주고, 패널이 `/welcome?next=<지금 화면>?request=open`으로 보낸다 | 동의 화면에서 벗어나도 로그인은 유지되므로 요청을 남기는 순간에 다시 막는다. 둘러보기는 막지 않는다(원칙 5) |
| 동의 여부는 `terms_agreed_at`과 `privacy_agreed_at`이 모두 있을 때 | 필수 둘이 한 번에 저장되지만, 한쪽만 있는 행이 생겨도 동의로 치지 않는다 |
| 이미 동의한 사용자가 `/welcome`에 오면 바로 `next`로 | 다시 묻지 않는다(F-09) |
| 약관·개인정보처리방침은 서버 컴포넌트 안의 정적 글. 운영자 이름·연락처는 빈칸 | 초안. 법률 검토와 사업자 정보는 사용자 몫 |
| 마케팅 동의는 시각만 기록하고 어디에도 쓰지 않는다 | 보내는 기능이 없다(F-20). 약속하지 않는다(원칙 6) |

## Issues Encountered

### 1. 약관 문구의 책임자·연락처

**문제**:

개인정보처리방침에는 개인정보 보호책임자와 연락처가 있어야 한다. 정해진 값이 없다.

**원인**:

운영 주체(개인·사업자)와 문의 창구가 아직 없다.

**해결**:

빈칸(`[운영자 이름]`, `[연락처]`)으로 두고 출시 전 할 일로 남긴다.

**결과**:

보류 (사용자 결정 필요)

## Learnings

### 브라우저 코드가 서버 모듈을 부르지 않게 경로 도우미는 `src/lib`에 둔다 (2026-11-03)

동의 화면 주소를 만드는 함수를 `src/server/consent`에 뒀더니 추가요·앵콜 패널(클라이언트)이 DB 연결이 든 모듈을 import하게 됐다. 브라우저와 서버가 같이 쓰는 작은 도우미는 `src/lib`에 둔다(app.md 의존 방향).
