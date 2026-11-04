# 개발 가이드

이 저장소를 로컬에서 실행하고 고치는 방법. 프로젝트 소개는 [README](../README.md).

## 앱 (`app/`)

Next.js 16 + Supabase. 곡 상세(`/song/[slug]`)와 추가요, 운영 화면(`/admin`: 곡·강사·클래스 대리 등록), 로그인 검증 페이지(`/spike/song`)가 있다.

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
pnpm admin:grant <닉네임>   # 운영자 지정 (--revoke로 해제). 운영 화면은 /admin
```

## AI와 함께 개발하는 규칙 (FBPW)

[AGENTS.md](../AGENTS.md)(= `CLAUDE.md`)가 출발점이다. 세션마다 자동으로 읽힌다.

| 위치 | 내용 |
|---|---|
| [_agent/rules/](../_agent/rules/) | 최우선 원칙, 제품 원칙, 기술 스택, `app/` 코딩 규칙 |
| [_agent/skills/](../_agent/skills/) | `fbpw-plan`(기능 스펙), `verify`(검사), `git-commit`, `create-pr` |
| [specs/](../specs/) | 기능 단위 스펙 (README·spec·plan·tasks·findings·progress) |

`.claude/rules`, `.claude/skills`는 `_agent/` 아래를 가리키는 링크다.

## 와이어프레임

[wireframes/index.html](../wireframes/index.html)을 브라우저로 연다. 위쪽에서 **보드**(모든 화면과 설명을 나란히)와 **프로토타입**(화면 하나씩 눌러보기)을 바꿀 수 있다.

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

IA·유저 플로우·아키텍처·ERD의 Mermaid 다이어그램은 [diagrams.html](diagrams.html)을 브라우저로 열면 그림으로 볼 수 있다. 문서를 고친 뒤에는 다시 생성한다.

```bash
python3 scripts/build_diagrams.py
```
