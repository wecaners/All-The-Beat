# Tasks: 찜

## Goal

로그인한 수강생이 클래스를 찜해 두고 마이에서 한 번에 보며, 찜한 클래스가 마감·취소됐는지 바로 안다.

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
- [x] Step 1: 스키마·마이그레이션
- [x] Step 2: 서버·액션
- [x] Step 3: 화면
- [x] Step 4: 마무리

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`, `pnpm db:check`, `pnpm db:generate`)
- [x] 인수 1: 찜 → 저장 (서버 함수). 버튼 켜짐은 코드 확인
- [x] 인수 2: 빼기 → 삭제, 묻지 않음
- [x] 인수 3: 두 번 찜 → 1건
- [x] 인수 4: 비로그인 → 로그인 시트 (실제 `/class/16`에서 확인). 복귀 자동 찜은 사용자 확인
- [ ] 인수 5: 동의 전 → 동의 화면 (사용자 확인)
- [x] 인수 6: 숨긴 클래스 → 저장 안 됨
- [x] 인수 7: 목록 순서(다가오는 날짜 순 → 지난 최근 순), 배지(마감·끝남·취소), 숨김 제외
- [x] 인수 8: 없을 때 안내 (빈 목록 서버 함수, 문구 코드 확인)

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
