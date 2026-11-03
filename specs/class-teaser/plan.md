# Implementation Plan: 강사 티저 영상

## Summary

`classInput`에 `teaserUrl`을 더하고, 등록·수정 전에 `src/server/youtube`로 영상 ID와 퍼가기 가능 여부를 확인해 `teaser_video_id`에 저장한다. 폼 둘(강사·운영자)에 입력 칸을, 클래스 상세 맨 위에 티저 카드를 붙인다. 스키마는 바꾸지 않는다.

## Requirements

1. 입력·확인·저장·초기값 (FR-1~4)
2. 클래스 상세 티저 카드 (FR-5)
3. 운영 상세 링크 (FR-6)

## Critical Files

### New Files

없음

### Modified Files

- `app/src/server/youtube/index.ts` — `VIDEO_ERROR` 문구, `resolveVideoId(url)`(비움 → null, 확인 실패 → 이유)
- `app/src/server/admin/songs.ts` — `VIDEO_ERROR`를 youtube 모듈에서 가져온다
- `app/src/server/admin/classes.ts` — `classInput.teaserUrl`, `createClass` 저장, `EncoreSource.teaserVideoId`
- `app/src/server/instructors/classes.ts` — `updateMyClass` 저장
- `app/src/server/classes/index.ts` — `ClassDetail.teaserVideoId`
- `app/src/app/me/classes/{class-form.tsx,actions.ts}`, `app/src/app/admin/classes/new/class-form.tsx`, `app/src/app/admin/actions.ts` — 입력 칸·읽기
- `app/src/app/class/[id]/class-view.tsx` — 맨 위 티저
- `app/src/app/admin/classes/[id]/page.tsx` — 티저 링크
- `docs/03` F-25 메모, `specs/README.md`

### Reference Files

- `app/src/server/admin/songs.ts:240`(`setSongVideo`), `app/src/components/video-card.tsx`

## Architecture

### User Flow

```text
강사 폼 / 운영자 폼
  … 설명
  티저 영상 링크 (선택) [https://youtu.be/…]   ← 수정·복사·앵콜이면 기존 링크
  [등록]  → 거절: "YouTube 영상 링크가 아니에요" / "퍼가기가 막힌 영상이에요" / "영상을 찾을 수 없어요"

/class/{id}
  [티저 VideoCard  TEASER · 강사명]   ← 있으면. 없으면 대표 곡 VideoCard
  상태 · 제목 · 곡 칩 …
```

### Event Flow

```text
createClassAction / createMyClassAction / updateMyClassAction
  readForm → teaserUrl
  classInput.parse
  teaserVideoId = await resolveVideoId(teaserUrl)   ← 트랜잭션 전. 비면 null, 실패면 AdminInputError
  insert/update classes.teaser_video_id
```

### Domain Model

```text
classInput + teaserUrl: string | null (optionalText 300)
EncoreSource + teaserVideoId: string | null   → 폼 초기값 https://youtu.be/{id}
ClassDetail  + teaserVideoId: string | null
youtube.resolveVideoId(url | null) → string | null  (throws { reason })
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 상세의 티저 카드와 폼 칸이 먼저 보인다
- 실제 화면이 안쪽 설계를 끌어준다. 카드에 필요한 값(ID)과 폼에 필요한 값(링크)이 저장 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오 1~8을 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 서버

youtube 모듈 정리, 입력·확인·저장, 폼 소스·상세 타입.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 확인. 영상 확인은 실제 YouTube oEmbed.

### Step 2: 화면

폼 둘의 입력 칸, 액션의 읽기, 클래스 상세 맨 위, 운영 상세 링크.

Mocking 상태: 없음.

### Step 3: 마무리

docs/03 F-25 메모, `specs/README.md`, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

되돌리는 트랜잭션 안에서 가짜 강사로 등록(링크 있음·없음·YouTube 아님·없는 영상), 수정(바꾸기·비우기), 복사 소스를 서버 함수로 확인한다.

### Manual Test

1. dev DB 클래스에 티저를 되돌리는 트랜잭션 밖에서 넣지 않는다. 대신 `ClassView`에 가짜 값을 넣은 임시 페이지(커밋 안 함)에서 맨 위 카드를 375px로 본다
2. 실제 폼 입력은 사용자 확인

## Considerations

### 기존 코드 재사용

`parseYouTubeVideoId`, `lookupVideo`, `VideoCard`, `optionalText`, `getEncoreSource` → 폼 소스.

### 호환성

스키마 변경 없음. 기존 클래스는 티저 null이라 화면이 그대로다. `EncoreSource`에 칸이 늘어 운영 상세·폼 소스는 자동으로 받는다.
