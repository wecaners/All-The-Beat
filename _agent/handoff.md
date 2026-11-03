# 세션 인수인계 (2026-10-28 기준)

새 세션은 `AGENTS.md`(자동으로 읽힘) → **이 파일** → 작업할 기능의 `specs/<feature>/progress.md` 순서로 읽고 시작한다.
이 파일은 "지금 어디까지 왔고, 무엇이 남았고, 무엇을 조심해야 하는가"만 담는다. 규칙은 `_agent/rules/`, 설계는 `docs/`, 기능 스펙은 `specs/`가 기준이다. 상태가 바뀌면 이 파일을 고친다.

## 1. 프로젝트와 협업 방식

- **올빗 (All the Beat)**: K-pop 곡으로 오프라인 원데이 댄스 클래스를 찾고, 없으면 "추가요!", 마감됐으면 "앵콜!"로 요청하는 모바일 웹. 기획 요약은 `_agent/rules/product.md`
- 사용자(개인 프로젝트로 혼자 만든다)와 Claude는 **동업자 겸 개발 파트너**. Claude는 의견·대안을 내되 실행은 사용자가 고른 뒤에 한다 (`core-principles.md`)
- 대화는 한국어 해요체. 사용자는 실물로 보고 컨펌하는 것을 선호한다 (시안은 HTML로 만들어 브라우저로 보여줌)
- 사용자가 FBPW 단계별 리뷰를 건너뛰라고 한 적이 두 번 있다(운영자 등록, 디자인 시스템). 그때도 스펙 6개 파일은 채우고 결정은 findings에 남겼다. 새 기능에서 리뷰를 할지는 매번 사용자 지시를 따른다

## 2. 지금 상태

### Git

- 저장소: `wecaners/All-The-Beat` (개인 계정). 원격 `git@github.com-wecaners:wecaners/All-The-Beat.git`
- `main`에 머지된 PR: #1 로그인 검증 → #2 DB 스키마·프로필 → #3 곡 상세·추가요 → #4 AI 규칙(FBPW) → #5 운영자 등록
- **현재 브랜치 `design/visual-concept` (main `ddaf5d1`에서 분기), 전부 커밋 안 됨.** 들어 있는 것:
  - `design/` 시안 1~4차 HTML + `design/README.md`(디자인 결정 기록)
  - `specs/design-system/` 스펙 6개 파일
  - `_agent/rules/design.md` 디자인 규칙 (AGENTS.md에 등록)
  - `app/src/components/` 공통 컴포넌트 11개, `globals.css` 토큰, `layout.tsx` 폰트, `pretendard` 패키지
  - 곡 상세·추가요 시트·완료 순간 리디자인, 서버 `saveRequest`가 `{ isNew, position }` 반환
  - 운영 화면 흰 배경(`admin/layout.tsx`)
- 커밋·push는 사용자가 지시할 때만, `_agent/skills/git-commit` 절차로. 의도가 둘 이상이면 나눈다 (예: 시안·디자인 결정 / 디자인 시스템 구현 / 순번 버그 수정)

### 마지막으로 한 일과 남은 확인

- 사용자 피드백 3건을 반영했다: ① 첫 추가요인데 완료 순간이 안 뜸(순번 0 버그, 수정) ② 도는 "추가요!" 별 스티커가 조잡함(SVG 다이컷 스티커 + 살랑임으로 교체) ③ "추가요 완료 ✓" 버튼과 밑줄 "추가요 취소"가 어색함(완료 도장 카드 + 수정/취소 스티커 버튼 + 취소 확인 시트)
- **사용자 확인 대기**: 로그인 상태에서 취소 → 다시 추가요 → 완료 순간이 뜨는지, 수정 시 안내 토스트, 취소 확인 시트. `specs/design-system/tasks.md` Phase 4 인수 2~5가 남아 있다
- `specs/admin-song-class-registration/tasks.md` Phase 4도 일부 미확인(일반 계정 차단, 막힌 영상 거절, 중복 slug, 잘못된 입력, 구 주소 권역 추정)

### 실행 환경

- 개발 서버: `.claude/launch.json`의 `app-dev` (pnpm, 포트 **3100**. 3000은 다른 프로그램이 씀). 미리보기는 `preview_start name=app-dev`로 띄운다. Bash로 따로 띄우면 충돌한다
- 시안 HTML은 파일을 브라우저로 직접 연다 (`design/concepts/round-N.html`)
- 로컬 dev DB = 지금은 **운영 배포도 같은 DB** (`allbeat-dev`). 운영 DB 분리는 출시 전 할 일

## 3. 외부 서비스 (비밀값 아님)

| 항목 | 값 |
| --- | --- |
| Supabase 프로젝트 | `allbeat-dev`, ref `itkzhrcbfnmnisrlqmme`, **서울(ap-northeast-2)** |
| Vercel | `https://all-the-beat.vercel.app`, Root Directory `app`, Framework Next.js, 함수 리전 `icn1`(`app/vercel.json`) |
| 카카오 앱 | 개인 개발자 비즈 앱, REST API 키 `538c…`, 동의항목 닉네임(필수)·프로필 사진·이메일(선택) **세 개 다** 켜져 있어야 함 |
| 운영자 계정 | dev DB 유일 사용자 `17153ad6…`가 `admin` (`pnpm admin:grant`) |
| 샘플 데이터 | 곡 NEON(`/song/a2o-lite-neon`), 테스트가수-테스트곡, 대리 강사 1명(동의 있음), 테스트 클래스 #1(10/29), NEON 추가요 1건 |

계정 설정 절차는 `docs/spike-01-인앱로그인검증.md` 1절. 비밀값은 `app/.env.local`에만 있고 절대 출력·커밋하지 않는다.

## 4. 다음에 할 수 있는 일 (선택은 사용자)

### 이 브랜치 마무리

1. 사용자의 로그인 흐름 확인 → 커밋·push → PR (`create-pr` 스킬은 gh에 `wecaners` 로그인이 아직 없어 실패한다. 사용자가 GitHub에서 직접 PR을 만들어 왔다. 본문은 스킬 형식으로 써 주면 된다)

### 다음 기능 후보 (모두 `_agent/rules/design.md` 스크랩북 컴포넌트로)

- U-01 홈 (핫한 곡 포토카드, 다가오는 클래스 티켓, 추가요 TOP) — 시안 round-2·3에 모양과 움직임이 있다
- U-05 클래스 상세 + F-06 예약 링크 `/go/{id}` 클릭 기록 — 지금 곡 상세의 티켓이 `/class/{id}`로 가면 404
- F-02 검색 (별칭·정규화 `normalizeAlias`, pg_trgm 인덱스 있음)
- F-08 추가요 랭킹, F-10 마이(내 추가요), U-08 약관 동의, F-24 앵콜, F-11 강사 신청

### 출시 전에 꼭 할 일 (잊지 말 것)

- 운영 DB 분리 + 운영 DB에 마이그레이션 0000~0004 적용, Vercel 환경변수 분리
- Vercel `DATABASE_URL`(Secret) 설정 여부 확인
- 개인정보처리방침: "카카오 로그인 시 이메일(선택)이 인증 시스템에 저장됨"
- 테스트 데이터 정리 (공개된 테스트 강사·클래스. 삭제는 사용자 확인 후)
- 인앱 로그인 남은 기기 테스트 #2(iPhone 카톡) #4·#5(안드로이드)
- 없는 곡·운영 화면의 404가 HTTP 200으로 나가는 문제 (Suspense 안 notFound)
- 공유용 OG 이미지 (곡 포토카드 + 스티커)

## 5. 조심할 것 (이번 세션에서 실제로 겪은 것)

### Next.js 16

- API를 쓰기 전에 `app/node_modules/next/dist/docs/`를 읽는다. `middleware.ts` → `proxy.ts`
- Cache Components: 쿠키·params를 읽는 컴포넌트는 `<Suspense>` 안. 요청마다 다른 데이터는 `await connection()` 뒤 (`getCurrentUser()`는 이미 함). 로그에 "unstable value … while prerendering"이 나오면 고친다
- **한글 slug**: 본문 렌더의 `params.slug`는 퍼센트 인코딩된 채로 온다 → `decodeURIComponent` (`song/[slug]/page.tsx`의 `readSlug`)
- 서버 액션은 첫 줄에서 로그인·권한 재확인. 운영 액션은 `requireAdmin()`

### DB·Supabase

- Drizzle + 트랜잭션 풀러(6543) `prepare: false`. 마이그레이션은 세션 풀러(5432) `MIGRATION_DATABASE_URL`
- 모든 테이블 RLS 켬 + 정책 0개 + anon/authenticated 권한 회수(마이그레이션 0002). 브라우저는 DB에 직접 못 간다
- **시각 비교는 DB 안에서**: `timestamptz`(마이크로초)를 JS `Date`(밀리초)로 꺼냈다 넣으면 같은 행도 어긋난다 (완료 순간 순번 0 버그의 원인)
- 순서: 스키마 → `pnpm db:generate` → SQL 검토 → `pnpm db:migrate` → 다시 generate가 "No schema changes"

### 계정·비밀값

- 이 컴퓨터의 gh 기본 계정은 **다른 계정**. 기본 계정을 바꾸지 않는다. 개인 계정 gh는 `_agent/skills/create-pr/scripts/gh-personal.sh`
- 커밋 작성자 `wade <wecaners1@gmail.com>`. 다른 계정·저장소를 이 프로젝트에 쓰지 않는다
- Vercel 환경변수: `NEXT_PUBLIC_*`는 Type **Config**, 서버 전용은 **Secret** (Secret으로 만든 걸 Config로 못 바꿈 → 지우고 다시)
- 비밀값 이름에 `NEXT_PUBLIC_`을 붙이면 브라우저로 샌다 (`pnpm db:check`가 경고)

### 디자인

- 컨셉 **덕질 스크랩북** (밝고 귀엽고 키치). 규칙·토큰·컴포넌트는 `_agent/rules/design.md`, 결정 과정은 `design/README.md`
- **3D 에셋은 쓰지 않는다** (사용자 결정). 마스코트는 미정
- 사용자는 완성도에 민감하다: 계단 진 도형, 계속 도는 글자, ✓ 같은 기호, 밑줄 링크 버튼을 "어색하다"고 했다. 새 UI는 `design.md`의 "하지 않는 것 (완성도)"를 지킨다
- 로그인 상태 화면은 Claude가 직접 못 본다 → 가짜 데이터로 임시 확인 페이지를 만들어 보고, 확인 후 지운다(커밋 금지)
- 브라우저 미리보기 스크린샷은 애니메이션 도중에 찍히면 깨져 보인다. 상태를 JS로 확인하거나 조금 기다렸다 다시 찍는다

### 검증

- 코드 변경 뒤 `cd app && pnpm check` (tsc + eslint + build). DB를 건드렸으면 `pnpm db:check && pnpm db:generate`. ESLint가 계층 의존(`src/server`→Next·React 금지)을 막는다
- "확인했다"는 실제로 돌려본 것만. 사용자만 할 수 있는 확인(로그인·기기)은 "확인 못 함"으로 따로 적는다
