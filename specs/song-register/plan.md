# Implementation Plan: 수강생 신규 곡 등록

## Summary

검색 결과 없음에 클라이언트 패널(`NewSongPanel`)을 붙여 로그인·동의·곡 만들기 시트를 처리하고, 서버 액션이 `src/server/songs/register.ts`의 `registerSong`을 부른다. `registerSong`은 운영자의 `findOrCreateSong`에 `{ reviewStatus: "pending", createdBy }` 옵션을 더해 같은 중복 규칙으로 만든다. 만든 뒤 `/song/{slug}?request=open`으로 보내 추가요는 기존 시트가 받는다. 스키마는 바꾸지 않는다.

## Requirements

1. 결과 없음의 길·핫한 곡 (FR-1, FR-8)
2. 곡 만들기 시트: 미리 채움·아티스트 제안·검증 (FR-2~3)
3. 로그인·동의·복귀 (FR-5)
4. 서버: 중복 규칙·검수 대기·만든 사람 (FR-4, FR-6, FR-10)
5. 곡 상세 추가요 시트로 (FR-7), 운영자 표시 (FR-9)

## Critical Files

### New Files

- `app/src/app/search/new-song-panel.tsx` — 길 버튼, 로그인 시트, 곡 만들기 시트(클라이언트)
- `app/src/app/search/actions.ts` — `registerSongAction`, `searchArtistsAction`
- `app/src/server/songs/register.ts` — `registerSong(userId, input)`

### Modified Files

- `app/src/app/search/page.tsx` — 결과 없음에 패널·핫한 곡, 로그인 여부 읽기
- `app/src/server/admin/songs.ts` — `saveSong`·`findOrCreateSong`에 검수 상태·만든 사람 옵션, 목록에 검수 상태
- `app/src/server/songs/search.ts` — `searchArtists`
- `app/src/app/admin/page.tsx`(곡 목록) — 검수 대기 표시
- `docs/03-기능명세서.md`, `_agent/rules/design.md` — 메모

### Reference Files

- `app/src/app/song/[slug]/request-panel.tsx`(로그인 시트·동의 복귀·자동 열기), `app/src/app/song/[slug]/actions.ts`(액션 첫 부분)
- `app/src/app/admin/classes/new/song-picker.tsx`(운영자 새 곡 문구)
- `wireframes/index.html` U-02c

## Architecture

### User Flow

```text
/search?q=곡 → 결과 없음
  "아직 올빗에 없는 곡이에요" [이 곡 추가요!]   + 이런 곡은 어때요? (핫한 곡 ≤3)
    비로그인 → 로그인 시트 → 카카오 → /auth/callback?next=/search?q=곡&newsong=open → 시트 자동 열림
    로그인   → 곡 만들기 시트: 곡 이름(미리 채움) · 아티스트(datalist 제안) · [만들고 추가요!]
                 동의 전 → /welcome?next=/search?q=곡&newsong=open → 돌아와 시트 자동 열림
                 저장 → /song/{slug}?request=open (추가요 시트 열림, 기다리는 수 0 또는 기존)
```

### Domain Model

```text
registerSong(userId, { title, artistName })
  └ findOrCreateSong(input, { reviewStatus: "pending", createdBy: userId })
      ├ 같은 아티스트(별칭) × 같은 곡명(별칭) 있음 → 그 곡 (existed)
      └ 없음 → saveSong(…, opts): 아티스트 찾기/만들기 → songs insert(reviewStatus, createdBy) → 별칭
  → { slug, existed }

searchArtists(q) → artist_aliases.alias_norm LIKE %q% ⋈ artists(병합 제외) → 이름 ≤5 (정확 > 앞부분 > 포함)
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 결과 없음의 길과 시트부터 만든다
- 실제 화면이 안쪽 설계를 끌어준다. 시트가 필요한 값(slug·existed·consentRequired)이 액션·서버 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 결과 없음 패널·핫한 곡

`NewSongPanel`(버튼·로그인 시트·만들기 시트·자동 열기·동의 복귀), 결과 없음에 핫한 곡.

Mocking 상태: Step 2와 바로 이어 진행해 고정 데이터를 커밋하지 않는다.

### Step 2: 서버 액션·곡 만들기·아티스트 찾기

`registerSongAction`·`searchArtistsAction`, `registerSong`, `saveSong`·`findOrCreateSong` 옵션, `searchArtists`.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 가짜 사용자로 확인.

### Step 3: 운영자 표시·마무리

곡 목록 검수 대기 표시, docs/03 F-13·F-02 메모, design.md, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

`registerSong`은 되돌리는 트랜잭션 안에서: 새 곡 → `pending`·`createdBy`, 같은 곡(별칭 표기 다름) → `existed`, 운영자 `findOrCreateSong`은 `confirmed`, 빈 입력 거절. `searchArtists`는 별칭으로 찾기.

### Manual Test

1. 비로그인 `/search?q=없는곡` 375px: 안내·길·핫한 곡, 길 → 로그인 시트
2. `?newsong=open`으로 시트 자동 열림(로그인 필요 → 가짜 데이터 미리보기로 시트 모양)
3. 실제 만들기·곡 상세 이동은 로그인이 필요해 사용자 확인

## Considerations

### 기존 코드 재사용

`findOrCreateSong`·`saveSong`(중복·아티스트·별칭), `normalizeAlias`, `startKakaoLogin`·`consentPath`, `BottomSheet`·`StickerButton`·`SongRow`, `listHotSongsThisWeek`.

### 호환성

스키마 변경 없음. 운영자 새 곡은 옵션 기본값으로 지금과 같이 `confirmed`. 검색 결과 없음 화면이 바뀐다.
