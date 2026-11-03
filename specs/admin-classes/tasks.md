# Tasks: 운영자 클래스 관리

## Goal

운영자가 전체 클래스를 조건으로 찾아보고, 문제가 있는 클래스를 숨기거나 예약 링크를 고치거나 마감·종료·취소 처리한다.

## Current Phase

🔄 Phase 4: Testing

## Phases

### Phase 1: Requirements & Discovery ✅

- [x] 요구사항 정의 (README.md)
- [x] 기존 코드 분석 (findings.md)
- [x] 스펙 문서 작성 (spec.md)
- [x] 스펙 리뷰 및 승인 — README 작성 후 사용자 지시("리뷰 스킵")로 생략

### Phase 2: Planning & Structure ✅

- [x] 구현 계획 작성 (plan.md)
- [x] 기존 코드 상세 분석
- [x] 관련 클래스/메서드 존재 여부 확인

### Phase 3: Implementation ✅

- [x] Step 0: 인수 시나리오 작성 (Phase 4 체크리스트)
- [x] Step 1: 서버·액션
- [x] Step 2: 운영 화면
- [x] Step 3: 마무리

### Phase 4: Testing ✅

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: 전체 목록·숫자 — 서버 함수(5개 상태 섞어 최근순·공개·숨김·클릭·앵콜) + 임시 페이지 표 모양
- [x] 인수 2: 필터 5종, 종료 시각 지남 = 종료 — 서버 함수(상태 ended·closed, 권역, 검색어 제목·곡명, 숨김만, %만은 전부)
- [x] 인수 3: 상세 정보·올린 주체·링크 — 서버 함수(`getClassForAdmin`). 화면은 코드 확인
- [x] 인수 4: 숨김 → `getPublicClass` null, 강사 목록 유지·상태 그대로, 풀기 → 보임
- [x] 인수 5: 링크 수정·naver 유형·trim, ftp·빈 값 거절
- [x] 인수 6: 마감·풀기 — 기존 `setClassClosed` 그대로(코드 확인)
- [x] 인수 7: 강제 종료 → ended, 재종료·취소 거절
- [x] 인수 8: 취소 사유("운영자 · 강사 요청"), 취소된 클래스 종료 거절, 시각 지난 클래스 취소 거절
- [x] 운영자만 — 액션 전부 `requireAdmin`(코드 확인). 서버 로그 오류 없음(임시 페이지)
- [ ] 실제 운영 화면(필터 폼·버튼)은 운영자 로그인이 필요해 미확인 (사용자 확인)

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
