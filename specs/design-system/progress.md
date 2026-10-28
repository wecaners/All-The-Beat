# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-10-28

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. 시안 1~4차 결정(`design/README.md`)을 요구사항으로 정리
2. 사용자 지시("진행해")로 단계별 리뷰 없이 README·spec·findings 작성

**생성/수정 파일**:

- `specs/design-system/README.md`, `spec.md`, `findings.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md·tasks.md 작성 (토큰 → 컴포넌트 → 곡 상세 → 규칙)

**생성/수정 파일**:

- `specs/design-system/plan.md`, `tasks.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. 토큰: `@theme` 색·폰트·그림자·이징, 속지·형광펜·눌림·별 모양 유틸, 다크 모드 끔, 동작 줄이기
2. 폰트: Bagel Fat One·Bricolage(`next/font`), Pretendard(패키지 동적 분할 CSS)
3. 컴포넌트 11개: 스티커 버튼, 칩, 바텀시트, 영상 포토카드(홀로 기울기·누르면 재생), 클래스 티켓, 별 스티커, 라벨, 테이프, 완료 순간, 토스트, 움직임 도구
4. 곡 상세·추가요 시트·로그인 시트를 컴포넌트로 다시 짜고, 서버가 첫 추가요 여부·순번을 돌려주게 함
5. `_agent/rules/design.md` 작성, AGENTS.md·app.md 갱신

**생성/수정 파일**:

- `app/src/app/globals.css`, `layout.tsx`, `admin/layout.tsx`
- `app/src/components/*` (새로 생성)
- `app/src/app/song/[slug]/page.tsx`, `request-panel.tsx`, `actions.ts`
- `app/src/server/requests/index.ts`, `app/src/lib/format.ts`
- `_agent/rules/design.md` (새로 생성), `AGENTS.md`, `_agent/rules/app.md`

### Phase 4: Testing 🔄

**작업 내역**:

1. `pnpm check` 통과
2. 모바일 크기(375)로 비로그인 곡 상세·로그인 시트 확인, 콘솔 오류 없음
3. 별 스티커 위치 충돌(relative/absolute) 발견·수정
4. 사용자 피드백(Bagel 가독성·피로도)으로 후보 12종 비교 시안(`design/concepts/font-compare.html`)을 만들고, 사용자가 고른 메이플스토리 Bold로 디스플레이 폰트를 교체 (`layout.tsx`, `globals.css`, `app/src/app/fonts/`)
5. 교체 후 `pnpm check` 통과, 모바일(375) 비로그인 곡 상세·로그인 시트 확인, 콘솔·서버 오류 없음
6. 사용자 지시로 줄바꿈을 전역 어절 단위로 (`body`에 `word-break: keep-all` + `overflow-wrap: break-word`). 추가요 카드 문구가 "남겨 / 주세요!"로 끊기는 것 확인
7. 사용자 지적으로 빠진 인터랙션을 채움: 티켓 찢기 0.35초(흔들림 0.09 + 찢김 0.26, 실측 이동 시작 약 0.40초), 착착 붙기(`stagger`), 로고 흔들림, 포토카드 기울기(`TiltRow`), 반짝임(`Twinkle`). 뒤로 가기 때 티켓 원상 복귀, 동작 줄이기면 바로 이동(약 0.1초) 확인. `design.md`에 인터랙션 표 추가

## Test Results

| Test             | Input          | Expected     | Actual      | Status |
| ---------------- | -------------- | ------------ | ----------- | ------ |
| 곡 상세 (비로그인) | /song/a2o-lite-neon | 포토카드·형광펜 제목·핑크 카드·티켓 | 같음 | ✅ |
| 로그인 시트      | 나도 추가요! (비로그인) | 카톡 복귀 안내 + 카카오 버튼 | 같음 | ✅ |
| 첫 추가요 완료 순간 | 로그인 후 제출 | 스티커·순번 | 미확인 (로그인 필요) | ⏸️ |
| 메이플스토리 적용 | /song/a2o-lite-neon | 로고·곡 제목·추가요 카드·버튼·티켓 날짜·시트 제목이 메이플스토리 | 같음, 폰트 loaded | ✅ |

## Error Log

| Timestamp  | Error            | Attempt | Resolution           |
| ---------- | ---------------- | ------- | -------------------- |
| 2026-10-28 | 별 스티커가 카드 안 흐름을 차지 | 1 | 컴포넌트 기본 `relative`와 `absolute` 충돌 → 감싸는 div로 위치 지정 |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question               | Answer           |
| ---------------------- | ---------------- |
| 1. 현재 어느 단계인가? | Phase 4 Testing — 로그인 상태 인수 3·4·5 확인 남음 |
| 2. 다음에 할 일은?     | 로그인 후 첫 추가요·수정·동작 줄이기 확인 |
| 3. 목표는?             | 시안의 토큰·컴포넌트를 앱에 만들고 곡 상세에 먼저 적용 |
| 4. 지금까지 배운 것?   | findings.md 참고 |
| 5. 완료한 작업은?      | 위 내용 참고     |
