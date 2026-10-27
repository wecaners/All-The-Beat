---
name: fbpw-plan
description: |
  올빗 기능 스펙(specs/<feature>/)을 FBPW 방식으로 한 파일씩 작성한다.
  README.md → spec.md → plan.md 순서로 쓰고, 파일마다 리뷰를 받은 뒤 다음으로 넘어간다.
  사용자가 "/fbpw-plan <기능>", "스펙 써줘", "기능 기획 문서 만들어줘"라고 하거나,
  비경량 기능(core-principles.md 기준)을 구현하기 전에는 이 스킬로 스펙부터 쓴다.
---

기능 스펙을 한 번에 다 쓰지 않는다. README.md → spec.md → plan.md 순서로 한 파일씩 쓰고, 매번 리뷰를 받는다.
한 파일씩 끊는 이유: 앞 파일의 방향이 틀리면 뒤 파일이 전부 틀린다. 사용자가 일찍 바로잡을 수 있게 한다.

## 호출 형식

```text
/fbpw-plan <feature>
```

`<feature>`는 기능 이름이다. 한국어도 된다. 예: `/fbpw-plan 추가요 랭킹`
디렉터리 이름은 영어 소문자 kebab-case로 바꿔 쓴다. 예: `추가요 랭킹` → `request-ranking`

## 올빗 문서와의 관계

- `docs/`는 제품 전체 설계다. 기능 스펙은 `docs/03-기능명세서.md`의 F-xx, `docs/04`·`05`의 화면·플로우, `docs/09`의 테이블을 **출발점으로 삼고 링크한다.** 내용을 통째로 복사하지 않는다.
- 스펙을 쓰다가 `docs/`와 다른 결정이 나오면 `findings.md` Technical Decisions에 적고, 구현이 끝날 때 `docs/`의 원문도 고친다.

## 절차 — 순서대로

### Step 0: 디렉터리와 템플릿

1. `<feature>`를 kebab-case 디렉터리 이름으로 바꾼다.
2. `specs/<feature>/`가 없으면 만들고 FBPW 템플릿 6개를 받아 저장한다.
   - 원본: `https://raw.githubusercontent.com/ahastudio/file-based-planning-workflow/main/templates/<filename>`
   - 파일: `README.md`, `spec.md`, `plan.md`, `tasks.md`, `findings.md`, `progress.md`
   - 원본 저장소에 라이선스 표기가 없어 템플릿을 이 저장소에 따로 보관하지 않고, 쓸 때마다 받는다.
3. 이미 있으면 건너뛴다.

### Step 1: 이 파일 Read

Read 도구로 이 SKILL.md를 연다. 기억으로 대신하지 않는다.

### Step 2: 현재 단계 파악

`specs/<feature>/progress.md`의 `## 현재 단계`를 읽는다. 없으면 "README 작성 전"이다.

### Step 3: 다음 작업 하나만

| 완료 단계 | 다음 작업 |
| --- | --- |
| (없음) | README.md |
| README 완료 | findings.md Research → spec.md |
| spec 완료 | plan.md |
| plan 완료 | progress.md 정리(Step 9) → "스펙 완료" 안내 후 종료 |

**한 번에 파일 하나만 쓴다.**

### Step 4: spec.md 전 Research (README 완료 후에만)

spec.md를 쓰기 전에 조사부터 한다. 모르는 채로 spec을 쓰지 않는다.

1. `findings.md`를 읽는다.
2. 관련 기존 자료를 찾는다.
   - `docs/03`의 해당 F-xx, `docs/04` URL·권한, `docs/05` 플로우, `docs/09` 테이블·인덱스, `wireframes/index.html`의 해당 화면
   - `app/src/server/`의 재사용할 함수, `app/src/db/schema/`의 테이블, 비슷한 기존 화면
3. `findings.md`의 기존 섹션에 채운다. 템플릿에 없는 섹션을 만들지 않는다.
   - Requirements: F-xx에서 가져온 요구사항
   - Research Findings: 코드베이스 구조·기존 패턴
   - Resources: 문서·코드 참조(`경로:줄`). **외부 URL은 여기에만** 둔다
   - Technical Decisions: 정한 것과 이유
   - Issues Encountered: 풀리지 않은 질문·미정 사안
   - Learnings: 설계하며 얻은 통찰, 사용자 피드백에서 얻은 통찰
   - API 엔드포인트 칸은 서버 액션·Route Handler 목록으로 쓴다

### Step 5: 쓸 파일 먼저 Read

### Step 6: 파일 작성

템플릿의 섹션과 순서를 유지하며 채운다. 템플릿 주석(`<!-- -->`)은 지운다.

#### README.md

- Background(왜 필요한가, 사용자 가치) · Goal(무엇을 할 수 있게 하는가, 한 문장) · How it works(사용자가 할 수 있는 것과 시스템 반응)
- 기술 구현·테이블 이름·코드 없음. 설계 근거는 plan.md, 비즈니스 규칙은 spec.md의 몫
- How it works에 화면 요소(버튼·시트·탭 이름) 묘사 없음. 동작 중심으로
- Related Documents에는 6개 파일 링크와 근거가 된 `docs/` 문서(F-xx) 링크를 둔다

#### spec.md

- User Story · Acceptance Scenarios(Given/When/Then) · Functional Requirements(FR-n) · Constraints(CON-n) · Success Criteria(SC-n)
- UI 묘사 없음 — 색상·애니메이션·컴포넌트명 대신 행동 결과만. 예: "저장됐다는 안내를 받는다" (O) / "토스트가 2초 뒤 사라진다" (X)
- 구현 세부사항 없음 — 결과만 쓴다
- 화면 문구 규칙은 `_agent/rules/product.md` 원칙 6을 지킨다. 아직 없는 기능을 약속하는 시나리오를 쓰지 않는다
- OpenAPI 절: 올빗은 서버 액션이 기본이다. 외부에서 부르는 Route Handler가 있을 때만 쓰고, 없으면 "서버 액션 목록" 표(이름·입력·결과·권한)로 바꾼다

#### plan.md

- **Outside-In 순서**로 쓴다. 사용자에게 가까운 바깥부터 안쪽으로 내려간다.
  ```text
  page.tsx(라우트) → 클라이언트 컴포넌트 → 서버 액션 → src/server(비즈니스 로직) → src/db(스키마·마이그레이션)
  ```
  이유 두 가지를 본문에 쓴다: 사용자가 일찍 화면을 손에 쥔다 / 실제 화면이 안쪽 설계를 끌어준다.
- **Phase 3 첫 Step은 `Step 0: 인수 시나리오 작성`이다.** spec.md의 Acceptance Scenarios를 검증 절차(입력·기대 결과)로 옮긴다. 자동 테스트 도구가 들어오기 전까지는 수동 검증 절차로 쓴다.
- 각 Step에 "Mocking 상태"를 한 줄 둔다(무엇이 가짜이고 무엇이 진짜인가). 화면을 고정 데이터로 먼저 띄웠다면, 마지막 Step에서 그 고정 데이터를 지우는 항목을 둔다.
- 한 Step이 끝나도 위 Step의 화면이 깨지지 않아야 한다.
- DB 변경이 있으면 마이그레이션 Step을 따로 두고, `_agent/rules/app.md`의 마이그레이션 순서를 따른다.
- 코드 없음 — 산문과 `text` 다이어그램으로만 쓴다.
- Verification 절은 `_agent/skills/verify`의 명령과 수동 검증 절차를 쓴다.

### Step 7: progress.md 단계 표시

`## 현재 단계`만 고친다. 본문은 구현 단계에서 채운다.

```markdown
## 현재 단계

<파일명> 작성 완료 — 리뷰 대기 중
```

### Step 8: 멈추고 리뷰 요청

다음 파일로 넘어가지 않는다.

```text
`<파일명>` 작성했어요. 리뷰 부탁드려요.
고칠 점이 있으면 말씀해 주시고, 괜찮으면 "다음"이라고 해 주세요.
```

사용자가 "다음"·"진행해"·`/fbpw-plan <feature>`라고 하면 Step 0부터 다시 시작한다.

### Step 9: 스펙 완료 시 progress.md 정리 (plan.md 리뷰 통과 후)

- 템플릿 섹션(Session·Phase 1~4·Test Results·Error Log·5-Question Reboot Check)은 지우지 않는다.
- `## 현재 단계` 같은 임시 표시는 지운다.
- `Session YYYY-MM-DD`에 날짜를 채우고, Phase 1·2의 작업 내역·생성/수정 파일을 실제로 채운다.
- Phase 3·4는 "아직 시작 안 함" 그대로 둔다.
- 5-Question Reboot Check를 이 기능에 맞게 채운다.
- `tasks.md`의 Phase 3 첫 항목이 `Step 0: 인수 시나리오 작성`인지 확인한다.

## 피드백을 받으면

1. 현재 파일을 고친다.
2. 피드백에서 얻은 통찰을 `findings.md`의 `## Learnings` 맨 아래에 바로 적는다. 형식: `### 제목 (YYYY-MM-DD)` + 짧은 산문.
   - Learnings는 통찰이다. "어느 파일을 어떻게 고쳤다"는 처리 기록은 커밋 메시지의 몫이다.
   - 사용자 결정이 필요한 것은 Issues Encountered에 둔다.
   - 새 섹션(Feedback Log 등)을 만들지 않는다.
3. progress.md `## 현재 단계`를 "리뷰 반영 완료 — 재리뷰 대기 중"으로 고친다.
4. 멈추고 재리뷰를 요청한다.

## 금지

- 한 번에 파일 두 개 이상 쓰기
- 리뷰 없이 다음 파일로 넘어가기
- Research 없이 spec.md 쓰기
- plan.md에 코드 쓰기
- spec.md에 UI 묘사·구현 세부사항 쓰기
- README·spec·plan·tasks에 외부 URL 넣기 (findings.md Resources에만)
- findings·progress의 새 항목을 위나 중간에 끼우기 (항상 맨 아래)
- `tasks.md`의 `## Current Phase`에 단계 여러 개 쓰기 (지금 진행 중인 하나만)
