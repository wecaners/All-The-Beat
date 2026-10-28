# Tasks: 디자인 시스템 (덕질 스크랩북)

## Goal

시안에서 정한 색·글꼴·형태·움직임을 앱의 공통 토큰과 컴포넌트로 만들고, 곡 상세 화면에 먼저 적용한다.

## Current Phase

🔄 Phase 4: Testing

## Phases

### Phase 1: Requirements & Discovery ✅

- [x] 요구사항 정의 (README.md)
- [x] 기존 코드 분석 (findings.md)
- [x] 스펙 문서 작성 (spec.md)
- [x] 스펙 리뷰 및 승인 — 사용자 지시("진행해")로 단계별 리뷰 생략

### Phase 2: Planning & Structure ✅

- [x] 구현 계획 작성 (plan.md)
- [x] 기존 코드 상세 분석
- [x] 관련 클래스/메서드 존재 여부 확인

### Phase 3: Implementation ✅

- [x] Step 0: 인수 시나리오 작성 (Phase 4 체크리스트)
- [x] Step 1: 토큰·폰트
- [x] Step 2: 컴포넌트
- [x] Step 3: 곡 상세·시트·완료 순간
- [x] Step 4: 디자인 규칙 파일·마무리
- [x] Step 5: 디스플레이 폰트 교체 — Bagel Fat One → 메이플스토리 Bold (로고 포함, 사용자 결정)

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: 영상 있는 곡 — 포토카드 썸네일, 누르면 재생 (그 전엔 플레이어 없음) — 썸네일·재생 버튼까지 확인, 눌러서 재생은 미확인
- [ ] 인수 2: 영상 없는 곡 — 안내 카드
- [ ] 인수 3: 첫 추가요 — 완료 순간·순번, 닫으면 +1
- [ ] 인수 4: 수정 — 완료 순간 없이 안내
- [ ] 인수 5: 동작 줄이기 — 움직임 없이 같은 정보

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
