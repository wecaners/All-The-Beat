# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-11: 활동명(필수)·인스타 핸들(필수, @ 제외)·주 활동 권역(필수, 다중)·한 줄 소개(50자)·프로필 이미지(없으면 카카오). 신청 → 승인 대기 → 운영자가 DM으로 6자리 코드 → 강사 입력 → 승인(강사 권한) / 반려(사유, 재신청). 승인 전 클래스 등록 불가. 같은 핸들의 대리 프로필이면 F-19 클레임 안내
- F-14: 승인 대기 목록(활동명·인스타 링크·신청일), 코드 발급 → 강사 입력 → "인증됨", [승인]/[반려+사유]
- F-10: 마이에 강사 신청 버튼(강사가 아니면) / 내 클래스 관리(강사면 → F-12)
- 04 IA: T-01 `/me/teacher/apply`, 로그인 필요, 탭바 숨김. 05 플로우 4·9
- 와이어프레임 T-01a(입력: 안내 "예약은 지금 쓰던 그대로", 필수 3 + 선택 1), T-01b(3단계, 코드 6칸, "보통 하루 안에"는 장담 못 함 → 원칙 6)

## Research Findings

### 코드베이스 구조

- `instructor_profiles`에 필요한 열이 다 있다: `userId`(unique, 대리면 NULL), `displayName`, `instagramHandle`(unique, 소문자·@ 없음), `bio`(≤50), `status`(`pending`·`verified`·`approved`·`rejected`·`suspended`), `isProxy`, `verifyCodeHash`·`verifyCodeExpiresAt`, `approvedAt`, `rejectedReason`. `instructor_regions`(강사 × 권역). 마이그레이션이 필요 없다
- 운영자 대리 등록 `createProxyInstructor`(`app/src/server/admin/instructors.ts`)는 `isProxy: true`, `status: "approved"`로 만든다. `instructorInput`(활동명 30자, 핸들 정규화·정규식, 권역 1개 이상)을 신청에도 쓸 수 있다
- `publiclyVisible`(`app/src/server/classes/index.ts`)은 `instructorProfiles.status = "approved"`를 본다 → 승인이 곧 공개 조건
- 운영 강사 목록·상세는 대리 강사 기준(게재 동의). 상세에 `ConsentForm`·미디어·스튜디오가 있다. 신청 상태·코드·승인은 없다
- 마이(`app/src/app/me/page.tsx`)는 내 추가요·앵콜·로그아웃·약관뿐. 강사 신청 입구가 없다
- `ChoiceChip`은 라디오 하나뿐이라 권역 여러 개 고르기에는 체크박스 모드가 필요하다
- 서버에서 해시는 `node:crypto`의 `createHash("sha256")`로 충분하다(코드 6자리, 24시간, 운영자가 손으로 DM)

### 기존 패턴

- 로그인 필요한 화면은 `<Suspense>` 안 `getCurrentUser()`, 없으면 안내 또는 `redirect`
- 서버 액션은 `{ ok, error }`, 첫 부분에서 로그인·입력 재검사. 운영 액션은 `requireAdmin()` + `parse`·`toState`
- 운영 화면의 한 번 누르는 버튼은 `ActionButton`(`confirm` 가능)

## Resources

### 문서

- F-11: `docs/03-기능명세서.md` "F-11. 강사 신청", F-14: "F-14. 운영자: 강사 승인", F-19: `docs/03-기능명세서.md:517`
- T-01: `docs/04-IA.md:168`, 플로우 4: `docs/05-유저플로우.md:151`, 플로우 9: `docs/05-유저플로우.md:345`
- 와이어프레임: `wireframes/index.html:1411`(T-01a), `wireframes/index.html:1455`(T-01b)

### 코드 참조

- 강사 스키마: `app/src/db/schema/users.ts` (`instructorProfiles`, `instructorRegions`), 상태 enum: `app/src/db/schema/enums.ts:8`
- 운영 강사: `app/src/server/admin/instructors.ts`, 상세 화면: `app/src/app/admin/instructors/[id]/page.tsx`
- 공개 조건: `app/src/server/classes/index.ts:23`

### API 엔드포인트

- 페이지 `GET /me/teacher/apply` (로그인)
- 서버 액션(로그인): `applyInstructorAction`(신청·재신청), `verifyInstructorCodeAction`(코드 입력)
- 서버 액션(운영자): `issueVerifyCodeAction`, `approveInstructorAction`, `rejectInstructorAction`

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 신청은 `instructor_profiles`에 `userId`·`isProxy: false`·`status: pending`으로 한 행. 사용자당 하나(`userId` unique) | 스키마가 이미 그렇게 설계돼 있다(09 ERD). 신청 테이블을 따로 두지 않는다 |
| 같은 핸들이 이미 있으면(대리 포함) 신청을 받지 않고 알린다. 대리 프로필이면 "운영자가 대신 등록해 둔 계정"이라고만 | 핸들이 unique. F-19 클레임이 없는데 연결을 약속하지 않는다(원칙 6) |
| 반려된 신청은 같은 행을 고쳐 다시 `pending`으로. 대기·확인됨·승인 상태에선 고칠 수 없다 | 재신청(F-11). 승인 뒤 프로필 수정은 F-12·F-21의 몫 |
| 코드는 6자리 숫자, `sha256(instructorId:code)` 해시와 24시간 만료만 저장. 발급 결과(원문)는 운영자 화면에 한 번만 보여준다 | 스키마 주석 "원문 저장 안 함". 운영자가 DM으로 옮겨 적는다 |
| 코드가 맞으면 `status: verified`. 틀리면 횟수 제한 없이 다시 입력(운영자가 손으로 보내므로 무차별 대입 우려가 작다), 만료면 그렇다고 알린다 | 05 플로우 4. 재발급은 운영자만 |
| 승인은 `verified` 전에도 할 수 있다. 목록·상세에 확인 여부를 표시만 | README. 운영자 판단(DM으로 이미 확인했을 수 있다) |
| 승인하면 `approved` + `approvedAt`, 반려하면 `rejected` + 사유. `suspended`는 쓰지 않는다 | F-14. 정지는 F-17 운영과 함께 |
| 마이: 강사 프로필이 없으면 "강사 신청" 배너, 있으면 상태 한 줄(대기·확인됨·승인·반려) → 신청 화면이 상태 화면이 된다 | F-10 "강사 신청 버튼 / 내 클래스 관리". 내 클래스(F-12)는 없어 승인됐다는 것까지만 |
| 신청 화면은 탭바 없음, 상단에 마이로 돌아가는 길 | 04 IA 입력 화면 규칙 |
| `ChoiceChip`에 체크박스 모드(`multiple`)를 더한다 | 권역 여러 개(F-11). 부품 하나로 라디오·체크박스 |
| 인스타 핸들 정규화·검증은 운영자 `instructorInput`을 그대로 쓰고, 한 줄 소개만 더한다 | 같은 규칙으로 저장해야 unique 비교가 맞는다 |

## Issues Encountered

(없음)

## Learnings

### 두 모듈이 서로 필요하면 공통 조각은 한쪽에 두고 재수출한다 (2026-11-03)

강사 쪽(`src/server/instructors`)이 운영자 입력 스키마를 쓰고, 운영자 쪽이 코드 해시를 쓰면 서로 import하게 된다. 해시 함수를 운영자 모듈에 두고 강사 쪽이 가져오게 해서 한 방향으로 만들었다. 같은 층 안이라도 순환은 피한다.

### 미리보기 페이지가 내는 경고와 기능의 경고를 구분한다 (2026-11-03)

임시 미리보기가 `searchParams`를 Suspense 밖에서 읽어 경고가 났다. 기능 코드의 문제가 아니라 미리보기 자체의 문제라 기록만 하고 넘어갔다. 미리보기는 커밋하지 않으니 Cache Components 규칙을 지키지 않아도 되지만, 로그를 볼 때 출처를 먼저 본다.
