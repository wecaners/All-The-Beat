# AGENTS.md

올빗(All the Beat)을 AI와 함께 개발할 때의 규칙 목록이다. `CLAUDE.md`는 이 파일을 가리키는 링크라 세션마다 자동으로 읽힌다.
세부 규칙은 `_agent/rules/`의 파일에서 관리한다. 관련 작업을 시작할 때 해당 파일을 읽어 규칙을 확인한다.

## 규칙 파일 목록

| 파일 | 적용 범위 |
| --- | --- |
| `_agent/rules/core-principles.md` | 모든 작업에 적용되는 최우선 행동 원칙 |
| `_agent/rules/product.md` | 제품 원칙 — MVP 원칙, 핵심 개념, 문구 규칙 |
| `_agent/rules/tech-stack.md` | 기술 스택, 디렉터리 역할, 환경·계정 |
| `_agent/rules/app.md` | `app/` — Next.js 16·Supabase·Drizzle 코딩 규칙 |
| `_agent/rules/design.md` | 수강생 화면 디자인 — 덕질 스크랩북 컨셉, 토큰, 컴포넌트, 움직임 |

## 스킬 목록

| 스킬 | 언제 |
| --- | --- |
| `_agent/skills/fbpw-plan` | 비경량 기능의 스펙(`specs/<feature>/`)을 한 파일씩 쓸 때 |
| `_agent/skills/verify` | 코드를 고친 뒤, 커밋·PR 전에 |
| `_agent/skills/git-commit` | 커밋할 때 (사용자가 커밋을 지시한 뒤에만) |
| `_agent/skills/create-pr` | PR을 만들 때 (개인 계정 토큰으로) |

## 읽기 원칙

- **`core-principles.md`는 세션 시작 시 항상 읽는다.**
- 기능을 기획하거나 화면 문구를 쓸 때는 `product.md`를 읽는다.
- 수강생 화면을 만들거나 고칠 때는 `design.md`를 읽는다.
- `app/` 작업 전에 `tech-stack.md`와 `app.md`를 읽는다. Next.js API를 쓰기 전에는 `app/AGENTS.md`가 가리키는 `app/node_modules/next/dist/docs/`의 해당 가이드를 읽는다.
- 처음 보는 패턴이나 규칙이 기억나지 않을 때는 추측하지 않고 해당 파일을 다시 읽는다.
- 스킬을 쓸 때는 스킬 파일을 Read로 연 뒤 그 절차를 따른다.

## 문서 지도

| 위치 | 내용 |
| --- | --- |
| `docs/` | 제품 전체 설계 — 리서치·기획서·기능 명세·IA·플로우·기술 스택·아키텍처·ERD·기술 검증 |
| `specs/<feature>/` | 기능 단위 FBPW 스펙 — README·spec·plan·tasks·findings·progress |
| `wireframes/` | HTML 와이어프레임 (U-xx, T-xx 화면) |
| `app/` | Next.js 앱 |
