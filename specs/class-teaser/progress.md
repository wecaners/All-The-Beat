# Progress Log


> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**


## Session 2026-11-03


### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. 사용자가 다음 기능으로 F-25를 골랐다. F-25·F-16, 와이어프레임 U-05·T-02, `teaser_video_id` 칸, 곡 대표 영상의 링크 해석·oEmbed 확인 코드를 조사해 README 작성. 이후 사용자 지시("리뷰 스킵")로 리뷰 생략
2. findings·spec 작성

**생성/수정 파일**:

- `specs/class-teaser/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan 작성 (서버 → 화면 → 마무리), tasks 체크리스트

**생성/수정 파일**:

- `specs/class-teaser/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `src/server/youtube`: 오류 문구 `VIDEO_ERROR`를 옮기고 `VideoError`·`resolveVideoId`(비움 → null, 확인 실패 → 이유) 추가. `admin/songs.ts`는 같은 문구를 가져다 쓴다
2. `classInput.teaserUrl`(선택 300자), `resolveTeaser`(트랜잭션 밖, `AdminInputError` "티저 영상: …"), `createClass`·`updateMyClass` 저장, `EncoreSource`·`ClassDetail`에 `teaserVideoId`
3. 강사 폼·운영자 폼에 "티저 영상 링크" 칸(초기값 `https://youtu.be/{id}`), 액션 읽기, 클래스 상세 맨 위 분기(티저 `TEASER · YOUTUBE` / 강사명), 운영 상세 링크
4. docs/03 F-25 메모, `specs/README.md`

**생성/수정 파일**:

- `app/src/server/youtube/index.ts`, `app/src/server/admin/songs.ts`, `app/src/server/admin/classes.ts`, `app/src/server/instructors/classes.ts`, `app/src/server/classes/index.ts` (수정)
- `app/src/app/me/classes/{class-form.tsx,actions.ts}`, `app/src/app/admin/classes/new/class-form.tsx`, `app/src/app/admin/actions.ts`, `app/src/app/admin/classes/[id]/page.tsx`, `app/src/app/class/[id]/class-view.tsx` (수정)
- `docs/03-기능명세서.md`, `specs/README.md` (수정)

### Phase 4: Testing ✅

**작업 내역**:

1. 되돌리는 트랜잭션 안에서 가짜 강사·곡으로 12개 확인(실제 YouTube oEmbed 호출): 일반·쇼츠 링크 → ID, 비움 → null, YouTube 아님·없는 영상 거절과 저장 안 됨, 수정 초기값·바꾸기·비우기, 복사 소스, 상세 값. 끝난 뒤 남은 행 0
2. `ClassView`에 가짜 티저를 넣은 임시 페이지(커밋 안 함, 삭제)를 375px로 보고 맨 위 카드(썸네일 하나, `TEASER · YOUTUBE`, 강사명)를 확인
3. `pnpm check`, 개발 서버 로그 prerender 경고 없음

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 등록 | youtu.be / shorts / 빈 값 | ID / ID / null | 같음 | ✅ |
| 거절 | instagram 링크 / 없는 ID | "YouTube 영상 링크가 아니에요" / "영상을 찾을 수 없어요…", 저장 3건만 | 같음 | ✅ |
| 수정 | 초기값, 다른 링크, 빈 값 | ID / 새 ID / null | 같음 | ✅ |
| 복사·상세 | 티저 있는 클래스 / 없는 클래스 | ID / null | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |
| 2026-11-03 | 첫 테스트에서 티저 값이 전부 무시됨(좋은 링크 null, 나쁜 링크 통과) | 1 | 개발 서버가 옛 서버 모듈을 들고 있었다. 재시작 뒤 12/12 |

## 5-Question Reboot Check


작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 완료 |
| 2. 다음에 할 일은? | 없음 (완료). 실제 폼 입력은 사용자 확인 |
| 3. 목표는? | 클래스에 YouTube 티저 링크를 붙이면 상세 맨 위에 보인다 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
