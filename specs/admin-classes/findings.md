# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-17: 전체 클래스 목록(상태·강사·곡·권역 필터), 숨김(신고·오류), 예약 링크 수정, 강제 마감/종료
- F-12 상태표: 모집중·마감 임박·마감·종료(자동)·취소(사유). 04 IA: A-05 클래스 관리(`/admin/*`, noindex)

## Research Findings

### 코드베이스 구조

- `classes.isHidden`(운영자 숨김, 상태와 별개), `cancelReason`, `status`(`open`·`closing_soon`·`closed`·`ended`·`canceled`)가 있다. `publiclyVisible`이 `isHidden = false`를 본다 → 숨기면 수강생 화면에서 바로 사라진다
- `listUpcomingClassesForAdmin`(다가오는 30개, 공개 여부·앵콜 여부)과 `setClassClosed`(마감·풀기)가 있다. 전체 목록·상세·숨김·링크 수정·종료·취소는 없다
- 강사 쪽 `cancelMyClass`·`setMyClassStatus`(specs/instructor-classes)는 소유 확인이 붙어 있어 운영자가 그대로 쓸 수 없다. 운영자용은 소유 없이 같은 규칙
- `guessBookingType(url)`과 `classInput`의 `bookingUrl` 검증(http(s))을 링크 수정에 다시 쓴다
- 예약 클릭은 `events(type='booking_click')`, 앵콜 수는 `activeEncoreCount`. 강사 목록과 같은 식
- `getEncoreSource`가 클래스 값(곡·장소·가격·시간)을 KST로 돌려준다 → 상세 화면 정보에 재사용
- 운영 홈 표는 `ActionButton`으로 마감하기·마감 풀기를 바로 누른다

### 기존 패턴

- 운영 액션: `requireAdmin` → `parse`·`toState` → `refresh()`. 목록 필터는 주소(`searchParams`)를 `<Suspense>` 안에서 읽는다(`/admin/songs?review=`)

## Resources

### 문서

- F-17: `docs/03-기능명세서.md` "F-17. 운영자: 클래스 관리", F-12 상태: "F-12"
- A-05: `docs/04-IA.md:131`

### 코드 참조

- 운영 클래스 서버: `app/src/server/admin/classes.ts`, 마감: `app/src/server/admin/encores.ts:131`
- 강사 상태·취소 규칙: `app/src/server/instructors/classes.ts`
- 공개 조건: `app/src/server/classes/index.ts:23`

### API 엔드포인트

- 페이지(운영자): `GET /admin/classes?status=&instructor=&region=&q=&hidden=`, `GET /admin/classes/{id}`
- 서버 액션(운영자): `setClassHiddenAction`, `updateBookingUrlAction`, `endClassAction`, `cancelClassByAdminAction` (+ 기존 `setClassClosedAction`)

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 전체 목록은 `/admin/classes`에 따로 두고 필터는 주소에. 운영 홈의 다가오는 표는 그대로 | 홈은 당장 할 일, 목록은 찾아보기 |
| 곡 필터는 곡 id 선택 대신 검색어(`q`)로 클래스 이름·곡명·아티스트에 LIKE | 곡이 늘면 select가 길다. 운영자가 치는 편이 빠르다 |
| 상태 필터는 화면 상태(종료 시각 지난 것은 `ended`)로 거른다 | 자동 종료 배치가 없어 DB 상태만으로는 "종료"를 못 거른다(specs/class-detail) |
| 숨김은 `isHidden`만 바꾼다. 상태는 건드리지 않고 강사의 내 클래스에는 그대로 보인다 | 숨김은 운영 조치, 상태는 강사의 것(F-12) |
| 예약 링크 수정은 `bookingUrl`과 `bookingType`(재추정)만 바꾸고 `scheduleChangedAt`은 건드리지 않는다 | 일시·장소가 아니다 |
| 강제 종료는 `status = ended`. 시작 전이라도 가능. 되돌리지 않는다 | F-17. 수강생 화면은 종료로, 앵콜 패널이 열린다(F-24 종료 30일) |
| 운영자 취소는 사유 enum(강사 요청·오류·기타) → `cancelReason` 텍스트. 취소·종료된 클래스는 다시 취소·종료할 수 없다 | 강사 취소와 같은 열을 쓴다 |
| 상세의 클래스 정보는 `getEncoreSource`를 재사용해 읽고, 누가 올렸는지는 `createdByAdmin`으로 | 새 조회를 만들지 않는다 |

## Issues Encountered

(없음)

## Learnings

### 화면 상태는 SQL 식 하나로 만들어 select와 where에 같이 쓴다 (2026-11-03)

자동 종료 배치가 없어 "종료"는 DB 상태가 아니라 시각으로 정해진다. `case … end`를 `displayStatus`로 한 번 만들어 목록 열과 필터(`${displayStatus} = ${status}`)에 같이 쓰니 화면과 필터가 어긋나지 않는다.

### LIKE 검색어는 와일드카드를 빼고 비면 검색어 없음으로 (2026-11-03)

`%`만 친 검색어를 그대로 두면 전부 걸린다. 빼고 나서 비면 필터를 안 거는 게 "검색어 없음"과 같아 맞다.
