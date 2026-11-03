# Tasks: 강사 클래스 등록과 내 클래스

## Goal

승인된 강사가 1분 안에 클래스를 올리고, 내 클래스에서 상태를 바꾸고, 앵콜에 답하고, 지난 클래스를 복사해 다시 연다.

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
- [x] Step 1: 서버 — 일반화와 강사 모듈
- [x] Step 2: 내 클래스 화면과 액션
- [x] Step 3: 등록·수정 폼
- [x] Step 4: 마무리

### Phase 4: Testing 🔄

- [x] 전체 빌드 확인 (`pnpm check`)
- [x] 인수 1: 입구·권한 — 비로그인 `/me/classes`·`/me/classes/new` → `/me` 확인. 미승인 → 신청 상태, 마이 줄은 코드 확인
- [x] 인수 2: 등록 → 공개 → 상세, 이름 자동, 링크 유형 — 서버 함수(공개·추가요 열림·`createdByAdmin false`·"원데이 클래스"·naver·권역 추정·장소 저장). 상세 이동은 코드(`router.push`)
- [x] 인수 3: 잘못된 입력 거절 — 과거·종료<시작·http 아님·곡 0/4·장소 없음
- [x] 인수 4: `?song=` 미리 선택 + 기다리는 수 — 서버 함수(`getSongOption`) + 미리보기(곡 칩·수요 카드는 코드)
- [x] 인수 5: 장소 고르기·새 장소·권역 자동 — 미리보기(칩 고르면 `placeId`·`regionId` 바뀜, 검색 시트는 비승인이라 서버 거절 문구). 카카오 검색 자체는 운영자 화면과 같은 함수
- [x] 인수 6: 목록 분리·숫자·내 것만 — 서버 함수(클릭·앵콜·다가오는/지난·B 비어 있음) + 미리보기 카드
- [x] 인수 7: 상태 전이, 앵콜 있으면 풀기 거절 — 서버 함수
- [x] 인수 8: 취소 사유, 되돌리기 없음 — 서버 함수 + 미리보기 시트
- [x] 인수 9: 수정 → 변경됨 24시간, 가격만은 없음, 종료·취소 거절 — 서버 함수(`scheduleChangedAt`, `changedRecently`)
- [x] 인수 10: 복사 초기값 — 서버 함수
- [x] 인수 11: 앵콜 응답, 타인 거절 — 서버 함수 + 미리보기 카드
- [x] 인수 12: 앵콜 클래스 열기 → 열렸어요 — 서버 함수(라운드 opened)
- [x] 375px 가로 넘침 없음(scrollWidth 375), 서버 로그 오류 없음(임시 페이지 자체의 Suspense 경고만)
- [ ] 실제 로그인 흐름(등록 → 상세, 카카오 장소 검색, 상태 버튼, 앵콜 응답)은 로그인이 필요해 미확인 (사용자 확인)

## Notes

- 진행할 때마다 Phase 상태를 업데이트하세요: ⏸️ 대기 → 🔄 진행 중 → ✅ 완료
- 결정 사항은 findings.md의 Technical Decisions에 기록하세요.
- 오류는 findings.md의 Issues Encountered에 기록하세요.
