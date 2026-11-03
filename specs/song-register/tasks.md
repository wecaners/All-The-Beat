# Tasks: 수강생 신규 곡 등록

## Goal

검색해서 없는 곡을 그 자리에서 곡명·아티스트로 만들고, 바로 그 곡에 추가요한다.

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
- [x] Step 1: 결과 없음 패널·핫한 곡
- [x] Step 2: 서버 액션·곡 만들기·아티스트 찾기
- [x] Step 3: 운영자 표시·마무리

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: 결과 없음에 길 + 핫한 곡 ≤3 — `/search?q=zzzzqq`에서 [이 곡 추가요!]와 핫한 곡 3개
- [ ] 인수 2: 곡 만들기 → 곡 상세 + 추가요 시트 열림, 기다리는 수 0 — 서버 함수로 곡 생성 확인, 이동은 코드(`/song/{slug}?request=open`). 실제 흐름은 로그인이 필요해 미확인 (사용자 확인)
- [x] 인수 3: 아티스트 제안, 다른 표기도 같은 아티스트 — 서버 함수 + 미리보기에서 "테스트" 치면 "테스트가수" 제안
- [x] 인수 4: 이미 있는 곡 → 그 곡으로 — 서버 함수(existed, 중복 생성 없음)
- [ ] 인수 5: 비로그인 → 로그인 시트 → 복귀해 시트 자동 열림 — 로그인 시트는 확인, 복귀는 코드(`?newsong=open`) (사용자 확인)
- [ ] 인수 6: 동의 전 → 동의 화면 → 복귀 — 코드 확인 (사용자 확인)
- [x] 인수 7: 빈 입력 거절 — 서버 함수. 비로그인 저장은 서버가 "로그인이 필요해요"로 거절(미리보기)
- [x] 인수 8: 운영자 곡 목록 검수 대기 표시 — 서버 함수(`pendingReview`). 화면은 코드 확인
- [x] 375px 가로 넘침 없음(scrollWidth 375), 서버 로그 오류 없음

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
