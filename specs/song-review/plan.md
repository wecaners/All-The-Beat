# Implementation Plan: 운영자 곡 검수와 병합

## Summary

`src/server/admin/songs.ts`에 검수 확인·곡 병합(트랜잭션)·아티스트 목록·이름 수정·병합을 더하고, 운영 화면에 곡 목록(`/admin/songs?review=`)·곡 상세의 검수·병합 섹션·아티스트 페이지를 만든다. 스키마는 바꾸지 않는다.

## Requirements

1. 곡 목록 필터·만든 사람·홈 안내 (FR-1)
2. 검수 확인 (FR-2)
3. 곡 병합: 미리보기·확인·트랜잭션·캐시 (FR-3~5)
4. 아티스트 이름·병합 (FR-6~7)
5. 운영자 권한 (FR-8)

## Critical Files

### New Files

- `app/src/app/admin/songs/page.tsx` — 곡 목록(필터)
- `app/src/app/admin/songs/review-forms.tsx` — 확인 버튼·병합 폼(클라이언트)
- `app/src/app/admin/artists/page.tsx`, `app/src/app/admin/artists/artist-forms.tsx` — 아티스트 목록·이름·병합

### Modified Files

- `app/src/server/admin/songs.ts` — 목록에 상태·만든 사람·날짜, 상세에 상태·만든 사람·병합 미리보기, `confirmSong`, `mergeSong`, `listArtistsForAdmin`, `renameArtist`, `mergeArtist`
- `app/src/app/admin/actions.ts` — 액션 넷
- `app/src/app/admin/page.tsx` — 검수 대기 안내, 곡 표는 그대로
- `app/src/app/admin/songs/[id]/page.tsx` — 검수·병합 섹션
- `app/src/app/admin/layout.tsx` — 아티스트 메뉴
- `docs/03-기능명세서.md` — F-16 메모

### Reference Files

- `app/src/server/admin/songs.ts`(`saveSong`·`addAliases`·`findOrCreateArtist`), `app/src/server/songs/index.ts`(`getSongBySlug`)
- `app/src/app/admin/instructors/apply-forms.tsx`(운영 폼 패턴)

## Architecture

### User Flow

```text
/admin  "검수 대기 N곡 ›" → /admin/songs?review=pending
  표: 곡 · 아티스트 · 만든 사람(수강생/강사/운영자) · 만든 날 · 영상 · 검수   [전체] [검수 대기]
  → /admin/songs/{id}
    [검수] 상태·만든 사람 · [확인]
    [다른 곡으로 합치기] 대상 검색 → 고르면 "클래스 N개 · 추가요 M건이 옮겨져요" → [합치기] (confirm) → /admin/songs/{대상}
/admin/artists
  표: 이름 · 곡 수 · 별칭   이름 수정 폼 · 합치기(대상 select, confirm)
```

### Domain Model

```text
confirmSong(id) → reviewStatus confirmed
mergeSong(fromId, intoId) (tx)
  검사: from ≠ into, 둘 다 존재, 둘 다 mergedIntoId null
  class_songs: into가 이미 있는 클래스의 from 행 삭제 → 나머지 songId = into
  requests:    into에 같은 사용자가 있는 from 행 삭제(dropped) → 나머지 songId = into
  song_aliases: into에 같은 aliasNorm이 있는 from 행 삭제 → 나머지 songId = into, isPrimary false ; from 제목 별칭 추가(중복 무시)
  events: songId from → into
  songs(from): mergedIntoId = into, reviewStatus confirmed
  → { movedClasses, movedRequests, droppedRequests, slugs }
listArtistsForAdmin → id·name·slug·songCount·aliases(merged 제외)
renameArtist(id, name) → artists.name + primary alias(alias·aliasNorm) ; 충돌 시 오류
mergeArtist(fromId, intoId) (tx) → songs.artistId, artist_aliases(충돌 건너뜀, from 이름 추가), artists(from).mergedIntoId
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 목록 필터·상세 섹션부터
- 실제 화면이 안쪽 설계를 끌어준다. 미리보기에 필요한 수(클래스·추가요)가 서버 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 서버 — 검수·병합·아티스트

목록·상세 확장, `confirmSong`, `mergeSong`, 아티스트 셋.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인.

### Step 2: 운영 화면과 액션

곡 목록 페이지·홈 안내, 곡 상세 검수·병합 섹션, 아티스트 페이지, 메뉴, 액션.

Mocking 상태: 없음.

### Step 3: 마무리

docs/03 F-16 메모, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

되돌리는 트랜잭션 안에서: 곡 A·B·클래스(A와 B 모두 배우는 것 포함)·추가요(겹치는 사용자 포함)·별칭(겹침 포함)을 만들고 A→B 병합 → 이동·삭제 수, A `mergedIntoId`, slug `merged`, 검색·랭킹 제외, 자기 자신·합쳐진 곡·순환 거절. 아티스트 이름 수정·병합.

### Manual Test

운영 화면은 로그인이 필요해 임시 페이지에서 폼 모양만 375px/데스크톱으로 확인. 실제 동작은 사용자 확인.

## Considerations

### 기존 코드 재사용

`saveSong`·`addAliases`·`normalizeAlias`·`searchSongsForClassAction`·`ActionButton`·`Table`·`Result`.

### 호환성

스키마 변경 없음. 수강생 화면은 이미 병합 곡을 거른다. `listSongsForAdmin`에 열이 늘어난다.
