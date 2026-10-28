# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-10-28

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. README 작성 → 사용자 지시("리뷰 스킵")로 이후 단계별 리뷰 생략
2. docs 03·04, 와이어프레임 U-01, 시안 round-2, 기존 조회 코드 조사 → findings.md
3. spec 작성

**생성/수정 파일**:

- `specs/home/README.md`, `spec.md`, `findings.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md (화면·SongCard → 조회 셋 → 영상 규칙 정리 → 마무리), tasks.md 인수 체크리스트

**생성/수정 파일**:

- `specs/home/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. 조회 셋: `listHotSongsThisWeek`, `listUpcomingClasses`(classes), `listTopRequestedSongs`(requests). 시각 비교는 DB 안, 공개 조건 `publiclyVisible`
2. 영상 표시 규칙 `visibleVideoId`를 `src/server/songs`로 모으고 곡 상세·클래스 상세·홈이 같이 씀 (클래스 상세의 막힌 영상 누락 수정)
3. 공용 `SongCard`, 홈 `page.tsx`(로고·소개·Suspense) + `home-view.tsx`(세 묶음, 모두 비면 안내)
4. `design.md`에 `SongCard`, `docs/03` F-01 구현 메모

**생성/수정 파일**:

- `app/src/app/home-view.tsx`, `app/src/components/song-card.tsx` (새로 생성)
- `app/src/app/page.tsx`, `app/src/server/classes/index.ts`, `app/src/server/requests/index.ts`, `app/src/server/songs/index.ts`, `_agent/rules/design.md`, `docs/03-기능명세서.md` (수정)

### Phase 4: Testing ✅

**작업 내역**:

1. `pnpm check` 통과
2. 개발 서버(3101)에서 모바일 375px로 `/` 실데이터 확인: 핫한 곡 NEON(클래스 1), 다가오는 클래스 1개, 추가요 TOP은 유일한 추가요가 취소 상태라 숨김
3. 여러 장·TOP 5·클래스 없음·모두 없음은 임시 페이지에서 가짜 데이터로 확인하고 지움
4. 곡 상세·클래스 상세 썸네일 회귀 없음, 서버 로그 오류·"unstable value" 없음
5. 제외 규칙은 조회 함수와 같은 SQL을 트랜잭션 안에서 가짜 데이터로 돌리고 되돌려 확인 (DB 변화 없음)
6. 미리보기 탭이 뒤에 있어 화면이 뼈대에 멈춘 것은 환경 문제(findings 이슈 3). 확인 중 뼈대 가로 넘침을 발견해 고침

## Test Results

| Test             | Input          | Expected     | Actual      | Status |
| ---------------- | -------------- | ------------ | ----------- | ------ |
| 홈 실데이터 | `/` 비로그인 | 핫한 곡·다가오는 클래스, TOP 숨김(취소만 있음) | 같음 | ✅ |
| 링크 | 곡·클래스·나도 추가요 | `/song/…`, `/class/…`, `?request=open` | 같음 | ✅ |
| 가짜 데이터 | full / noclass / empty | 세 묶음 / TOP만 / 안내만 | 같음 | ✅ |
| 가로 넘침 | 375px | 넘침 없음 | 뼈대 넘침 발견 → 고침 | ✅ |
| 7일·마감·숨김·시작함·31일·병합 제외 | 트랜잭션 안 가짜 데이터 | 핫한 곡 NEON 2 / 다가오는 3 / TOP NEON 1 / 병합 후 빈 TOP | 같음 (되돌린 뒤 DB 그대로) | ✅ |

## Error Log

| Timestamp  | Error            | Attempt | Resolution           |
| ---------- | ---------------- | ------- | -------------------- |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question               | Answer           |
| ---------------------- | ---------------- |
| 1. 현재 어느 단계인가? | Phase 4 Testing 완료 — 커밋 대기 |
| 2. 다음에 할 일은?     | 커밋 (사용자 지시 시) |
| 3. 목표는?             | 홈에서 이번 주 뜨는 곡·다가오는 클래스·추가요 TOP을 보고 바로 이동 |
| 4. 지금까지 배운 것?   | findings.md 참고 |
| 5. 완료한 작업은?      | 위 내용 참고 |
