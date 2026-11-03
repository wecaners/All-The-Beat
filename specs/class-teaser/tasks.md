# Tasks: 강사 티저 영상

## Goal

강사(또는 운영자)가 클래스에 YouTube 영상 링크 하나를 붙이면, 클래스 상세 맨 위에 그 영상이 보인다.

## Current Phase

✅ Phase 4: Testing

## Phases

### Phase 1: Requirements & Discovery ✅

- [x] 요구사항 정의 (README.md)
- [x] 기존 코드 분석 (findings.md)
- [x] 스펙 문서 작성 (spec.md)
- [x] 스펙 리뷰 및 승인 — 사용자 지시("리뷰 스킵")로 생략

### Phase 2: Planning & Structure ✅

- [x] 구현 계획 작성 (plan.md)
- [x] 기존 코드 상세 분석
- [x] 관련 클래스/메서드 존재 여부 확인

### Phase 3: Implementation ✅

- [x] Step 0: 인수 시나리오 작성 (Phase 4 체크리스트)
- [x] Step 1: 서버
- [x] Step 2: 화면
- [x] Step 3: 마무리

### Phase 4: Testing ✅

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: 퍼갈 수 있는 링크(일반·쇼츠)로 등록 → ID 저장
- [x] 인수 2: 비우고 등록 → null
- [x] 인수 3: YouTube 아님·없는 영상·막힌 영상 → 각 문구로 거절, 저장 안 됨
- [x] 인수 4: 수정 폼 초기값 링크, 바꾸기·비우기
- [x] 인수 5: 복사·앵콜 소스에 티저
- [x] 인수 6: 상세 맨 위 티저 카드(출처·강사명), 곡 영상 없음 (서버 함수 + 가짜 값 임시 페이지 375px: 티저 썸네일 하나만)
- [x] 인수 7: 티저 없으면 곡 영상 (서버 함수. 화면 분기는 코드 확인)
- [x] 인수 8: 운영 상세 링크 (코드 확인)
- [ ] 실제 폼 입력(강사·운영자)과 막힌 영상 거절 문구 (사용자 확인. 막힌 영상은 테스트에 쓸 ID를 찾지 못해 서버 함수로도 미확인)

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
