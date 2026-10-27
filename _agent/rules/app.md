# app/ 코딩 규칙

`app/` 작업 전에 읽는다. Next.js 16은 학습 데이터와 다르다. API를 쓰기 전에 `app/node_modules/next/dist/docs/`의 해당 가이드를 읽는다 (`app/AGENTS.md`).

## 계층과 의존 방향

```text
src/app (라우트·화면·서버 액션) → src/server (비즈니스 로직) → src/db (스키마·연결)
                 ↘ src/lib (공용 도구) ↙
```

- `src/server`는 `next/*`와 React를 import하지 않는다. 순수 TypeScript로 두어 스크립트·배치에서도 쓸 수 있게 한다.
- `src/db`는 `src/server`·`src/app`을 import하지 않는다.
- 브라우저는 DB에 직접 접근하지 않는다. 모든 읽기·쓰기는 서버 → `src/server` → Drizzle이다.
- 화면에서 쓰는 데이터 모양(타입)은 `src/server`가 정의해 내보낸다.

## 인증

- 서버에서 로그인 사용자는 `src/lib/auth/current-user.ts`의 `getCurrentUser()`로만 읽는다. 서명이 검증된 `getClaims()`를 쓰고, 서버에서 `getSession()`을 믿지 않는다.
- 서버 액션·Route Handler는 첫 부분에서 `getCurrentUser()`로 로그인을 다시 확인한다. 화면에서 버튼을 숨긴 것은 보안이 아니다.
- 클라이언트가 보낸 id(곡·클래스 등)는 믿지 않는다. `src/server`에서 존재·권한을 다시 확인한다.
- 로그인 후 돌아갈 주소(`next`, `returnTo`)는 `src/lib/safe-next.ts`로 상대 경로만 허용한다.
- 카카오 로그인 시작은 `src/lib/auth/kakao-login.ts`의 `startKakaoLogin(nextPath)`를 쓴다. 비로그인 사용자의 요청 버튼은 로그인 시트(카톡 복귀 안내 포함)를 거친다.

## 데이터 접근

- DB 연결은 `getDb()` 하나만 쓴다. Supabase 트랜잭션 풀러라 `prepare: false`를 유지한다.
- 입력은 `src/server`에서 zod 스키마로 검증한다. 서버 액션은 FormData를 그 스키마에 넘긴다.
- 사용자 × 대상 1건 같은 규칙은 DB 유니크 제약 + upsert로 지킨다. 앱 코드의 "먼저 조회 후 삽입"에 기대지 않는다.
- 상태 전이(앵콜 라운드 등)는 한 트랜잭션 안에서 하고, 뒤로 가는 전이는 서버에서 막는다.
- 숫자를 두 곳에 저장하지 않는다(예: 앵콜 인원은 `encores`에서 센다).

## 스키마·마이그레이션

- 스키마는 `src/db/schema/`의 도메인별 파일에 쓴다. 컬럼 이름은 camelCase로 쓰면 snake_case로 바뀐다(`casing: "snake_case"`).
- 새 테이블은 `.enableRLS()`를 붙인다. 정책은 만들지 않는다(브라우저 역할은 전부 차단).
- 순서: 스키마 수정 → `pnpm db:generate` → 생성된 SQL을 읽고 검토 → `pnpm db:migrate`(dev) → `pnpm db:generate`가 "No schema changes"인지 확인.
- 확장·시드·권한처럼 drizzle-kit이 못 만드는 것은 `pnpm drizzle-kit generate --custom --name=<이름>`으로 빈 마이그레이션을 만들어 SQL을 직접 쓴다.
- 운영에 필요한 기준 데이터(권역 등)는 마이그레이션으로, 개발용 샘플은 `scripts/seed-dev.mts`로 넣는다.
- 적용된 마이그레이션 파일은 고치지 않는다. 바꾸려면 새 마이그레이션을 만든다.
- `docs/09-ERD.md`와 스키마가 달라지면 ERD 8절(구현)을 같이 고친다.

## Cache Components

- 쿠키·헤더·`params`·`searchParams`를 읽는 컴포넌트는 `<Suspense>` 안에 둔다.
- 요청마다 달라야 하는 데이터(로그인, 내 요청, 추가요 수, 다가오는 클래스)는 `await connection()` 뒤에 읽는다. `getCurrentUser()`는 이미 그렇게 한다.
- 자주 안 바뀌는 데이터(곡 정보, 권역)는 `"use cache"` + `cacheLife` + `cacheTag`로 캐시한다. 바꾸는 쪽은 `updateTag`로 갱신한다.
- 서버 액션이 끝나면 `refresh()`(또는 `updateTag`)로 화면을 갱신한다.
- 개발 서버 로그에 "unstable value ... while prerendering"이 나오면 넘어가지 않고 고친다.

## 화면

- 모바일 우선. 기준 폭 375px, 콘텐츠 최대 폭 `max-w-md`.
- 바텀시트·칩 같은 공용 UI가 두 화면 이상에서 쓰이면 `src/components/`로 옮긴다(shadcn/ui 도입 전까지 직접 만든다).
- 시간은 KST로 보여준다(`src/lib/format.ts`).
- 화면 문구는 `product.md`의 원칙 6을 지킨다.

## 서버 로그

- 사용자에게 보여주는 오류 문구와 서버 로그를 나눈다. 원인(스택·SQL)은 `console.error`로만 남기고 화면·URL에 넣지 않는다.
- 개인정보(닉네임·이메일·메시지 내용)는 로그에 남기지 않는다.
