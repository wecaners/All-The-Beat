# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-10-28

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. README 작성. 사용자 지적(곡 1~3개 의도, 드롭다운 곡 선택이 곡이 많아지면 맞지 않음)으로 운영자 곡 고르기를 범위에 더함(기본 한 곡, 최대 세 곡). 사용자 지시("리뷰 스킵")로 이후 리뷰 생략
2. 별칭 저장·정규화·trigram 인덱스·클래스 등록 폼 조사 → findings.md, spec 작성

**생성/수정 파일**:

- `specs/search/README.md`, `spec.md`, `findings.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md(화면·홈 입구 → 곡 검색 서버 → 운영자 곡 고르기 → 마무리), tasks.md 인수 체크리스트

**생성/수정 파일**:

- `specs/search/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `searchSongs`: 정규화 → 곡·아티스트 별칭 포함 검색(점수 6~1) → 병합 제외 → 다가오는 공개 클래스 수·90일 기다리는 수 → 정렬, 최대 20
2. `/search`: 미리 그려진 검색 칸(0.25초 쉬면 주소 바꿈, 찾는 중 표시), 결과는 `<Suspense>` 안에서 서버가 그림, 빈 검색어·결과 없음 안내, 검색 엔진 색인 제외. 공용 `SongRow`
3. 홈 소개 줄 아래 검색 입구
4. 운영자 클래스 등록: 드롭다운 3개 → `SongPicker`(같은 검색, 기본 한 곡, "다른 곡도 배워요" 최대 세 곡, 빼기, 결과 없음 → 곡 등록 새 창). 쓰지 않게 된 `listSongOptions` 제거
5. design.md(`SongRow`, 검색 결과는 등장 애니메이션 없음), docs/03 F-01·F-02 구현 메모

**생성/수정 파일**:

- 새로: `app/src/server/songs/search.ts`, `app/src/app/search/page.tsx`, `search-box.tsx`, `app/src/components/song-row.tsx`, `app/src/app/admin/classes/new/song-picker.tsx`
- 수정: `app/src/app/page.tsx`, `app/src/app/admin/actions.ts`, `app/src/app/admin/classes/new/class-form.tsx`, `page.tsx`, `app/src/server/admin/classes.ts`, `_agent/rules/design.md`, `docs/03-기능명세서.md`

### Phase 4: Testing 🔄

**작업 내역**:

1. `pnpm check` 통과
2. 실데이터 검색: neon·네온·a2o lite·A2OLITE → NEON, 테스트·에투라 → 테스트곡, 없는노래 → 안내, 빈 검색어 → 안내
3. 순위: 같은 SQL을 트랜잭션 안 가짜 곡(NEON Light, Neon Band의 Glow, My Neon)으로 확인 후 되돌림 — NEON 6, NEON Light 4, Glow 3, My Neon 2
4. 브라우저: 홈 입구 → 검색, 치기 → 주소·결과, 곡 상세 → 뒤로 → 검색어·결과 그대로. 처음 구조(Suspense 안 검색 칸)에서 칸이 바뀌는 문제를 찾아 고침
5. 운영자 곡 고르기는 운영자 로그인이 필요해 미확인
6. 사용자 지적(새 곡마다 곡 등록을 따로 해야 함)으로 곡 고르기에서 바로 새 곡 만들기(`findOrCreateSong`, `createSongForClassAction`)를 더함. 중복 확인 쿼리를 읽기 전용으로 확인, `pnpm check` 통과

## Test Results

| Test             | Input          | Expected     | Actual      | Status |
| ---------------- | -------------- | ------------ | ----------- | ------ |
| 별칭·표기 | neon·네온·a2o lite·A2OLITE | NEON | 같음 | ✅ |
| 아티스트 별칭 | 에투라 | 테스트곡 | 같음 | ✅ |
| 결과 없음·빈 검색어 | 없는노래 / (빈 칸) | 안내 | 같음 | ✅ |
| 순위 | neon (가짜 곡, 되돌림) | 6 > 4 > 3 > 2 | 같음 | ✅ |
| 뒤로 가기 | 곡 상세 → 뒤로 | 같은 검색어·결과 | 같음 | ✅ |
| 운영자 곡 고르기 | 운영자 로그인 | 한 곡·추가·빼기 | 미확인 | ⏸️ |

## Error Log

| Timestamp  | Error            | Attempt | Resolution           |
| ---------- | ---------------- | ------- | -------------------- |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question               | Answer           |
| ---------------------- | ---------------- |
| 1. 현재 어느 단계인가? | Phase 4 Testing — 운영자 곡 고르기만 사용자 확인 남음 |
| 2. 다음에 할 일은?     | 운영자로 클래스 등록에서 곡 고르기 확인 |
| 3. 목표는?             | 어떤 표기로 쳐도 곡을 찾는다(수강생 검색, 운영자 곡 고르기) |
| 4. 지금까지 배운 것?   | findings.md 참고 |
| 5. 완료한 작업은?      | 위 내용 참고 |
