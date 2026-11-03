# Implementation Plan: 추가요 랭킹

## Summary

`/requests` 페이지가 주소의 권역을 읽어 `src/server/requests`의 랭킹 함수를 부르고, 곡 한 줄 부품(`SongRow`)에 순위 스티커와 추가요 버튼 자리를 더해 그린다. 순위 변화는 7일 전 시점의 랭킹을 같은 규칙으로 다시 계산해 견준다. 스키마는 바꾸지 않는다.

## Requirements

1. 홈 더보기, 비로그인 랭킹 (FR-1~2)
2. 집계·순위·변화·클래스 수 (FR-3~7)
3. 권역별·주소 (FR-8~9)
4. 곡 상세·추가요·검색 입구·빈 화면 (FR-10~13)

## Critical Files

### New Files

- `app/src/app/requests/page.tsx` — 랭킹 화면(권역 칩·검색 입구·목록·빈 화면)

### Modified Files

- `app/src/server/requests/index.ts` — 랭킹 함수(권역별, 지난주 순위, 이번 주 증가, 클래스 수)
- `app/src/components/song-row.tsx` — 순위 스티커(`badge`)·오른쪽 버튼(`action`) 자리
- `app/src/app/home-view.tsx` — TOP 5 머리에 랭킹 더보기
- `_agent/rules/design.md` — `SongRow` 설명
- `docs/03-기능명세서.md` — F-08·F-01 구현 메모

### Reference Files

- `app/src/server/songs/search.ts`(다가오는 클래스 수), `app/src/server/classes/index.ts`(`publiclyVisible`)
- `app/src/app/search/page.tsx`(주소 읽기), `app/src/app/song/[slug]/page.tsx`(권역 캐시)
- `wireframes/index.html` U-06a

## Architecture

### User Flow

```text
홈 추가요 TOP 5 [랭킹 더보기] → /requests
  [전체] [홍대·합정] [강남·신논현] …  ← 링크. 고르면 /requests?region=<id>
  [원하는 곡이 없나요? 검색해서 추가요] → /search
  1 ▲1  [썸네일] 곡명 / 아티스트 · 23명이 기다려요 · 이번 주 +6 / [클래스 2개 열림]   [나도 추가요!]
  2 NEW [썸네일] 곡명 / …                                        / [아직 클래스 없음]  [나도 추가요!]
  곡 누르면 → /song/{slug}
  [나도 추가요!] → /song/{slug}?request=open (시트 자동 열림, 로그인·동의는 거기서)
  비었으면: "아직 랭킹에 오른 곡이 없어요. 3명이 모이면 올라와요" + [곡 찾으러 가기]
```

### Domain Model

```text
listRequestRanking(regionId | null, limit = 50)
  지금:   requests(취소 제외, created_at ≥ now-30d [, region_id = regionId]) ⋈ songs(병합 제외) ⋈ artists
          group by 곡 → waiting = count, weekGain = count(created_at ≥ now-7d), last = max(created_at)
          having count ≥ 3, order by count desc, last desc, limit 50 → rank 1..n
  지난주: requests(created_at < now-7d, created_at ≥ now-37d, 취소 안 함 또는 canceled_at ≥ now-7d [, region])
          같은 group·having·order·limit → prevRank
  클래스: class_songs ⋈ classes(open·closing_soon, 시작 전) ⋈ instructor_profiles(publiclyVisible) → upcomingClasses
  change: prevRank 없음 → new / prevRank > rank → up(prevRank-rank) / < → down / = → same
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 랭킹 화면과 홈 입구부터 만든다
- 실제 화면이 안쪽 설계를 끌어준다. 한 줄에 필요한 값(순위·변화·증가·클래스 수)이 서버 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 랭킹 화면·홈 입구

`/requests`: 머리(로고·"Ranking"), 제목·설명, 권역 칩 줄(링크, 가로 넘김), 검색 입구, `<Suspense>` 안에서 주소의 권역을 읽어 목록을 그린다. `SongRow`에 `badge`(순위 스티커, 썸네일 모서리)와 `action`(오른쪽 버튼) 자리를 더한다. 홈 TOP 5 머리에 더보기 링크.

Mocking 상태: Step 2와 바로 이어 진행해 고정 데이터를 커밋하지 않는다.

### Step 2: 랭킹 서버

`listRequestRanking`. 지금·지난주·클래스 수 세 쿼리를 함께 돌리고 JS에서 순위와 변화를 맞춘다.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 가짜 사용자·추가요로 확인.

### Step 3: 마무리

docs/03 F-08·F-01 구현 메모, design.md `SongRow`, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

랭킹 함수는 되돌리는 트랜잭션 안에서 가짜 사용자·추가요(지난주·이번 주·취소·권역)로 확인한다(specs/encore findings Learnings 방식). 홈 TOP 5와 1~5위가 같은지도 같은 트랜잭션에서 본다.

### Manual Test

1. 비로그인 `/requests` 375px: 칩·검색 입구·목록·빈 화면, 가로 넘침 없음
2. 권역 칩 → 주소 바뀜, 새로 고침 유지, 모르는 값 → 전체
3. [나도 추가요!] → 곡 상세 시트 자동 열림(비로그인이면 로그인 시트)
4. 홈 더보기 → 랭킹

## Considerations

### 기존 코드 재사용

`listTopRequestedSongs`의 집계 조건, `searchSongs`의 다가오는 클래스 수, `listRegions`, `SongRow`, 홈 TOP 5의 [나도 추가요!] 링크.

### 호환성

스키마 변경이 없다. `SongRow`는 새 속성이 없으면 지금과 같은 모양이다.
