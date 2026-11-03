# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-19: 강사 신청(F-11) 때 넣은 인스타 핸들이 미연결 대리 프로필과 같으면 "이미 올빗에 등록된 클래스가 있어요. 내 계정으로 가져올까요?" 안내. 인증 코드 확인 뒤 대리 프로필과 클래스가 강사 계정으로 이전
- 05 플로우 9: 같은 핸들의 대리 프로필 → 안내 → 인증 코드 DM(플로우 4와 같은 방식) → 성공하면 대리 프로필을 내 계정에 연결, 클래스 소유권 이전, 강사 자동 승인 → 내 클래스. 상태도: 대리미연결 → 승인 (클레임 인증 성공)
- 09 ERD: `instructor_profiles.user_id`는 대리(미연결)면 NULL, 클레임 시 채움
- 와이어프레임 T-01 메모: 신청 뒤 "이미 올빗에 등록된 클래스가 N개 있어요 · 내 계정으로 가져오기"

## Research Findings

### 코드베이스 구조

- `instructor_profiles`: `user_id`(unique, NULL 허용), `instagram_handle`(unique), `is_proxy`, `status`, `consent_at`, `verify_code_hash`·`verify_code_expires_at`(직접 신청 강사용). 대리 강사는 `is_proxy = true`, `status = approved`로 만들어진다
- 클래스·연습실·사진은 모두 `instructor_id`로 강사 프로필에 묶여 있다. 프로필의 `user_id`만 채우면 소유가 넘어간다
- 공개 조건: `not is_hidden and status = 'approved' and (not is_proxy or consent_at is not null)`. 동의 없는 대리 강사의 클래스는 숨어 있다가 `is_proxy = false`가 되면 공개된다
- 게재 동의(`recordConsent`)는 공개되는 순간 다가오는 클래스의 곡들의 대기 추가요를 `openRequestsForClass`로 연다. 클레임으로 공개될 때도 같은 처리가 필요하다
- 강사 신청(`applyInstructor`)은 핸들 unique 위반이면 대리 계정인지 보고 "가져오는 기능은 아직 없어요"로 막는다
- 코드: `issueVerifyCode`는 `is_proxy = false and status = 'pending'`에만 발급. `hashVerifyCode(instructorId, code)`, 24시간
- 내 클래스(`/me/classes`)는 `user_id = 나`이고 승인된 강사면 쓴다(specs/instructor-classes)
- 강사 사진·소개는 대리 강사면 `media_consent`가 있어야 보인다(specs/instructor-studio). 직접 강사(`is_proxy = false`)는 그대로 보인다
- 회원 탈퇴는 `profiles`를 지우며 FK가 정리한다(specs/account-withdrawal)

### 기존 패턴

- 강사 쪽 오류는 `InstructorError`(문구 그대로 보여줌), 운영 쪽은 `AdminInputError`
- 신청 화면은 상태에 따라 폼 또는 단계 보기(`StatusView`, 코드 입력 `CodeForm`)
- 운영 홈은 할 일이 있으면 노란 배너(검수 대기 곡, 앵콜 응답 대기)

## Resources

### 문서

- F-19: `docs/03-기능명세서.md` "F-19"
- 플로우 9·상태도: `docs/05-유저플로우.md:347`, `:495`
- ERD `instructor_profiles`: `docs/09-ERD.md:185`

### 코드 참조

- 강사 신청·코드 확인: `app/src/server/instructors/index.ts`
- 대리 강사·동의·코드 발급: `app/src/server/admin/instructors.ts:103`, `:127`, `:168`
- 신청 화면: `app/src/app/me/teacher/apply/`
- 운영 강사 상세: `app/src/app/admin/instructors/[id]/page.tsx`

### API 엔드포인트

- 서버 액션(로그인 사용자): `requestClaimAction(handle)`, `verifyClaimCodeAction(code)`, `cancelClaimAction()`
- 서버 액션(운영자): 기존 `issueVerifyCodeAction`(가져오기 신청에도 발급), `cancelClaimByAdminAction(instructorId)`

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| `instructor_profiles`에 `claim_user_id`(FK → profiles, unique, 탈퇴 시 NULL)와 `claim_requested_at`을 더한다. 코드는 기존 `verify_code_*` 칸을 쓴다 | 신청 테이블을 따로 두지 않는다. 대리 강사는 직접 신청 코드를 쓰지 않아 칸이 겹치지 않는다. 한 사람은 한 번에 한 대리 강사만 가져오기 신청 |
| 코드 확인 전에는 `user_id`를 채우지 않는다 | 본인 확인 전에 클래스를 넘기면 남의 클래스를 가로챌 수 있다 |
| 같은 대리 강사에 새 가져오기 신청이 오면 앞 신청과 코드를 지우고 바꾼다 | 먼저 신청한 사람이 붙잡고 있으면 진짜 주인이 막힌다. 코드는 그 인스타 계정에만 가므로 바꿔치기로 이전할 수는 없다 |
| 코드가 맞으면 운영자 승인 없이 이전: `user_id = 나`, `is_proxy = false`, 신청·코드 칸 비움. `status`는 approved 그대로 | 05 플로우 9 "강사 자동 승인". 운영자가 그 인스타 계정으로 코드를 보내는 것이 본인 확인이다 |
| 이전으로 새로 공개되는 경우(동의 없던 대리 강사) 다가오는 클래스의 곡들의 대기 추가요를 연다. `recordConsent`의 같은 처리를 함수로 빼서 같이 쓴다 | 공개되는 순간 추가요를 연다는 기존 규칙(F-07, 동의 기록) |
| 가져오기 신청은 강사 프로필이 없거나 반려된 사람만. 이전할 때 반려된 내 프로필은 지운다 | `user_id`가 unique라 프로필 둘을 가질 수 없다. 반려된 프로필은 클래스가 없다 |
| 강사 신청에서 핸들이 미연결 대리 강사와 같으면 오류 대신 "가져오기" 제안을 돌려준다. 이미 연결된 대리(또는 직접 강사)면 지금처럼 막는다 | F-19 진입점(05 플로우 9). 연결된 프로필은 가져올 대상이 아니다 |
| 운영자는 가져오기 신청이 있는 대리 강사에 코드를 발급하고, 신청을 취소할 수 있다. 운영 홈에 신청 건수 배너 | 플로우 4와 같은 손 DM 방식. 할 일이 눈에 띄게 |

## Issues Encountered

### 1. 단일 테이블 select에서 하위 쿼리 칸이 엉뚱한 테이블로 풀린다

**문제**:

가져올 클래스 수가 2가 아니라 1로 나왔다.

**원인**:

drizzle은 조인 없는 select에서 칸 이름에 테이블을 붙이지 않는다. `(select count(*) from classes where ${classes.instructorId} = ${instructorProfiles.id})`가 `"instructor_id" = "id"`가 되어 `"id"`가 하위 쿼리의 `classes.id`로 풀렸다.

**해결**:

하위 쿼리에 별칭을 주고 바깥 테이블 이름을 직접 쓴다(`from classes c where c.instructor_id = "instructor_profiles".id`).

**결과**:

해결됨. 같은 패턴이 운영 홈 강사 목록의 클래스 수(`app/src/server/admin/instructors.ts` `listInstructorsForAdmin`)에도 있어 dev DB에서 모든 강사가 1개로 보였다(실제 1·1·4·4·3·3). 사용자 지시("고쳐줘")로 같은 방식으로 고쳤다. 나머지 상관 하위 쿼리는 조인이 있는 select라 테이블 이름이 붙는다

## Learnings

### 소유는 칸 하나로 옮긴다 (2026-11-03)

클래스·연습실·사진이 모두 강사 프로필 id에 묶여 있고 사용자와는 프로필의 `user_id` 하나로만 이어져서, 클레임은 데이터를 복사하지 않고 그 칸을 채우는 것으로 끝난다. 처음 ERD에서 "대리 등록이면 NULL, 클레임 시 채움"으로 정해 둔 덕분이다.

### 하위 쿼리는 바깥 칸을 이름으로 쓴다 (2026-11-03)

drizzle의 `sql` 안에 컬럼 객체를 넣으면 조인이 있을 때만 `"테이블"."칸"`으로 나온다. 조인이 없으면 `"칸"`만 나와 상관 하위 쿼리에서 안쪽 테이블의 같은 이름 칸으로 풀린다. 이름이 겹치지 않으면 우연히 맞아서 테스트에서 잘 드러나지 않는다. 상관 하위 쿼리는 별칭과 바깥 테이블 이름을 직접 쓴다.

