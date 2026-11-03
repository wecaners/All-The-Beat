# Tasks: 인스타 스토리 공유 이미지

## Goal

누구나 클래스 상세에서 그 클래스의 스토리용 이미지를 받아 인스타 스토리에 올린다.

## Current Phase

🔄 Phase 4: Testing

## Phases

### Phase 1: Requirements & Discovery ✅

- [x] 요구사항 정의 (README.md)
- [x] 기존 코드 분석 (findings.md)
- [x] 스펙 문서 작성 (spec.md)
- [x] 스펙 리뷰 및 승인 — 사용자 지시("남은 기능 한번에")로 리뷰 없이 진행

### Phase 2: Planning & Structure ✅

- [x] 구현 계획 작성 (plan.md)
- [x] 기존 코드 상세 분석
- [x] 관련 클래스/메서드 존재 여부 확인

### Phase 3: Implementation ✅

- [x] Step 0: 인수 시나리오 작성 (Phase 4 체크리스트)
- [x] Step 1: 이미지 라우트
- [x] Step 2: 버튼
- [x] Step 3: 마무리

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: PNG 1080×1920에 곡·아티스트·이름·일시·권역·가격·난이도·강사·로고·주소·안내
- [ ] 인수 2: 휴대폰 공유 창 (사용자 확인)
- [x] 인수 3: 공유 미지원 → 새 탭 (코드 확인)
- [x] 인수 4: 숨김·없는 id → 404
- [x] 인수 5: 지금 정보로 만든다 (코드 확인: 저장 안 함)

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
