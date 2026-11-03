# Tasks: 추가요 랭킹

## Goal

최근 30일 동안 사람들이 가장 기다린 곡을 권역별로도 보고, 거기서 바로 추가요하거나 곡 상세로 가게 한다.

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
- [x] Step 1: 랭킹 화면·홈 입구
- [x] Step 2: 랭킹 서버
- [x] Step 3: 마무리

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: 홈 더보기 → 랭킹 — 링크 주소는 가짜 데이터 미리보기로 확인. 3명 이상인 TOP 5 곡이 랭킹 앞부분과 같은 순서인 것은 서버 함수로 확인
- [x] 인수 2: 3명 이상 곡만 최대 50곡, 순위·썸네일·곡명·아티스트·기다리는 수·이번 주 증가 — 서버 함수(되돌리는 트랜잭션) + 줄 모양은 미리보기
- [x] 인수 3: 순위 변화 ▲·▼·NEW, 같으면 없음 — 서버 함수 + 미리보기
- [x] 인수 4: 클래스 N개 열림 / 아직 클래스 없음 — 서버 함수 + 미리보기
- [x] 인수 5: 곡 누르면 곡 상세 — 줄 링크 `/song/{slug}` (미리보기)
- [x] 인수 6: 비었을 때 안내 + 검색 입구 — 실제 `/requests`(dev DB에 3명 이상 곡 없음)
- [x] 인수 7: 권역 고르면 그 권역 희망 추가요만, 어디든은 전체에만 — 서버 함수
- [x] 인수 8: 주소에 권역 유지 — `/requests?region=2`에서 그 칩이 켜지고 빈 화면 문구에 권역 이름
- [x] 인수 9: 모르는 권역 값 → 전체 — `/requests?region=abc`에서 전체 칩이 켜짐
- [ ] 인수 10: 나도 추가요 → 곡 상세 시트 자동 열림 — 링크 주소(`?request=open`)는 미리보기로 확인. 시트가 열리는 것은 곡 상세의 기존 동작(specs/request), 이번에 다시 확인하지 않음 (사용자 확인)
- [x] 인수 11: 검색 입구 → 검색 — 링크 `/search`
- [x] 375px 가로 넘침 없음(scrollWidth 375), 서버 로그 오류 없음

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
