# Implementation Plan: 회원 탈퇴

## Summary

마이에 탈퇴 버튼과 확인 시트를 붙이고, 서버 액션이 `src/server/account`의 `withdraw(userId)`를 부른다. `withdraw`는 한 트랜잭션에서 강사 클래스를 숨기고 `auth.users` 행을 지운 뒤(나머지는 FK cascade), 카카오 연결 끊기를 요청한다. 탈퇴 뒤 `/bye`에서 안내한다. 스키마는 바꾸지 않는다.

## Requirements

1. 마이 탈퇴 입구·확인 시트 (FR-1, FR-4 화면)
2. 탈퇴 처리: 계정·정보 삭제, 강사 클래스 숨김, 운영자 막기, 본인만 (FR-2~5)
3. 카카오 연결 끊기 (FR-6), 로그아웃·안내 화면 (FR-7)
4. 개인정보처리방침 (FR-8)

## Critical Files

### New Files

- `app/src/app/me/withdraw-button.tsx` — 탈퇴 버튼 + 확인 시트(클라이언트)
- `app/src/app/bye/page.tsx` — 탈퇴 뒤 안내
- `app/src/server/account/index.ts` — `withdraw(userId)`, 카카오 연결 끊기

### Modified Files

- `app/src/app/me/page.tsx` — 로그아웃 옆에 탈퇴 버튼
- `app/src/app/me/actions.ts` — `withdrawAction`
- `app/src/app/privacy/page.tsx` — 쿠키·보관·내 정보 항목
- `app/.env.local.example`, `_agent/rules/tech-stack.md` — `KAKAO_ADMIN_KEY`
- `docs/03-기능명세서.md` (F-09·F-10 메모), `docs/09-ERD.md` (7절), `specs/my-page/findings.md` (Issues 1 결과), `specs/README.md`

### Reference Files

- `app/src/app/song/[slug]/request-panel.tsx`(확인 시트), `app/src/server/places`(카카오 REST 호출), `app/src/server/admin/shared.ts`(`isAdmin`)

## Architecture

### User Flow

```text
/me (로그인)
  … 내 추가요 · 내 앵콜 …
  [로그아웃]  [탈퇴하기]
       └→ 시트 "정말 탈퇴할까요?"
            지워져요: 회원 정보 · 추가요 N건 · 앵콜 M건 · 카카오 연결
            (강사면) 내 클래스는 수강생에게 안 보이게 돼요
            되돌릴 수 없어요
            [그대로 둘게요] [탈퇴할게요]
            (운영자면) "운영자 계정은 탈퇴할 수 없어요" + [닫기]
       → /bye "탈퇴했어요" [홈으로]
```

### Event Flow

```text
1. withdrawAction()
   getCurrentUser() 없으면 { ok:false }
2. withdraw(user.id)
   트랜잭션:
     profiles.role = admin → WithdrawError("운영자 계정은 탈퇴할 수 없어요")
     kakaoId = auth.identities(provider kakao).provider_id
     classes.is_hidden = true  where instructor_id ∈ 내 강사 프로필
     instructor_profiles.status = suspended  where user_id = 나
     delete auth.users where id = 나
       → cascade: profiles → requests, encores, user_visits
       → set null: events.user_id, songs.created_by, instructor_profiles.user_id
   커밋 뒤:
     unlinkKakao(kakaoId)  키 없음·실패 → console.error(회원번호, 상태)
3. supabase.auth.signOut({ scope: "local" })  이 기기 쿠키 삭제
4. redirect("/bye")
```

### Domain Model

```text
src/server/account
├── withdraw(userId): Promise<void>      WithdrawError(사용자에게 보여줄 문구)
└── unlinkKakao(kakaoId): Promise<boolean>   KAKAO_ADMIN_KEY, kapi.kakao.com/v1/user/unlink
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 확인 시트 문구와 버튼 배치가 먼저 정해진다
- 실제 화면이 안쪽 설계를 끌어준다. 시트에 보여줄 숫자(추가요·앵콜 수, 강사·운영자 여부)가 마이 페이지가 넘겨줄 값을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오 1~10을 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 탈퇴 버튼·확인 시트·안내 화면

`withdraw-button.tsx`(수·강사·운영자 여부를 받아 시트를 그림), `/bye`. 액션은 아직 `{ ok: false, error: "준비 중" }`.

Mocking 상태: `withdrawAction`이 가짜. 화면은 진짜.

### Step 2: 서버 탈퇴 처리

`src/server/account`의 `withdraw`·`unlinkKakao`, `withdrawAction`(로그인 확인 → withdraw → 로컬 로그아웃 → `/bye`). 가짜 액션을 지운다.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인. 카카오 연결 끊기는 키가 없으면 건너뛰는 경로만 확인.

### Step 3: 개인정보처리방침·환경변수·문서

방침 쿠키(`ab_visit`)·보관(접속 날짜, 탈퇴 시 삭제 범위)·내 정보(마이에서 탈퇴), `.env.local.example`·`tech-stack.md`에 `KAKAO_ADMIN_KEY`, docs/03·09, `specs/my-page` Issues 1, `specs/README.md`.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

되돌리는 트랜잭션 안에서 가짜 사용자(추가요 2·앵콜 1·클릭 1·접속 기록·만든 곡), 가짜 강사 사용자(공개 클래스), 운영자로 `withdraw`를 부른다. 지워진 행·NULL이 된 칸·숨김·정지·운영자 거절·없는 사용자를 확인하고, 끝난 뒤 남은 행이 없는지 본다.

### Manual Test

1. 로그인 상태 화면은 Claude가 볼 수 없어 임시 페이지(커밋 안 함)에 시트를 가짜 값으로 띄워 모양을 보고 지운다
2. `/bye`와 `/privacy`를 브라우저로 본다
3. 실제 탈퇴(로그인 → 탈퇴 → 다시 로그인)와 카카오 연결 끊기는 사용자 확인. 실제 계정이 지워지므로 테스트용 카카오 계정으로 한다

## Considerations

### 기존 코드 재사용

`BottomSheet`, `StickerButton`, `getCurrentUser`, `isAdmin` 판단(`role`), 마이가 이미 읽는 `listMyRequests`·`listMyEncores`·`getMyInstructor`·`getProfile`.

### 호환성

- 스키마 변경 없음. `profiles.deleted_at`은 남겨 두되 쓰지 않는다(ERD 7절에 적는다)
- 탈퇴한 사용자의 다른 기기 토큰은 만료 전까지 남는다(findings Issues 1)
- `KAKAO_ADMIN_KEY`가 없어도 탈퇴는 된다. 운영 배포 전에 Vercel에 Secret으로 넣는다
