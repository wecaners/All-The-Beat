# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-09: 회원 탈퇴는 마이페이지 → 탈퇴. 추가요는 삭제(집계에서 빠짐). 강사면 등록한 클래스는 비공개 처리 후 30일 뒤 삭제
- F-10: 마이에 로그아웃·회원 탈퇴·약관 보기
- ERD 7절: `profiles.deleted_at` 기록, 닉네임 익명화, 추가요·앵콜 삭제, 강사 클래스 `is_hidden=true` 후 30일 뒤 삭제
- 카카오 로그인 공통 문서: "서비스는 반드시 탈퇴 과정에 연결 해제 요청을 포함"해야 하고, 탈퇴 시 사용자 정보를 복구할 수 없게 파기해야 한다
- design.md: 되돌리기 어려운 행동은 시트로 한 번 더 묻는다. 밑줄 링크 대신 스티커 버튼

## Research Findings

### 코드베이스 구조

- `profiles.id` → `auth.users.id` (cascade). `profiles`를 참조하는 FK: `requests`·`encores`·`user_visits`는 cascade, `events.user_id`·`songs.created_by`·`instructor_profiles.user_id`는 set null (dev DB `pg_constraint`로 확인)
- `auth.users`를 참조하는 FK는 `identities`·`sessions`·`mfa_*`·`one_time_tokens` 등 전부 cascade, `scim_users`만 set null. Drizzle 연결 역할(`postgres`)은 `auth.users` DELETE 권한이 있다
- 카카오 회원번호: `auth.identities`(provider `kakao`)의 `provider_id`. dev DB 1건, 숫자 문자열
- `deleted_at`은 `isAdmin`·`hasConsented`·`upsertProfileOnLogin`·운영자 지표가 읽지만, 쓰는 곳은 없다
- 강사 공개 조건: `not is_hidden and status = 'approved' and (not is_proxy or consent_at is not null)`. 강사 `user_id`가 NULL이 돼도 승인 상태면 클래스가 계속 공개된다 → 탈퇴 때 따로 숨겨야 한다
- 로그아웃은 `signOutAction`(`supabase.auth.signOut()` → `/`). 마이(`/me`)는 로그아웃 버튼과 약관 링크를 그린다
- 확인 시트 패턴: 곡 상세 추가요 취소(`BottomSheet` + `StickerButton` white "그대로 둘게요" / soft "취소할게요", `useTransition`)
- 환경변수: 카카오 키는 `NEXT_PUBLIC_KAKAO_JS_KEY`(지도), `KAKAO_REST_API_KEY`(로컬 API)만 있다. 연결 끊기에는 어드민 키가 필요하다
- 개인정보처리방침(`/privacy`)은 탈퇴를 "연락처로 요청"하라고 하고, 쿠키에 `ab_sid`만 적혀 있다. F-18이 추가한 `ab_visit` 쿠키와 사용자별 접속 날짜(`user_visits`)는 빠져 있고, "접속 기록은 누구인지 알 수 없는 형태"라는 문구와도 맞지 않는다

### 기존 패턴

- 서버 액션: 첫 줄 `getCurrentUser()` → `src/server` 함수 → 결과 `{ ok, error }` 또는 `redirect`
- 상태가 여러 테이블에 걸치면 한 트랜잭션(`app.md`)
- 외부 API 호출은 `src/server`에서 `fetch` (카카오 로컬 검색 `src/server/places`)

## Resources

### 문서

- F-09·F-10: `docs/03-기능명세서.md` "F-09", "F-10"
- 삭제 규칙: `docs/09-ERD.md` 7절
- 탈퇴를 미룬 이유: `specs/my-page/findings.md` Issues 1
- 카카오 연결 해제 필수: https://developers.kakao.com/docs/ko/kakaologin/common (연결 해제)
- 카카오 연결 끊기 API(어드민 키): https://developers.kakao.com/docs/ko/kakaologin/rest-api — `POST https://kapi.kakao.com/v1/user/unlink`, `Authorization: KakaoAK {ADMIN_KEY}`, 본문 `target_id_type=user_id&target_id={회원번호}`

### 코드 참조

- 마이: `app/src/app/me/page.tsx`, 로그아웃: `app/src/app/me/actions.ts`
- 확인 시트: `app/src/app/song/[slug]/request-panel.tsx:146`
- 프로필: `app/src/server/profiles/index.ts`, 운영자 확인: `app/src/server/admin/shared.ts:10`
- 강사 공개 조건: `app/src/server/admin/classes.ts` `isPublicSql`
- 개인정보처리방침: `app/src/app/privacy/page.tsx`

### API 엔드포인트

- 서버 액션: `withdrawAction()` (로그인 사용자)
- 페이지: `GET /bye` (탈퇴 뒤 안내)
- 외부: 카카오 연결 끊기 (서버 → kapi.kakao.com)

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 탈퇴는 `auth.users` 행 삭제로 한다. `profiles`와 추가요·앵콜·접속 날짜는 cascade로 지워지고, 클릭·곡의 사용자 칸은 NULL이 된다. `deleted_at` 소프트 삭제(ERD 7절)는 쓰지 않는다 | 남길 이유가 없고, 소프트 삭제면 같은 카카오 계정으로 다시 로그인할 때 익명화된 프로필로 들어간다. 카카오 문서도 복구 불가 파기를 요구한다 |
| Supabase 관리자 API 대신 Drizzle 트랜잭션 안에서 `delete from auth.users` | 강사 클래스 숨기기와 계정 삭제가 한 트랜잭션에서 같이 되거나 같이 안 된다. 서버 전용 관리자 키(`sb_secret_`)를 새로 들일 필요가 없다. 연결 역할에 권한이 있고 관련 FK가 전부 cascade인 것을 확인했다 |
| 강사면 같은 트랜잭션에서 그 강사의 클래스 `is_hidden = true`, 강사 `status = 'suspended'` | `user_id`가 NULL이 돼도 승인 상태면 공개가 유지된다. 30일 뒤 삭제는 예약 작업이 없어 이번에 안 한다 |
| 운영자(`role = 'admin'`)는 탈퇴를 막는다 | 하나뿐인 운영자 계정을 실수로 잃지 않게 |
| 카카오 연결 끊기는 DB 삭제가 끝난 뒤 어드민 키로. 실패해도 탈퇴는 그대로 두고 `console.error`에 회원번호를 남긴다 | 사용자가 떠나려는 것을 외부 API 실패로 막지 않는다. 운영자가 카카오 콘솔에서 따로 끊으려면 회원번호가 필요하다(닉네임·이메일은 남기지 않는다) |
| 새 서버 전용 환경변수 `KAKAO_ADMIN_KEY`. 없으면 연결 끊기를 건너뛰고 로그를 남긴다 | 키를 넣기 전에도 로컬에서 탈퇴를 시험할 수 있다 |
| 탈퇴 뒤 이 기기 쿠키는 `signOut({ scope: "local" })`로 지우고 `/bye`로 보낸다 | 서버 세션은 이미 지워져 네트워크 로그아웃이 실패할 수 있다. 안내는 화면 하나로 두는 편이 쿼리 파라미터·토스트보다 단순하다 |

## Issues Encountered

### 1. 다른 기기의 로그인 토큰

**문제**:

탈퇴해도 다른 기기에 남은 액세스 토큰은 만료(기본 1시간) 전까지 서명 검증을 통과한다.

**원인**:

서버는 `getClaims()`로 서명만 확인하고, 세션 행을 매번 조회하지 않는다.

**해결**:

이번에는 받아들인다. 그 사이 추가요·앵콜을 하려 해도 프로필을 만들 수 없어(FK) 저장되지 않고, 접속 기록도 프로필이 없어 남지 않는다.

**결과**:

보류 (영향 작음)

## Learnings

### 소프트 삭제가 재가입을 막는다 (2026-11-03)

ERD는 탈퇴를 `deleted_at` + 익명화로 설계했지만, 로그인 계정(`auth.users`)이 남으면 같은 카카오 계정으로 다시 로그인할 때 같은 id로 돌아와 익명화된 프로필에 갇힌다. 탈퇴를 설계할 때는 "다시 오면 어떻게 되는가"를 같이 봐야 한다.
