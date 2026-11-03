# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-12: 한 화면 입력(곡 1~3·이름 30자·날짜·시작·종료 30분·장소(이전 장소 재사용)·권역 자동·가격·난이도·예약 링크(유형 자동)·정원·썸네일·설명 1,000자). "지난 클래스 복사". 저장 즉시 공개. 상태: 모집중·마감 임박(수동)·마감·종료(자동)·취소(사유: 인원 미달/개인 사정/기타). 일시·장소 수정 시 "변경됨" 24시간. 종료 클래스는 수정 불가(복사만). 재오픈은 앵콜 없을 때만. 내 클래스(T-03): 상태·예약 클릭 수·앵콜 수, 응답 필요 배지
- F-24: 기준 인원이 넘으면 강사에게 전달 → 강사가 검토/거절, 검토면 앵콜 클래스 등록
- 04 IA: T-02 `/me/classes/new`·`/me/classes/{id}/edit`(강사, `?song={slug}`), T-03 `/me/classes`(강사). 등록 완료 → U-05. 입력 화면은 탭바 숨김
- 05 플로우 5·6: 곡 상세·랭킹의 [클래스 열기] → 곡 미리 선택 + 수요 표시. 복사 경로는 날짜·곡만 바꾸면 끝
- 와이어프레임 T-02a(필수 7개, 지난 클래스 가져오기, 이름 선택), T-03a(앵콜 응답 카드, 다가오는/지난, 조회·예약 클릭·앵콜, 상태 변경, 복사), T-03b(앵콜 응답)

## Research Findings

### 코드베이스 구조

- `createClassByAdmin(input)`(`app/src/server/admin/classes.ts`): 강사 확인 → 곡 확인 → 장소(저장된 것 또는 새로 저장, `guessRegion`) → `classes` insert(`createdByAdmin: true`) → 앵콜이면 `openEncoreRound` → `class_songs` → 공개면 추가요 열기. `classInput`(zod)이 검증 전부(과거 날짜·30분·URL·장소). 강사 등록은 이 함수에 `createdByAdmin: false`만 다르다
- `setClassClosed(classId, closed)`(`app/src/server/admin/encores.ts`): 마감·마감 풀기(앵콜 라운드 없을 때만). `respondToEncore(classId, "review" | "decline")`: 전달→검토/거절. 둘 다 소유 확인이 없다(운영자 전용) → 강사용은 소유를 확인한 뒤 같은 함수를 부른다
- `listEncoresForAdmin()`: 모든 강사의 전달·검토 중 앵콜(시간대 분포·한마디 5개). 강사별 필터가 없다 → `instructorId` 옵션을 더한다
- `getEncoreSource(classId)`(앵콜 클래스 프리필)과 `listPlacesForInstructor`(보관 안 한 장소, 최근 사용 순)가 있다
- 스튜디오: `searchKakaoPlaces/Addresses`(`app/src/server/kakao`), `saveStudio(studioCandidateInput)`(`instructorId` 포함). 운영 액션은 `requireAdmin` → 강사용 액션은 내 강사 id로 고정해 부른다. `KAKAO_REST_API_KEY`는 로컬 `.env.local`에 있다
- `classes.scheduleChangedAt`은 스키마에만 있고 쓰는 곳이 없다. 클래스 상세(`ClassDetail`·`ClassView`)에 "변경됨" 표시가 없다
- 예약 클릭은 `events(type = 'booking_click', class_id)`(`app/src/app/go/[classId]/route.ts`). 조회 수는 세지 않는다
- 곡 상세 `RequestSection`이 `getCurrentUser()`를 읽는다 → 승인된 강사면 "이 곡으로 클래스 열기"를 같은 자리에서 보여줄 수 있다
- 마이 `InstructorEntry`(specs/instructor-apply)의 승인 상태 줄이 신청 화면으로 간다 → 내 클래스로 바꾼다
- `Calendar`(specs/class-list)와 `ChoiceChip multiple`, `BottomSheet`, `SongRow`, `ClassTicket`이 있다. 시간 고르기 부품은 없다

### 기존 패턴

- 강사 전용 화면은 `getCurrentUser()` → `getMyInstructor()`로 승인 여부를 보고 아니면 신청 화면으로 보낸다
- 서버 액션은 `{ ok, error }`. 운영 액션은 `parse`·`toState`(`AdminInputError` → 문구)
- 수강생 폼 스타일: `specs/instructor-apply`의 `inputClass`, `StickerButton`, 칩

## Resources

### 문서

- F-12: `docs/03-기능명세서.md` "F-12. 클래스 등록·수정·마감·취소", F-24 강사 응답: "F-24"
- T-02·T-03: `docs/04-IA.md:169`, 플로우 5·6: `docs/05-유저플로우.md:191`, `docs/05-유저플로우.md:228`
- 와이어프레임: `wireframes/index.html:1484`(T-02a), `:1557`(T-02b), `:1600`(T-03a), `:1667`(T-03b)

### 코드 참조

- 등록: `app/src/server/admin/classes.ts:102`, 입력: `app/src/server/admin/classes.ts:34`, 장소 목록: `:92`, 앵콜 프리필: `:237`
- 마감·앵콜 응답·앵콜 라운드 열기: `app/src/server/admin/encores.ts:131`, `:102`, `:119`
- 스튜디오 저장·검색: `app/src/server/admin/studios.ts:119`, `app/src/server/kakao`
- 클릭 기록: `app/src/app/go/[classId]/route.ts`
- 클래스 상세: `app/src/server/classes/index.ts:121`, `app/src/app/class/[id]/class-view.tsx`

### API 엔드포인트

- 페이지(승인 강사): `GET /me/classes`, `GET /me/classes/new?song=&copy=&encoreOf=`, `GET /me/classes/{id}/edit`
- 서버 액션(승인 강사, 소유 확인): `createMyClassAction`, `updateMyClassAction`, `setMyClassStatusAction(id, closing_soon | closed | open)`, `cancelMyClassAction(id, reason)`, `respondToMyEncoreAction(id, review | decline)`, `searchMyStudiosAction`, `saveMyStudioAction`, `searchSongsForMyClassAction`, `createSongForMyClassAction`

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 등록은 `createClassByAdmin`을 `createClass(input, { createdByAdmin })`로 일반화해 같이 쓴다. 강사는 `instructorId`를 내 것으로 고정하고 `createdByAdmin: false` | 검증·장소·권역·링크 유형·앵콜 라운드·추가요 열기가 한 코드에 남는다. 운영자 함수 이름은 그대로 두고 옵션만 더한다 |
| 강사용 서버 모듈 `src/server/instructors/classes.ts`가 소유(내 강사 id = `classes.instructorId`)를 확인한 뒤 운영자 함수를 부른다 | 운영자 함수에 소유 개념이 없다. 소유 확인을 강사 쪽 한곳에 둔다 |
| 수정은 종료 전·취소 아님·내 것만. 곡·이름·일시·장소·권역·가격·난이도·정원·링크·설명을 바꾼다. 시작·종료·장소(place 또는 주소)가 바뀌면 `scheduleChangedAt = now()` | F-12 수정 규칙. "변경됨"은 클래스 상세가 `scheduleChangedAt > now() - 24h`로 보여준다 |
| 상태 변경은 모집중 ↔ 마감 임박(강사 수동), 마감하기(`setClassClosed`), 마감 풀기(앵콜 없을 때만, 기존 규칙), 취소(사유 enum 3개 → `cancelReason` 텍스트). 취소·종료는 되돌리지 않는다 | F-12 상태표. 외부 예약이라 마감은 강사가 누른다 |
| 앵콜 응답은 `respondToEncore`를 소유 확인 뒤 그대로 부른다. 운영자 화면도 그대로 둔다 | 둘 다 가능. 상태는 앞으로만 |
| 앵콜 클래스 등록은 `/me/classes/new?encoreOf=`로 `getEncoreSource` 프리필 + 소유 확인 | 운영자와 같은 경로. 원 클래스 값을 채우고 날짜만 |
| 복사는 `/me/classes/new?copy=`로 내 클래스 값을 채운다(곡 포함, 날짜·시간은 비움) | 플로우 6 "날짜·곡만 바꾸면 끝" |
| 내 클래스 목록은 시작 전·진행 중(다가오는)과 종료·취소(지난)로 나누고, 클릭 수는 `events` count, 앵콜 수는 `activeEncoreCount`, 답 필요는 라운드 `delivered`·`reviewing` | T-03a. 조회 수는 없다(원칙 6) |
| 시간은 30분 단위 칩을 바텀시트(`TimeSheet`)에서 고른다. 날짜는 `Calendar` 시트 | 기본 `<select>`는 톤에서 튄다(사용자 피드백). 종료는 시작 뒤만 고를 수 있다 |
| 곡 고르기는 수강생 검색(`searchSongs`)과 `registerSong`을 강사 액션으로 감싸 같은 규칙으로 | F-13. 새 곡은 검수 대기 + 만든 사람 |
| 스튜디오 고르기는 내 장소 칩 + "새 장소 찾기" 시트(카카오 장소/주소 검색 → 저장). 권역 칩은 고른 장소로 자동 채우고 바꿀 수 있다 | specs/instructor-studio "클래스 등록". 키가 없으면 이름·주소를 직접 쓰는 칸으로 대신한다 |
| 곡 상세의 "이 곡으로 클래스 열기"는 승인된 강사에게만, 추가요 패널 위 | 플로우 5. 랭킹 행은 이번에 없다(README) |
| 썸네일·조회 수·"마감됐나요?" 배너·스튜디오 사진·시설은 없다 | README |

## Issues Encountered

(없음)

## Learnings

### 운영자 함수에 "누가"만 열면 강사 기능이 얇아진다 (2026-11-03)

등록(`createClass`)·마감·앵콜 응답·스튜디오 저장은 운영자 모듈에 규칙이 다 있다. 강사 쪽은 소유 확인 한 겹(`ownedClass`)과 `createdByAdmin: false`만 더했다. 수정만 새로 썼는데, 등록의 장소·곡 처리를 그대로 옮긴 것이라 규칙이 둘로 갈라지지 않는다.

### dev DB에 남은 데이터는 테스트 기대값을 흔든다 (2026-11-03)

"추가요 1건 열림"을 기대했는데 같은 곡에 실제 추가요가 있어 2건이 열렸다. 되돌리는 트랜잭션이라 데이터는 안 남지만, 집계 기대값은 "≥"로 쓰거나 트랜잭션 안에서 관련 행을 먼저 비운다(랭킹 테스트의 `delete from requests` 방식).
