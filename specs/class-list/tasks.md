# Tasks: 클래스 목록·필터

## Goal

열린 클래스를 날짜 순으로 보고, 검색어·날짜·권역·난이도로 좁혀서, 바로 클래스 상세로 간다.

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
- [x] Step 1: 목록 화면·조건 칩·입구
- [x] Step 2: 목록 서버·조건 파싱·검색어
- [x] Step 3: 이어 붙이기
- [x] Step 4: 마무리

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: 홈 전체 보기 → 목록 — 링크 `/classes` 확인
- [x] 인수 2: 기본 목록 = 공개·모집중·마감 임박·시작 전, 날짜순·날짜 묶음, 항목 정보 — 서버 함수(되돌리는 트랜잭션, 취소·숨김·진행 중·종료 제외) + 실제 화면. 미승인 강사 제외는 dev DB에 미승인 강사가 없어 코드 확인(`publiclyVisible`)
- [x] 인수 3: 20개 뒤 이어 붙기, 빠짐·겹침 없음 — 같은 시각 25개 + 1개로 서버 확인(27개, 중복 0). 브라우저 이어 붙이기는 첫 1개만 주는 임시 페이지에서 서버 액션으로 나머지 3개가 날짜 묶음에 붙는 것 확인
- [x] 인수 4: 항목 → 클래스 상세 — 티켓 링크 `/class/{id}`
- [x] 인수 5: 날짜 오늘·이번 주·이번 주말·직접 고르기 (KST) — 경계 계산 11개 + 서버 함수. 날짜 입력 UI는 미리보기에서 눌러 보지 않음 (사용자 확인)
- [x] 인수 6: 권역 여러 개 토글 — 서버 함수 + 칩 누르면 `?region=2`
- [x] 인수 7: 난이도 하나 — 서버 함수
- [x] 인수 8: 검색 엔터 → `/classes?q=`, 별칭 곡의 클래스만 — 브라우저에서 엔터 → `/classes?q=cortis`, 대표곡·둘째 곡 모두 서버 확인
- [x] 인수 9: 마감 포함 → 흐린 마감 카드 + 앵콜 수 — 서버 함수(closed 포함·상태), 토글 누르면 `&closed=1`. 흐린 카드 모양은 dev DB에 마감 클래스가 없어 미확인 (사용자 확인)
- [x] 인수 10: 주소만으로 같은 결과, 모르는 값 무시 — 파싱 테스트 + `?closed=1&region=1,2&date=week` 열어 칩 상태 확인
- [x] 인수 11: 0개 안내 + 초기화(검색어 유지) — `?q=zzzz&level=intro`
- [ ] 인수 12: 곡은 있는데 클래스 없음 → 곡 상세 길 — 코드 확인, dev DB에 해당 곡 없어 화면 미확인 (사용자 확인)
- [x] 375px 가로 넘침 없음(scrollWidth 375), 서버 로그 오류 없음(`connection()` 고친 뒤)

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
