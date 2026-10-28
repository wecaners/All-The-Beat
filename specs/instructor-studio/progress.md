# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-10-28

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. 사용자 제안(강사 PR, 연습실 위치·사진, 내 스튜디오, 카카오맵, 지도에서 사진 가져오기 불가 → 링크)을 README로 정리. 사용자 지시("리뷰 스킵")로 이후 리뷰 생략
2. 03 명세 8절 "지도 보기"를 "지도 목록 제외, 상세 위치 미리보기 포함"으로 수정
3. 기존 장소 재사용·권역 추정·YouTube 확인·권한 구조 조사 → findings.md, spec 작성

**생성/수정 파일**:

- `specs/instructor-studio/README.md`, `spec.md`, `findings.md` (새로 생성), `docs/03-기능명세서.md` (수정)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md(화면 → 스키마(적용 전 승인) → 서버 → 운영자 화면 → 마무리), tasks.md 인수 체크리스트

**생성/수정 파일**:

- `specs/instructor-studio/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. 스키마: `instructor_places` 확장(카카오 장소·위치·시설·목록에서 빼기), `studio_photos`, `instructor_profiles` 사진·포트폴리오·사진/영상 게재 동의. 커스텀 마이그레이션으로 Storage 버킷 `media` + 운영자 정책(`is_admin()`). 사용자에게 SQL 승인을 받고 공용 DB에 적용
2. 서버: 카카오 로컬 API(장소·주소 검색, REST 키 서버 전용), 사진 저장소(`MediaStore`, 액션이 로그인 세션으로 만들어 넘김), 스튜디오·사진·강사 프로필 저장, 클래스 상세 조회 확장(동의 조건), 목록에서 뺀 스튜디오는 등록에서 제외
3. 운영자 화면: 강사 페이지에 강사 소개(사진·한 줄 소개·포트폴리오·동의)와 스튜디오(찾기·고치기·시설·사진·목록에서 빼기), 클래스 등록에 스튜디오 찾아 추가. 사진은 브라우저에서 1600·480px로 줄여 1MB 안에 맞춘다
4. 클래스 상세: `StaticMap`(보일 때 SDK 로드, 정적 지도), `PhotoStrip`(작은 목록 + 크게 보기), 시설 칩, 카카오맵 사진·리뷰 버튼, 강사 사진·소개·포트폴리오 영상
5. 문서: `.env.local.example`, `tech-stack.md` 환경변수 표, `docs/09-ERD.md` 8절, `design.md` 부품 표

**생성/수정 파일**:

- 새로: `app/src/server/kakao/`, `app/src/server/media/`, `app/src/server/admin/studios.ts`, `app/src/lib/facilities.ts`, `app/src/components/static-map.tsx`, `photo-strip.tsx`, `app/src/app/admin/instructors/studio-forms.tsx`, `profile-forms.tsx`, `image-upload.ts`, 마이그레이션 0005·0006
- 수정: 스키마(`classes.ts`, `users.ts`), `app/src/server/classes/index.ts`, `app/src/server/admin/classes.ts`, `app/src/app/admin/actions.ts`, 강사·클래스 등록 운영 화면, `class-view.tsx`

### Phase 4: Testing 🔄

**작업 내역**:

1. `pnpm check` 통과, `pnpm db:generate` 차이 없음, `pnpm db:check` 연결 확인
2. DB: 버킷(공개, 2MB, 이미지만)·정책 4개·`is_admin()` 권한(authenticated만)·`studio_photos` RLS·브라우저 역할 권한 없음 확인(읽기 전용 조회)
3. 카카오: REST 키로 장소·주소 검색 응답 확인, JS 키로 3101 도메인 SDK 확인(사용자가 키 입력·도메인 등록)
4. 클래스 상세(가짜 데이터 임시 페이지, 확인 후 삭제): 정적 지도 핀, 시설, 사진 크게 보기(넘기기·Esc·닫기·뒤로 가기), 강사 소개·영상. `/class/1`은 지도 없이 주소 검색 링크
5. 운영자 화면은 모양만 가짜 데이터로 확인. 실제 저장·사진 올리기는 운영자 로그인이 필요해 미확인

## Test Results

| Test             | Input          | Expected     | Actual      | Status |
| ---------------- | -------------- | ------------ | ----------- | ------ |
| 마이그레이션 | 0005·0006 적용 | 추가만, 차이 없음 | 같음 | ✅ |
| Storage 버킷·정책 | 읽기 전용 조회 | 공개·2MB·이미지, 운영자만 쓰기 | 같음 | ✅ |
| 카카오 장소·주소 검색 | "합정역", "서울 마포구 양화로 45" | 이름·주소·좌표·링크 | 같음 | ✅ |
| 정적 지도 | 가짜 좌표 | 핀 있는 지도, 누르면 카카오맵 | 같음 | ✅ |
| 사진 크게 보기 | 가짜 사진 3장 | 넘기기·Esc·닫기·뒤로 가기 | 같음 | ✅ |
| 운영자 스튜디오·사진·프로필 저장 | 운영자 로그인 | 저장·반영 | 미확인 | ⏸️ |

## Error Log

| Timestamp  | Error            | Attempt | Resolution           |
| ---------- | ---------------- | ------- | -------------------- |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question               | Answer           |
| ---------------------- | ---------------- |
| 1. 현재 어느 단계인가? | Phase 4 Testing — 운영자 로그인으로 하는 저장 흐름만 남음 |
| 2. 다음에 할 일은?     | 사용자가 운영자로 로그인해 스튜디오 등록·사진·프로필 저장 확인 |
| 3. 목표는?             | 내 스튜디오를 한 번 등록해 쓰고, 클래스 상세에서 연습실·강사를 자세히 본다 |
| 4. 지금까지 배운 것?   | findings.md 참고 |
| 5. 완료한 작업은?      | 위 내용 참고 |
