# Tasks: 하단 탭바

## Goal

수강생 화면 어디서든 홈·찾기·추가요·마이 네 곳으로 한 번에 간다.

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
- [x] Step 1: 탭바 부품과 네 화면 붙이기
- [x] Step 2: 마무리

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: 네 화면에 탭바, 현재 탭 켜짐, `/classes`는 찾기 — 홈·목록·랭킹·마이에서 `aria-current` 확인
- [x] 인수 2: 홈·추가요·마이 탭 이동 — 랭킹에서 마이 탭 → `/me`, 마이 켜짐
- [x] 인수 3: 찾기 → 검색 칸 포커스 — 마이에서 찾기 탭 → `/search`, `activeElement`가 검색 입력
- [x] 인수 4: 누르면 알약 이동·아이콘 뜀 — 알약 `left` 계산값 확인(홈 21.875px). 움직임 자체와 동작 줄이기는 코드 확인(`motion-safe`, `play`)
- [x] 인수 5: 긴 목록 끝이 가려지지 않음 — 목록 끝까지 내려 마지막 티켓 아래(684px) < 탭바 위(724px)
- [x] 인수 6: 상세·검색·동의·약관·운영에 탭바 없음 — `/search`·`/terms` 직접 열어 없음 확인. 나머지는 코드(붙인 화면 네 곳뿐)
- [x] 인수 7: 홈 머리에 마이 버튼 없음
- [x] 375px 가로 넘침 없음(scrollWidth 375), 서버 로그 오류 없음

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
