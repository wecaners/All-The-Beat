# Tasks: 운영자 곡·클래스 등록

## Goal

운영자가 곡과 아티스트를 등록하고, 강사를 대신해 클래스를 등록해서 수강생에게 공개할 수 있게 한다.

## Current Phase

🔄 Phase 4: Testing

## Phases

### Phase 1: Requirements & Discovery ✅

- [x] 요구사항 정의 (README.md)
- [x] 기존 코드 분석 (findings.md)
- [x] 스펙 문서 작성 (spec.md)
- [x] 스펙 리뷰 및 승인 — 사용자 지시로 단계별 리뷰 생략

### Phase 2: Planning & Structure ✅

- [x] 구현 계획 작성 (plan.md)
- [x] 기존 코드 상세 분석
- [x] 관련 클래스/메서드 존재 여부 확인

### Phase 3: Implementation ✅

- [x] Step 0: 인수 시나리오 작성 (Phase 4 체크리스트)
- [x] Step 1: 권역 매핑 시드
- [x] Step 2: 운영자 틀 (권한 확인, /admin, 운영자 지정 스크립트)
- [x] Step 3: 곡·아티스트 등록·수정, 대표 영상
- [x] Step 4: 대리 강사, 게재 동의
- [x] Step 5: 클래스 대리 등록
- [x] Step 6: 마무리 (docs 갱신)

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] DB 확인 (`pnpm db:check`, `pnpm db:generate` 차이 없음)
- [ ] 인수 1: 운영자 아닌 계정·비로그인 → `/admin` 404, 서버 액션 거부 (비로그인 확인 ✅, 일반 로그인 계정 미확인)
- [x] 인수 2: 새 아티스트 + 곡 등록 → 곡 상세 열림, 다른 이름 저장 (한글 slug 버그 고친 뒤 확인)
- [ ] 인수 3: 퍼가기 허용 영상 지정 → 곡 상세에 영상 ✅ / 막힌 영상 거절 (미확인)
- [ ] 인수 4: 같은 slug 저장 거절
- [ ] 인수 5: 강사 생성 시 아이디 소문자·@ 제거 (저장값은 규칙대로, 대문자·@ 입력은 미확인)
- [ ] 인수 6: 동의 없는 강사 클래스 등록 → 수강생 화면에 안 보임, 추가요 대기 유지
- [x] 인수 7: 동의 기록 → 클래스 공개, 추가요 "열렸어요" (NEON 추가요 opened, 연결 클래스 #1)
- [ ] 인수 8: 잘못된 입력(지난 날짜, 종료 < 시작, 링크, 곡 수) 거절
- [ ] 인수 9: 마포구 주소 → 홍대·합정, 장소 재사용 (매핑은 SQL로 확인, 화면 등록은 구 없는 주소라 미확인)

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
