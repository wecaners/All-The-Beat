# Implementation Plan: 클래스 목록·필터

## Summary

`/classes` 페이지가 주소의 조건을 파싱해 `src/server/classes`의 목록 함수를 부르고, 클라이언트 목록 컴포넌트가 첫 20개를 받아 날짜별로 묶어 그리며 끝에 닿으면 서버 액션으로 다음 20개를 이어 붙인다. 조건 칩은 주소를 바꾸는 링크다. 검색어는 검색의 곡 찾기 SQL을 떼어 내 같이 쓴다. 스키마는 바꾸지 않는다.

## Requirements

1. 입구(홈 전체 보기, 검색 엔터), 비로그인 (FR-1~2)
2. 기본 목록·정렬·묶음·항목·이어 보기 (FR-3~6)
3. 조건: 날짜·권역·난이도·검색어·마감 포함·주소 (FR-7~11)
4. 결과 없음 (FR-12)

## Critical Files

### New Files

- `app/src/app/classes/page.tsx` — 목록 화면(머리·조건 칩·첫 20개)
- `app/src/app/classes/filters.tsx` — 조건 칩 줄(링크)과 날짜 직접 고르기(클라이언트)
- `app/src/app/classes/class-list.tsx` — 날짜별 묶음·이어 붙이기(클라이언트)
- `app/src/app/classes/actions.ts` — 다음 20개 서버 액션
- `app/src/server/classes/list.ts` — 조건 파싱(zod)·날짜 경계·목록 쿼리·커서

### Modified Files

- `app/src/server/songs/search.ts` — 곡 찾기 SQL을 `matchSongIds`로 분리
- `app/src/app/search/search-box.tsx` — 엔터 → `/classes?q=`
- `app/src/app/home-view.tsx` — 다가오는 클래스 머리에 전체 보기
- `_agent/rules/design.md`, `docs/03-기능명세서.md` — 메모

### Reference Files

- `app/src/server/classes/index.ts`(`upcomingAndOpen`, `listUpcomingClasses`), `app/src/server/encores/index.ts`(`activeEncoreCount`)
- `app/src/app/requests/page.tsx`(주소 칩), `app/src/components/class-ticket.tsx`
- `wireframes/index.html` U-03a·b

## Architecture

### User Flow

```text
홈 [전체 보기] ─┐
검색 칸 엔터 ──┴→ /classes?q=&date=&region=&level=&closed=
  [오늘] [이번 주] [이번 주말] [날짜 ▾]   ← 링크, 하나만. 날짜 ▾는 <input type=date>
  [홍대·합정] [강남·역삼] …              ← 링크, 여러 개 토글
  [입문] [초급] [중급 이상]              ← 링크, 하나만
  N개 클래스 · 가까운 날짜순   [마감 포함]  ← 링크 토글
  ── 11월 4일 (수) ──
  🎫 NEON · A2O LITE / 19:30~21:00 · 홍대·합정 · 민지 / 35,000원 · 입문 [마감 임박]
  🎫 (흐림) … [마감 · 앵콜 9]
  ── 11월 7일 (토) ──
  …  (끝에 닿으면 다음 20개, 또는 [더 보기])
  항목 → /class/{id}
  0개: "조건에 맞는 클래스가 없어요" [조건 초기화]  (+ 검색어 곡이 있으면 [이 곡 추가요하러])
```

### Domain Model

```text
parseClassListQuery(searchParams) → ClassListQuery
  q: 50자, date: today|week|weekend|YYYY-MM-DD, region: id[], level, closed: boolean

dateRange(query.date, now) → { from, to } (KST 경계, UTC 인스턴트)

listClasses(query, cursor?, limit = 20)
  classes ⋈ instructor_profiles(publiclyVisible) ⋈ regions ⋈ class_songs(position 1) ⋈ songs ⋈ artists
  status ∈ open·closing_soon (+closed if closed) ∧ starts_at > now
  ∧ starts_at ∈ [from, to)  ∧ region_id ∈ region[]  ∧ level = level
  ∧ (q 있으면) id ∈ (select class_id from class_songs where song_id ∈ matchSongIds(q))
  ∧ (cursor 있으면) (starts_at, id) > (cursor.startsAt, cursor.id)
  select …, encoreCount = activeEncoreCount(classes.id)
  order by starts_at, id limit 21 → items 20 + nextCursor
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 목록 화면과 칩부터 만든다
- 실제 화면이 안쪽 설계를 끌어준다. 항목에 필요한 값(강사·앵콜 수)과 이어 붙이기가 서버 반환 모양과 커서를 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 목록 화면·조건 칩·입구

`/classes`: 머리(로고·"Classes"), 조건 칩 줄 세 개와 마감 포함, 개수 줄, `<Suspense>` 안에서 주소를 읽어 첫 20개. 홈 전체 보기, 검색 엔터.

Mocking 상태: Step 2와 바로 이어 진행해 고정 데이터를 커밋하지 않는다.

### Step 2: 목록 서버·조건 파싱·검색어

`src/server/classes/list.ts`와 `matchSongIds` 분리.

Mocking 상태: 없음 (dev DB). 되돌리는 트랜잭션 안에서 가짜 클래스로 확인.

### Step 3: 이어 붙이기

클라이언트 목록 + 서버 액션. 끝에 닿으면(IntersectionObserver) 다음 20개, 버튼 대비.

Mocking 상태: 없음.

### Step 4: 마무리

docs/03 F-03·F-01·F-02 구현 메모, design.md, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

목록 함수·조건 파싱·날짜 경계는 되돌리는 트랜잭션 안에서 가짜 클래스(날짜·권역·난이도·상태·숨김·곡)로 확인한다. 커서로 이어 붙인 결과가 빠짐·겹침 없는지 본다.

### Manual Test

1. 비로그인 `/classes` 375px: 칩·목록·날짜 묶음·결과 없음, 가로 넘침 없음
2. 칩 → 주소 바뀜, 새로 고침 유지, 모르는 값 무시
3. 끝까지 내려 이어 붙기(가짜 데이터 미리보기)
4. 홈 전체 보기, 검색 엔터

## Considerations

### 기존 코드 재사용

`publiclyVisible`, `upcomingAndOpen`의 조건, `activeEncoreCount`, `searchSongs`의 곡 찾기 SQL, `ClassTicket`, 랭킹의 주소 칩 방식.

### 호환성

스키마 변경이 없다. `searchSongs`는 결과가 같고 내부만 나뉜다. 검색 엔터의 목적지가 바뀐다.
