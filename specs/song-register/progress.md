# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-11-03

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. F-13·F-02·F-16, 05 유저플로우, 와이어프레임 U-02c를 읽고 README 작성. 사용자 지시로 리뷰 생략
2. 운영자 `findOrCreateSong`·`saveSong`, 곡 스키마(`reviewStatus`·`createdBy`), 검색 결과 없음, 추가요 패널의 로그인·동의·자동 열기 패턴을 조사해 findings 작성
3. spec 작성 (시나리오 8개, FR-10, CON-3, SC-4)

**생성/수정 파일**:

- `specs/song-register/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. Outside-In 순서로 plan 작성 (패널·핫한 곡 → 액션·서버 → 운영자 표시·마무리)
2. tasks의 Phase 3·4 체크리스트 작성

**생성/수정 파일**:

- `specs/song-register/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `saveSong`·`findOrCreateSong`에 `SongOrigin`(검수 상태·만든 사람) 옵션, `findOrCreateSong`이 slug도 돌려줌, 운영자 목록에 `pendingReview`
2. `src/server/songs/register.ts`의 `registerSong(userId, input)`: 검수 대기 + 만든 사람으로 만들고 운영자 오류를 수강생 오류로. `searchArtists`(별칭 LIKE, 정확 > 앞부분 > 포함)
3. 검색 액션 `registerSongAction`(로그인·동의·만들기)·`searchArtistsAction`
4. `NewSongPanel`: [이 곡 추가요!] → 로그인 시트 또는 새 곡 시트(곡 이름 미리 채움, 아티스트 datalist 제안), `?newsong=open` 자동 열기, 동의 복귀, 만든 뒤 `/song/{slug}?request=open`
5. 검색 결과 없음에 패널 + "이런 곡은 어때요?"(이번 주 핫한 곡 3), 운영자 곡 목록에 검수 열
6. docs/03 F-13·F-02 메모

**생성/수정 파일**:

- `app/src/app/search/new-song-panel.tsx`, `app/src/app/search/actions.ts`, `app/src/server/songs/register.ts` (새로 생성)
- `app/src/app/search/page.tsx`, `app/src/server/admin/songs.ts`, `app/src/server/songs/search.ts`, `app/src/app/admin/page.tsx` (수정)
- `docs/03-기능명세서.md` (수정)

### Phase 4: Testing ✅

**작업 내역**:

1. 되돌리는 트랜잭션 안에서 가짜 사용자로 12개 확인: 새 곡 pending·created_by·trim, 기존 아티스트 묶임, 다른 표기 → existed·중복 없음, 검색에 바로 걸림, 새 아티스트 생성, 아티스트 제안, 빈 입력 거절, 운영자 새 곡 confirmed, 운영자 목록 검수 대기. 끝난 뒤 곡·사용자 0
2. 375px 브라우저: 비로그인 `/search?q=zzzzqq`(안내·버튼·핫한 곡 3), 버튼 → 로그인 시트. 임시 페이지(로그인한 것처럼)에서 새 곡 시트 모양, 아티스트 제안, 저장 시 서버의 "로그인이 필요해요". 가로 넘침·서버 로그 오류 없음
3. `pnpm check`, `pnpm db:check`, `pnpm db:generate`

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 새 곡 | "  테스트 신곡 ZZ " / 테스트가수 | pending, created_by, trim | 같음 | ✅ |
| 다른 표기 | "테스트신곡zz" / "테스트 가수" | existed, 같은 slug, 곡 1개 | 같음 | ✅ |
| 검색 | "테스트신곡" | 새 곡 걸림 | 걸림 | ✅ |
| 새 아티스트 | 완전새가수 | 아티스트 생성·제안 | 같음 | ✅ |
| 빈 입력 | 빈 곡명 / 빈 아티스트 | SongRegisterError | 같음 | ✅ |
| 운영자 새 곡 | findOrCreateSong | confirmed, created_by null | 같음 | ✅ |
| 운영자 목록 | pendingReview | 내 곡 true, 운영자 곡 false | 같음 | ✅ |
| 비로그인 저장 | 미리보기에서 제출 | "로그인이 필요해요" | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 완료 |
| 2. 다음에 할 일은? | 없음 (완료). 실제 로그인 흐름(만들기 → 곡 상세 시트, 로그인·동의 복귀)은 사용자 확인 |
| 3. 목표는? | 없는 곡을 만들고 바로 추가요 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
