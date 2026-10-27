---
name: create-pr
description: 올빗(All the Beat) 저장소에서 현재 브랜치로 GitHub PR을 만든다. 개인 계정(wecaners) 토큰으로 실행하고, 커밋 내역을 읽어 한국어 PR 본문(요약·변경·확인한 것·머지 전 할 일)을 쓴다. 사용자가 "PR 만들어줘", "PR 올려", "풀리퀘", "main에 합치게 PR", "리뷰 올려줘"처럼 PR을 원하거나, 브랜치 작업을 마치고 main에 합칠 준비를 할 때는 직접 gh를 부르지 말고 반드시 이 스킬을 쓴다.
---

# PR 만들기 (올빗)

현재 브랜치를 `main`으로 합치는 PR을 만든다. PR은 사용자가 GitHub에서 직접 머지한다 — 이 스킬은 **만들기까지만** 한다.

## 왜 그냥 `gh pr create`를 쓰면 안 되나

이 Mac의 gh 기본 계정은 **회사 계정(`wade-readypost`)**이고, 이 저장소는 **개인 계정(`wecaners/All-The-Beat`)** 것이다. 그냥 gh를 부르면 회사 계정 이름으로 PR이 올라가거나 권한 오류가 난다. 기본 계정을 바꾸면(gh auth switch) 회사 작업이 깨지므로, 모든 gh 호출은 개인 토큰을 명령 단위로 넘기는 스크립트로 한다:

```bash
.claude/skills/create-pr/scripts/gh-personal.sh <gh 인자...>
```

이하 `ghp`는 이 스크립트를 뜻한다. git push는 SSH 별칭(`github.com-wecaners`) 원격을 쓰므로 그대로 `git push`하면 된다.

## 순서

### 1. 상태 확인
- `git branch --show-current`가 `main`이면 멈추고 브랜치를 먼저 만들자고 말한다.
- 커밋 안 한 변경(`git status --short`)이 있으면 PR에 들어가지 않는다. 무엇이 남았는지 보여주고 커밋할지 사용자에게 묻는다 (커밋은 사용자가 원할 때만).
- `git fetch origin main` 후 `git log --oneline origin/main..HEAD`가 비면 올릴 게 없다고 말하고 멈춘다.

### 2. 계정 확인
- `ghp whoami` → `wecaners`가 나와야 한다.
- 실패(종료 코드 2)하면 스크립트가 출력한 로그인 명령을 사용자에게 그대로 전하고 멈춘다. 로그인은 사용자가 브라우저에서 직접 해야 한다 (Claude가 대신 인증하지 않는다).

### 3. push
- 원격에 브랜치가 없거나 앞서 있으면 `git push -u origin <branch>`.

### 4. 이미 PR이 있는지
- `ghp pr list --repo wecaners/All-The-Beat --head <branch> --state open --json number,url`
- 있으면 새로 만들지 않는다. 그 URL을 알려주고, 본문을 최신 커밋에 맞게 고칠지 묻는다 (고치면 `ghp pr edit <번호> --body-file ...`).

### 5. 본문 쓰기
재료:
- `git log --format='%h %s%n%b' origin/main..HEAD` — 커밋 제목·본문이 가장 좋은 요약 재료다
- `git diff --stat origin/main...HEAD`
- 아래 "머지 전 할 일" 신호를 찾는 diff

**머지 전 할 일 찾기** — 머지하면 Vercel이 바로 운영 배포하므로, 배포가 깨질 수 있는 것을 놓치지 않는 게 이 PR 본문의 가장 중요한 역할이다.
- `app/.env.local.example`에 새 변수 → Vercel 환경변수에 넣어야 함. 이름에 `NEXT_PUBLIC_`이 있으면 Type **Config**, 없으면 **Secret**. `MIGRATION_DATABASE_URL`처럼 로컬 전용은 제외
- `app/src/db/migrations/`에 새 `.sql` → 운영 DB에 `pnpm db:migrate`가 필요한지 (지금은 dev DB만 있다면 "dev에는 적용됨"으로 적는다)
- `app/vercel.json`, `app/package.json`의 `packageManager`·의존성 변경 → 배포 빌드 확인 필요
- Supabase·카카오 콘솔 설정이 필요한 변경 (리다이렉트 URL, 동의항목 등)
- 해당 없으면 "없음"이라고 적는다. 빈칸으로 두지 않는다

**제목**: 70자 이내, 무엇이 되는지가 드러나게. 커밋 하나면 그 커밋 제목을 다듬어 쓰고, 여러 개면 묶어서 쓴다. 예: `DB 스키마(테이블 16개)와 로그인 시 프로필 저장`

**본문 형식** (문서들과 같은 한국어 톤, 짧은 문장):

```markdown
## 요약
<이 PR로 무엇이 가능해지는지 1~3문장>

## 변경 사항
- <커밋을 묶어 사용자 관점으로. 파일 나열이 아니라 "무엇이 바뀌었나">

## 확인한 것
- <타입 검사·린트·빌드, 로컬·배포에서 직접 확인한 것. 이 대화에서 실제로 확인한 것만 적는다>

## 확인 못 한 것
- <안 해본 것. 없으면 이 절을 뺀다>

## 머지 전 할 일
- [ ] <위에서 찾은 것. 없으면 "없음">

## 관련 문서
- <바뀐 docs/ 파일 링크. 없으면 이 절을 뺀다>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

"확인한 것"은 지어내지 않는다. 이번 대화에서 돌려본 결과만 적고, 모르면 "확인 못 한 것"에 넣는다 — PR 본문이 머지 판단의 근거가 되기 때문이다.

본문은 임시 파일에 쓰고 `--body-file`로 넘긴다 (따옴표·백틱이 셸에서 깨지지 않게).

### 6. 만들기
```bash
ghp pr create --repo wecaners/All-The-Beat --base main --head <branch> \
  --title "<제목>" --body-file <본문 파일>
```
- 머지, 자동 머지(auto-merge), 리뷰어 지정은 하지 않는다. 사용자가 따로 요청할 때만.

### 7. 알리기
- PR 링크를 `[wecaners/All-The-Beat#<번호>](<url>)` 형식으로 준다
- "머지 전 할 일" 체크리스트를 대화에도 다시 짧게 보여준다 — 사용자가 GitHub에서 놓치지 않게
