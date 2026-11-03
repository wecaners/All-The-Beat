# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. README 작성. 동의 시점은 와이어프레임(로그인 전 체크)과 플로우·아키텍처(첫 로그인 뒤)가 달라 뒤쪽을 택함. 약관 문서는 초안, 책임자·연락처는 빈칸. 사용자 지시("리뷰 스킵")로 이후 리뷰 생략
2. 콜백·프로필·로그인 시작·추가요·앵콜 액션·예약 클릭 쿠키 조사 → findings.md, spec 작성

**생성/수정 파일**:

- `specs/terms-consent/README.md`, `spec.md`, `findings.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md(동의·약관 화면 → 동의 서버·콜백·액션 검사 → 마무리), tasks.md 인수 체크리스트

**생성/수정 파일**:

- `specs/terms-consent/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `src/server/consent`: 동의 여부(필수 둘 모두), 동의 저장(시각은 서버, 처음 시각 유지, 선택은 고른 때만, 탈퇴 프로필 제외). `src/lib/consent-path`
2. `/welcome`: 로그인·동의 확인 뒤 카드(전체 동의, 필수 2·선택 1, 보기 링크, 필수 전엔 버튼 잠김), 저장 액션은 필수 둘 검사 → 저장 → `safeNextPath`로 이동
3. 로그인 콜백: 동의 전이면 `/welcome?next=`로. 추가요·앵콜 저장 액션: 동의 전이면 `consentRequired`, 패널이 동의 화면으로 보냄(돌아올 곳은 지금 화면 + 시트 자동 열기)
4. `/terms`·`/privacy` 초안(`LegalDoc`, 초안 표시, 빈칸 `Blank`), 마이 로그인 전·후 약관 링크
5. docs/03 F-09 구현 메모, design.md `LegalDoc`

**생성/수정 파일**:

- 새로: `app/src/server/consent/index.ts`, `app/src/lib/consent-path.ts`, `app/src/app/welcome/page.tsx`, `consent-form.tsx`, `actions.ts`, `app/src/app/terms/page.tsx`, `app/src/app/privacy/page.tsx`, `app/src/components/legal-doc.tsx`
- 수정: `app/src/app/auth/callback/route.ts`, `app/src/app/song/[slug]/actions.ts`, `request-panel.tsx`, `app/src/app/class/[id]/actions.ts`, `encore-panel.tsx`, `app/src/app/me/page.tsx`, `docs/03-기능명세서.md`, `_agent/rules/design.md`

### Phase 4: Testing 🔄

**작업 내역**:

1. 동의 규칙 7개를 되돌리는 트랜잭션 안 가짜 사용자로 확인, 남은 테스트 사용자 0
2. 비로그인 `/terms`·`/privacy`·마이 약관 링크, 비로그인 `/welcome` → 홈, 동의 카드 모양·전체 동의·필수 해제 시 버튼 잠김(임시 미리보기, 커밋 안 함) 375px 확인, 가로 넘침·서버 오류 없음

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 새 프로필 | 동의 전 | 동의 아님 | 같음 | ✅ |
| 필수 저장 | marketing false | 동의함, 선택 비어 있음 | 같음 | ✅ |
| 다시 저장 | marketing true | 처음 시각 유지, 선택 기록 | 같음 | ✅ |
| 한쪽만 | terms만 | 동의 아님 | 같음 | ✅ |
| 탈퇴 프로필 | 저장 | 안 바뀜 | 같음 | ✅ |
| 동의 폼 | 전체 동의 / 필수 해제 | 버튼 열림 / 잠김 | 같음 | ✅ |
| 첫 로그인 → 동의 → 복귀 → 시트 | 카카오 로그인 | — | 미확인 | ⏸️ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 클라이언트 패널이 `@/server/consent`를 import | 1 | 주소 도우미를 `src/lib/consent-path`로 옮김 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 — 로그인이 필요한 확인만 남음 |
| 2. 어디로 가는가? | 사용자가 동의 시각이 빈 계정으로 로그인해 동의 → 복귀 → 시트, 동의 전 추가요 저장 → 동의 화면 확인 |
| 3. 목표는? | 첫 로그인에 약관 동의를 한 번 받고, 동의 전에는 요청을 막고, 누구나 약관을 본다 |
| 4. 지금까지 배운 것은? | findings.md Learnings 참조 |
| 5. 무엇을 했는가? | Phase 3 완료, 규칙 7개·화면 확인 |
