# 기술 스택·디렉터리·환경

결정 근거는 `docs/07-기술스택.md`, 구성도는 `docs/08-시스템아키텍처.md`, 데이터는 `docs/09-ERD.md`에 있다.

## 스택

| 영역 | 선택 |
| --- | --- |
| 앱 | Next.js 16 (App Router, Turbopack, Cache Components, Partial Prefetching), React 19, TypeScript, Tailwind v4 |
| 인증 | Supabase Auth — 카카오 로그인 (`@supabase/ssr`) |
| DB | Supabase Postgres + Drizzle ORM (`postgres` 드라이버) |
| 검증 | zod |
| 배포 | Vercel (Hobby, 함수 리전 `icn1`) |
| 패키지 매니저 | pnpm 11 |

별도 백엔드(NestJS 등)는 두지 않는다. 바꾸려면 먼저 `docs/07`을 고친다.

## 디렉터리 역할

```text
app/src/
├── app/           라우트·화면·서버 액션 (얇게). 입력 파싱·로그인 확인·화면 갱신만
├── server/        비즈니스 로직. 도메인별 폴더(songs, requests, classes, profiles, regions ...)
├── db/            Drizzle 스키마(schema/)·마이그레이션(migrations/)·연결(index.ts)
└── lib/           인증 헬퍼, Supabase 클라이언트, 포맷, 정규화 같은 공용 도구
app/scripts/       db-check, seed-dev 같은 로컬 스크립트
```

의존 방향은 `app → server → db` 한 방향이다. 자세한 규칙은 `app.md`에 있다.

## 환경

| 환경 | 앱 | DB |
| --- | --- | --- |
| 로컬 | `pnpm dev --port 3100` (3000번은 다른 프로그램이 씀) | Supabase `allbeat-dev` (서울) |
| 운영 | Vercel `main` → `https://all-the-beat.vercel.app` | 지금은 같은 `allbeat-dev`. 운영 DB를 따로 만들면 이 표를 고친다 |

## 환경변수

형식은 `app/.env.local.example`이 기준이다.

| 이름 | 공개 | Vercel Type | 비고 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저 | Config | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 브라우저 | Config | `sb_publishable_` |
| `DATABASE_URL` | 서버 전용 | Secret | 트랜잭션 풀러 6543 |
| `MIGRATION_DATABASE_URL` | 로컬 전용 | 넣지 않음 | 세션 풀러 5432, drizzle-kit용 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 브라우저 | Config | 카카오맵 JS SDK. 카카오 콘솔에 도메인 등록 필수 |
| `KAKAO_REST_API_KEY` | 서버 전용 | Secret | 카카오 로컬 API(연습실 검색) |

새 환경변수를 만들면 이 표, `app/.env.local.example`, PR 본문의 "머지 전 할 일"을 같이 고친다.

## 외부 서비스 설정 위치

설정 절차와 실제 값은 `docs/spike-01-인앱로그인검증.md` 1절에 있다. 카카오·Supabase·Vercel 콘솔 설정은 사용자가 직접 한다.
