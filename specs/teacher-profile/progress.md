# Progress Log


> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**


## Session 2026-11-03


### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. 사용자가 다음 기능으로 F-21을 골랐다. F-21, 04 IA, 와이어프레임 U-05 메모, specs/instructor-studio를 읽고 README 작성. 이후 사용자 지시("리뷰 스킵")로 리뷰 생략
2. 공개 조건·사진 동의 규칙·클래스 티켓·곡 한 줄 부품을 조사해 findings·spec 작성

**생성/수정 파일**:

- `specs/teacher-profile/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan 작성 (화면 → 서버·라우트·입구 → 마무리), tasks 체크리스트

**생성/수정 파일**:

- `specs/teacher-profile/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `src/server/teachers`: `normalizeTeacherHandle`, `getTeacherProfile`(강사 공개 조건, 사진 동의 규칙, 권역, 다가오는 클래스, 가르쳐 온 곡)
2. `/teacher/[handle]`: 요청마다 읽기(`connection()`), 없으면 `notFound()`, 제목·설명·OG. `TeacherView`(머리·포트폴리오·티켓·곡 줄·빈 안내)
3. 클래스 상세 강사 카드에 "강사 프로필 보기"(lime), 인스타 버튼은 아래로
4. 빈 목록 문구에서 "추가요하면 강사님이 볼 수 있어요"를 뺐다. 강사가 추가요를 보는 화면이 있는지 확인하지 않은 약속이라(원칙 6)
5. docs/03 F-21 메모, `specs/README.md`

**생성/수정 파일**:

- `app/src/server/teachers/index.ts`, `app/src/app/teacher/[handle]/page.tsx`, `teacher-view.tsx` (새로 생성)
- `app/src/app/class/[id]/class-view.tsx`, `docs/03-기능명세서.md`, `specs/README.md` (수정)

### Phase 4: Testing ✅

**작업 내역**:

1. 되돌리는 트랜잭션 안에서 가짜 강사(직접·대리 동의 여러 경우·대기·반려·정지)와 여러 상태의 클래스·곡으로 8개 확인. 끝난 뒤 남은 행 0
2. dev DB의 실제 강사 `/teacher/allbeat_test_minji`를 375px로 보고, 대소문자·`@` 주소, 없는 아이디, `/class/16`의 버튼 이동 확인
3. `pnpm check`, 개발 서버 로그 prerender 경고 없음

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 머리 | 직접 강사, 권역 2, 사진·소개·영상 | 다 보임 | 같음 | ✅ |
| 다가오는 | 모집·임박·마감·숨김·취소·지난 | 임박·마감·모집 날짜 순 | 같음 | ✅ |
| 가르친 곡 | A 2번, B 1번, C(취소·숨김) | A 2, B 1 | 같음 | ✅ |
| 대리 | 사진 동의 없음 / 있음 | 사진·소개·영상 없음 / 사진 보임 | 같음 | ✅ |
| 숨는 강사 | 동의 전·대기·반려·정지·없음·이상한 값 | 모두 null | 같음 | ✅ |
| 주소 | 대문자·`%40`·`@` | 같은 강사 | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |

## 5-Question Reboot Check


작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 완료 |
| 2. 다음에 할 일은? | 없음 (완료) |
| 3. 목표는? | 강사 한 명의 소개·다가오는 클래스·가르쳐 온 곡을 한 페이지에서 본다 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
