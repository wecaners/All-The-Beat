# Implementation Plan: 약관 동의

## Summary

`src/server/consent`에 동의 여부 읽기·저장을 두고, 로그인 콜백이 동의 전 사용자를 `/welcome?next=`로 보낸다. 추가요·앵콜 액션은 동의 전이면 `consentRequired`를 돌려주고 패널이 동의 화면으로 보낸다. `/terms`·`/privacy`는 정적 문서 화면이고 마이와 동의 화면에서 링크한다. 스키마는 바꾸지 않는다.

## Requirements

1. 콜백 게이트·동의 화면·저장 (FR-1~4)
2. 추가요·앵콜 저장 전 동의 확인 (FR-5~6)
3. 약관·개인정보처리방침 화면과 링크 (FR-7~9)

## Critical Files

### New Files

- `app/src/server/consent/index.ts` — 동의 여부, 동의 저장
- `app/src/app/welcome/page.tsx`, `consent-form.tsx`, `actions.ts` — 동의 화면·폼·저장 액션
- `app/src/app/terms/page.tsx`, `app/src/app/privacy/page.tsx` — 약관·개인정보처리방침
- `app/src/app/legal-layout.tsx`(또는 공용 부품) — 문서 화면 틀

### Modified Files

- `app/src/app/auth/callback/route.ts` — 동의 전이면 `/welcome?next=`
- `app/src/app/song/[slug]/actions.ts`, `request-panel.tsx` — 동의 확인·이동
- `app/src/app/class/[id]/actions.ts`, `encore-panel.tsx` — 같음
- `app/src/app/me/page.tsx`, `login-card.tsx` — 약관 링크
- `docs/03-기능명세서.md` — F-09 구현 메모

### Reference Files

- `app/src/lib/safe-next.ts`, `app/src/server/profiles/index.ts`
- `wireframes/index.html` U-09a 동의 시트

## Architecture

### User Flow

```text
[추가요!] 비로그인 → 로그인 시트 → 카카오 → /auth/callback?next=/song/x?request=open
   동의 전 → 302 /welcome?next=/song/x?request=open
       [전체 동의] [필수] 이용약관 보기 [필수] 개인정보 보기 [선택] 소식 받기
       [동의하고 시작하기] → 저장 → 302 /song/x?request=open → 추가요 시트 자동
   동의함 → 302 /song/x?request=open

동의 전 사용자가 추가요·앵콜 저장 → consentRequired → /welcome?next=<지금 화면>?request=open

마이 · 동의 화면 → /terms, /privacy (로그인 불필요)
```

### Domain Model

```text
hasConsented(userId) = terms_agreed_at IS NOT NULL AND privacy_agreed_at IS NOT NULL
saveConsent(userId, { marketing })  (필수 둘은 액션에서 체크 확인 뒤 호출)
  update profiles set terms_agreed_at = coalesce(terms_agreed_at, now()),
                      privacy_agreed_at = coalesce(privacy_agreed_at, now()),
                      marketing_agreed_at = case when marketing then coalesce(marketing_agreed_at, now()) else marketing_agreed_at end
  where id = userId and deleted_at is null
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 동의 화면과 약관 화면부터 만든다
- 실제 화면이 안쪽 설계를 끌어준다. 동의 폼이 보내는 값이 서버 액션 입력을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 동의 화면·약관 화면

`/welcome`: 스크랩북 카드 하나(제목·안내·체크 셋·전체 동의·시작 버튼·약관 링크), `<Suspense>` 안에서 로그인·동의 확인. `/terms`·`/privacy`: 로고 머리 + 문서 본문(초안 표시). 마이 링크.

Mocking 상태: Step 2와 바로 이어 진행해 고정 데이터를 커밋하지 않는다.

### Step 2: 동의 서버·콜백·액션 검사

`src/server/consent`, 동의 저장 액션(필수 둘 검사 → 저장 → `safeNextPath`로 redirect), 콜백 게이트, 추가요·앵콜 액션의 `consentRequired`와 패널의 이동.

Mocking 상태: 없음 (dev DB). 저장·게이트 규칙은 되돌리는 트랜잭션 안 가짜 사용자로 확인. 실제 로그인 흐름은 사용자 확인.

### Step 3: 마무리

docs/03 F-09 구현 메모, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

`hasConsented`·`saveConsent`와 추가요·앵콜 액션의 동의 검사를 되돌리는 트랜잭션 안에서 확인한다(specs/encore findings Learnings 방식).

### Manual Test

1. `/terms`·`/privacy` 비로그인 375px, 마이 링크
2. `/welcome` 모양은 가짜 로그인 상태 미리보기(커밋 안 함)
3. 실제 첫 로그인 → 동의 → 복귀 → 시트 자동 열기는 사용자 확인 (새 카카오 계정 또는 동의 시각을 비운 계정)

## Considerations

### 기존 코드 재사용

`safeNextPath`, `getCurrentUser`, `BottomSheet` 대신 같은 모양의 카드, `StickerButton`, `Logo`.

### 호환성

이 기능 전에 로그인한 사용자는 동의 시각이 비어 있다. 다음 로그인이나 요청 저장 때 한 번 동의 화면을 본다. 스키마 변경 없음.
