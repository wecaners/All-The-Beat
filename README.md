# 올빗 (All the Beat)

지금 유행하는 K-pop 곡의 오프라인 원데이 댄스 클래스를 **곡으로 찾고**, 없으면 **"추가요!"**, 마감됐으면 **"앵콜!"**로 요청하는 서비스.

## 문서

| 문서 | 내용 |
|---|---|
| [00 리서치](docs/00-리서치_유사서비스.md) | 유사·경쟁 서비스 조사 |
| [01 기획서](docs/01-기획서_One-pager.md) | 문제, 타깃, MVP 범위, 성공 지표 |
| [03 기능 명세서](docs/03-기능명세서.md) | 기능 F-01~F-24, 화면 목록, 데이터 개요 |
| [04 IA](docs/04-IA.md) | 사이트맵, URL, 권한 |
| [05 유저 플로우](docs/05-유저플로우.md) | 플로우 10개, 상태 다이어그램 |
| [06 음원 API 조사](docs/06-음원API_이미지조사.md) | 앨범 커버·곡 정보 API 비교, 이미지 사용 조건 |
| [07 기술 스택](docs/07-기술스택.md) | Next.js 풀스택 + Supabase, 무료 티어 제약, 먼저 할 기술 검증 |
| [08 시스템 아키텍처](docs/08-시스템아키텍처.md) | 구성도, 핵심 요청 흐름 5개, 보안·환경·배치 |
| [09 ERD](docs/09-ERD.md) | 테이블 16개 정의, 관계도, 인덱스, 주요 쿼리 |
| [기술 검증 T-1](docs/spike-01-인앱로그인검증.md) | 인앱 브라우저 카카오 로그인: 계정 세팅 가이드, 테스트 표 |
| [서비스명](docs/naming-서비스명_브레인스토밍.md) | 네이밍 과정, 도메인·상표 확인 |

02 인터뷰 질문지는 나중에 작성.

## AI와 함께 개발하는 규칙 (FBPW)

[AGENTS.md](AGENTS.md)(= `CLAUDE.md`)가 출발점이다. 세션마다 자동으로 읽힌다.

| 위치 | 내용 |
|---|---|
| [_agent/rules/](_agent/rules/) | 최우선 원칙, 제품 원칙, 기술 스택, `app/` 코딩 규칙 |
| [_agent/skills/](_agent/skills/) | `fbpw-plan`(기능 스펙), `verify`(검사), `git-commit`, `create-pr` |
| [specs/](specs/) | 기능 단위 스펙 (README·spec·plan·tasks·findings·progress) |

`.claude/rules`, `.claude/skills`는 `_agent/` 아래를 가리키는 링크다.

## 앱 (`app/`)

Next.js 16 + Supabase. 곡 상세(`/song/[slug]`)와 추가요, 로그인 검증 페이지(`/spike/song`)가 있다.

```bash
cd app
cp .env.local.example .env.local   # 값 채우기 (docs/spike-01 1절)
pnpm install
pnpm dev --port 3100
pnpm check         # 타입 검사 + 린트 + 빌드
```

DB (Drizzle, 스키마는 `app/src/db/schema/`)

```bash
pnpm db:check      # 접속 확인
pnpm db:generate   # 스키마 코드 → 마이그레이션 SQL
pnpm db:migrate    # dev DB에 적용
pnpm db:seed:dev   # dev DB에 샘플 곡 넣기 (A2O LITE - NEON → /song/a2o-lite-neon)
pnpm db:studio     # DB 내용 보기
```

## 와이어프레임

[wireframes/index.html](wireframes/index.html)을 브라우저로 연다. 위쪽에서 **보드**(모든 화면과 설명을 나란히)와 **프로토타입**(화면 하나씩 눌러보기)을 바꿀 수 있다.

| 화면 | 상태 |
|---|---|
| U-01 홈 | ✅ |
| U-02 검색 (입력 전 / 자동완성 / 결과 없음) | ✅ |
| U-03 클래스 목록 (기본 / 필터 결과 없음) | ✅ |
| U-04 곡 상세 (클래스 있음 / 없음) | ✅ |
| U-05 클래스 상세 (모집중 / 마감·앵콜 모으는 중 / 강사 검토 중) | ✅ |
| U-06 추가요 랭킹 (수강생 / 강사) | ✅ |
| U-08 로그인 시트, U-09 마이 (비로그인 / 로그인) | ✅ |
| U-10 앵콜 시트 | ✅ |
| T-01 강사 신청 (입력 / 인증·승인 대기) | ✅ |
| T-02 클래스 등록 (새 클래스 / 앵콜 클래스) | ✅ |
| T-03 내 클래스 (목록 / 앵콜 상세·응답) | ✅ |
| 운영자 화면 (A-xx) | 와이어프레임 없이 개발 때 바로 |

## 다이어그램 보기

IA·유저 플로우·아키텍처·ERD의 Mermaid 다이어그램은 [docs/diagrams.html](docs/diagrams.html)을 브라우저로 열면 그림으로 볼 수 있다. 문서를 고친 뒤에는 다시 생성한다.

```bash
python3 scripts/build_diagrams.py
```
