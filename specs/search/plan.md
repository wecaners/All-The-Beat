# Implementation Plan: 검색

## Summary

`src/server/songs/search.ts`에 `searchSongs`(정규화 → 두 별칭 테이블 포함 검색 → 점수 → 클래스·기다리는 수)를 만들고, `/search` 페이지와 운영자 곡 고르기가 같이 쓴다. 홈에 검색 입구를 둔다. 스키마는 바꾸지 않는다.

## Requirements

1. 정규화·별칭 검색·순서·결과 항목 (FR-1~3)
2. `/search?q=` 화면: 치는 동안 결과, 빈 검색어·결과 없음 안내 (FR-4~6)
3. 홈 검색 입구 (FR-7)
4. 운영자 곡 고르기 (FR-8~9)

## Critical Files

### New Files

- `app/src/server/songs/search.ts` — 곡 검색
- `app/src/app/search/page.tsx`, `search-box.tsx` — 검색 화면, 치는 칸
- `app/src/components/song-row.tsx` — 곡 한 줄
- `app/src/app/admin/classes/new/song-picker.tsx` — 운영자 곡 고르기

### Modified Files

- `app/src/app/home-view.tsx` 또는 `app/src/app/page.tsx` — 검색 입구
- `app/src/app/admin/classes/new/class-form.tsx`, `page.tsx` — 드롭다운 3개 → 곡 고르기
- `app/src/app/admin/actions.ts` — 운영자 곡 찾기 액션
- `app/src/server/admin/classes.ts` — `listSongOptions` 제거(쓰는 곳이 없어지면)
- `_agent/rules/design.md` — `SongRow`, 인터랙션 표(검색 결과는 등장 애니메이션 없음)
- `docs/03-기능명세서.md` — F-01·F-02 구현 메모

### Reference Files

- `app/src/lib/normalize.ts`, `app/src/server/admin/songs.ts`(별칭 저장)
- `app/src/server/classes/index.ts`(`publiclyVisible`), `app/src/server/requests/index.ts`(90일 집계)

## Architecture

### User Flow

```text
홈 [추고 싶은 곡이나 아티스트] → /search (칸에 바로 입력)
  치기 ─0.25초 멈춤→ /search?q=… (주소 바꿈) → 서버가 결과 그림
    ├─ 비어 있음: 안내
    ├─ 결과: 곡 줄(썸네일·곡명·아티스트·클래스 N개 / N명이 기다려요) → /song/{slug}
    └─ 없음: "아직 올빗에 없는 곡이에요"

운영자 클래스 등록: [곡 찾기] → 후보 → 고르기 → (다른 곡도 배워요, 최대 3) → songIds 숨은 값
```

### Domain Model

```text
searchSongs(raw, limit)
  q = normalizeAlias(raw)            (비면 [])
  hits = song_aliases.alias_norm LIKE %q%  → 곡 점수 6/4/2 (정확/앞/포함)
       ∪ artist_aliases.alias_norm LIKE %q% → 그 아티스트 곡 점수 5/3/1
  곡별 최고 점수, 병합 곡·아티스트 제외
  + 다가오는 공개 클래스 수(publiclyVisible), 기다리는 수(90일)
  정렬: 점수 → 클래스 수 → 기다리는 수 → 곡명, 최대 limit
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 검색 화면과 홈 입구부터 만든다
- 실제 화면이 안쪽 설계를 끌어준다. 곡 줄에 필요한 값이 정해진 뒤 검색 함수의 반환을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 검색 화면·홈 입구

`/search`: 위에 로고와 검색 칸(자동 포커스, 0.25초 쉬면 `router.replace`, 찾는 중 표시), 본문은 `<Suspense>` 안에서 `searchParams` → 결과. `SongRow`. 홈 소개 줄 아래 검색 입구 링크. 메타데이터는 검색 결과 색인 제외.

Mocking 상태: Step 2와 바로 이어 진행해 고정 데이터를 커밋하지 않는다.

### Step 2: 곡 검색 서버

`searchSongs`: 정규화, 점수 SQL(두 별칭 테이블), 병합 제외, 클래스·기다리는 수는 drizzle로 `publiclyVisible`·90일 조건을 다시 쓴다.

Mocking 상태: 없음 (dev DB).

### Step 3: 운영자 곡 고르기

`searchSongsForClassAction`(운영자, 8개), `SongPicker`(기본 한 칸, 최대 세 칸, 빼기, 결과 없음 → `/admin/songs/new` 새 창), 클래스 등록 폼 교체, 쓰지 않게 된 `listSongOptions` 제거.

Mocking 상태: 없음.

### Step 4: 마무리

design.md·docs/03 갱신, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Manual Test

1. `/search` 모바일 375px: 빈 검색어 안내, "neon"·"네온"·"a2o lite"·"에이투오"·아티스트명·없는 말, 곡 상세 갔다 뒤로, 주소 새로 열기
2. 홈 검색 입구
3. 순서 규칙은 읽기 전용 SQL로 확인 (DB를 바꾸지 않는다. 데이터가 부족하면 트랜잭션 안 가짜 데이터 후 되돌림)
4. 운영자 곡 고르기는 화면 모양을 가짜 데이터로 보고, 실제 저장은 운영자 로그인으로 사용자 확인

## Considerations

### 기존 코드 재사용

정규화·별칭·공개 조건·90일 집계·영상 규칙을 그대로 쓴다.

### 호환성

클래스 등록의 `songIds` 폼 값과 서버 검증은 그대로다(숨은 값으로 보낸다).
