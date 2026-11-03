# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-03: 필터 날짜(오늘/이번 주/이번 주말/직접 선택, 기본 오늘 이후 전체)·권역(다중)·난이도(입문/초급/중급 이상). 정렬은 가까운 날짜순 하나. 기본은 모집중·마감 임박만, "마감된 클래스도 보기" 토글. 종료·취소는 안 보임. 20개씩 무한 스크롤. 필터는 URL 쿼리. 0개면 "조건을 줄여보세요" + 초기화
- F-01: 다가오는 클래스 → 더보기. F-02: 엔터 → F-03 (검색어 적용)
- U-03(04 IA): `/classes?q=&date=&region=&level=`, 권한 없음. 들어오는 길 U-02(엔터)·홈 더보기, 나가는 길 U-05
- 와이어프레임 U-03a·b: 날짜 칩 줄 + 권역·난이도, "N개 클래스 · 가까운 날짜순", [마감 포함] 스위치, 날짜 헤더로 묶음, 마감 카드는 흐리게 + "마감 · 앵콜 9". 썸네일은 열린 질문

## Research Findings

### 코드베이스 구조

- 홈 `listUpcomingClasses`(`app/src/server/classes/index.ts`): `upcomingAndOpen`(open·closing_soon, 시작 전, `publiclyVisible`) + 대표 곡(position 1) join, `starts_at, id` 순. 목록은 이 쿼리에 필터·커서를 더한 꼴이다
- 검색 `searchSongs`(`app/src/server/songs/search.ts`): 곡·아티스트 별칭으로 곡 id와 점수를 찾는 SQL이 함수 안에 있다. 목록의 검색어 필터는 같은 SQL로 곡 id를 얻어 `class_songs`로 거른다
- 앵콜 수는 `activeEncoreCount(classes.id)`(`app/src/server/encores/index.ts`) SQL 식 하나로 select에 끼울 수 있다
- 인덱스 `classes_status_starts_at_idx`(status, starts_at, 숨김 제외), `classes_region_starts_at_idx`, `class_songs_song_idx`가 있다
- `ClassTicket`(클라이언트)은 `href·title·startsAt·meta·detail·thumbnailUrl·badge·index`. 홈이 "곡명 · 아티스트" 제목으로 쓴다
- 시간은 전부 KST(`src/lib/format.ts`). KST는 UTC+9 고정이라 날짜 경계를 JS에서 `T00:00:00+09:00`으로 만들 수 있다
- 검색 칸 `SearchBox`는 엔터에 `go(value)`로 `/search?q=`를 바꾼다. 목록으로 가는 엔터는 여기서 바꾼다

### 기존 패턴

- 주소를 읽는 화면(검색·랭킹)은 `<Suspense>` 안 서버 컴포넌트가 `searchParams`를 읽는다. 고르는 상태는 링크로 주소를 바꾼다(랭킹 권역 칩)
- 서버 액션은 `{ ok, ... }` 모양을 돌려주고 클라이언트가 `useTransition`으로 부른다
- 결과 목록에는 착착 붙기를 쓰지 않는다(검색)

## Resources

### 문서

- F-03: `docs/03-기능명세서.md:133`, F-01 더보기: `docs/03-기능명세서.md:93`, F-02 엔터: `docs/03-기능명세서.md:114`
- U-03: `docs/04-IA.md:160`, 들어오는 길: `docs/04-IA.md:202`
- 와이어프레임: `wireframes/index.html:600`(U-03a), `wireframes/index.html:696`(U-03b)

### 코드 참조

- 다가오는 클래스: `app/src/server/classes/index.ts:226`, `publiclyVisible`: `app/src/server/classes/index.ts:23`
- 곡 검색 SQL: `app/src/server/songs/search.ts:29`
- 앵콜 수: `app/src/server/encores/index.ts:39`
- 티켓: `app/src/components/class-ticket.tsx`, 검색 칸: `app/src/app/search/search-box.tsx`

### API 엔드포인트

- 페이지 `GET /classes?q=&date=&region=&level=&closed=` (비로그인 가능)
- 서버 액션 `loadMoreClassesAction(query, cursor)`: 같은 필터로 다음 20개 (비로그인 가능, 읽기만)

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 주소: `q`(검색어) `date`(`today`·`week`·`weekend`·`YYYY-MM-DD`) `region`(권역 id를 `,`로) `level`(`intro`·`beginner`·`intermediate_plus`) `closed`(`1`). 모르는 값은 무시 | 04 IA 주소. 공유 가능해야 해서 상태는 전부 주소에 |
| 날짜 경계는 KST. 오늘 = KST 오늘 00:00~24:00, 이번 주 = 오늘~이번 주 일요일 끝, 이번 주말 = 다가오는 토·일(오늘이 일요일이면 오늘). 어느 경우든 시작이 지금 이후인 것만 | 원데이 클래스는 한국 시간으로 말한다. 일요일에 "이번 주말"이 비지 않게 |
| 기본 목록은 open·closing_soon에 시작 전. 마감 포함이면 closed도. 종료(ends_at 지남)·취소·시작한 클래스는 안 보인다 | F-03 표시 규칙. 홈 `upcomingAndOpen`과 같은 기준 |
| 검색어는 `searchSongs`의 곡 찾기 SQL을 떼어 내(`matchSongIds`) 곡 id를 얻고 `class_songs`로 거른다. 강사 이름은 안 찾는다 | F-02 구현 메모와 같은 범위. 같은 SQL이라 검색 결과와 목록이 어긋나지 않는다 |
| 권역·난이도·날짜 칩은 링크(주소 바꾸기). 권역은 여러 개라 누를 때마다 `region`에 넣고 뺀다. 날짜 직접 고르기는 달력 시트(`Calendar`)에서 하루를 고르면 주소를 바꾼다 | 랭킹과 같은 방식. 시트·적용 버튼 없이 한 번에 반영된다. 처음엔 브라우저 기본 날짜 입력이었는데 사용자 피드백으로 달력 시트로 바꿨다(Learnings) |
| 20개씩, 끝에 닿으면 서버 액션으로 다음 20개를 이어 붙인다. 커서는 마지막 항목의 `(starts_at, id)`. 동작 줄이기·관찰 실패에 대비해 "더 보기" 버튼도 둔다 | F-03 무한 스크롤. 주소 `page=`는 공유 시 중간 페이지가 열려 어색하다 |
| 목록은 클라이언트 컴포넌트가 들고(첫 20개는 서버가 넘김) 날짜 헤더로 묶는다 | 이어 붙인 항목도 같은 날짜 묶음에 들어가야 한다 |
| 카드는 홈과 같은 `ClassTicket`(썸네일 포함). 제목 "곡명 · 아티스트", 둘째 줄 "시간 · 권역 · 강사", 셋째 줄 "가격 · 난이도" | 와이어프레임의 열린 질문(썸네일)은 홈과 같은 모양으로 닫는다. 화면마다 다른 티켓을 만들지 않는다 |
| 마감 카드는 흐리게, 배지 "마감"에 앵콜이 있으면 "마감 · 앵콜 N" | 와이어프레임 U-03a. 수는 `activeEncoreCount`로 읽을 때 센다 |
| 결과 0개: 조건 줄이기 안내 + [조건 초기화](검색어는 남김). 검색어가 곡에 걸렸는데 클래스가 없으면 그 곡 상세(추가요)로 가는 버튼 | F-03 수용 기준, F-02 "결과 없음 → 추가요" |
| 검색 칸 엔터는 `/classes?q=`로 간다. 치는 동안의 자동 결과는 그대로 | F-02 "엔터 → F-03" |
| 홈 다가오는 클래스 머리에 "전체 보기" 링크(`/classes`) | F-01 더보기 |
| 클래스 상세의 "같은 곡 다른 클래스"는 그대로 곡 상세로 | 거기 다가오는 클래스가 있다(README에서 사용자에게 알림) |

## Issues Encountered

### 1. `new Date()` while prerendering

**문제**:

`/classes`가 `searchParams`를 읽는데도 개발 서버 로그에 "unstable value `new Date()` while prerendering"이 났다.

**원인**:

날짜 경계 계산의 기본 인수 `now = new Date()`가 요청 시각 접근(`connection()`) 없이 평가됐다. `searchParams`를 읽는 것만으로는 그 뒤의 "지금 시각"이 요청 시각으로 묶이지 않는다.

**해결**:

목록 서버 컴포넌트 첫 줄에 `await connection()`.

**결과**:

해결됨 (이후 요청 로그에 오류 없음)

## Learnings

### 브라우저 기본 입력은 스크랩북 톤에서 튄다 (2026-11-03)

날짜 직접 고르기를 `<input type="date">`로 두었더니 사용자가 "너무 기본 UI 같다"고 했다. 입력 UI도 다이어리에 있을 물건(월간 달력, 도장처럼 찍히는 날짜)으로 만든다. 기능이 같아도 기본 위젯은 화면의 톤을 깨므로 처음부터 부품으로 만드는 편이 낫다.

### "지금"을 쓰는 화면은 주소를 읽어도 `connection()`이 필요하다 (2026-11-03)

Cache Components에서 `searchParams`를 읽는 것과 "지금 시각"을 쓰는 것은 별개다. 오늘·이번 주 같은 계산이 들어가면 `await connection()`을 먼저 둔다(app.md의 "요청마다 달라야 하는 데이터" 규칙이 시각에도 적용된다).

### 커서는 DB 정밀도에 맞춰 자른다 (2026-11-03)

`timestamptz`는 마이크로초, JS `Date`는 밀리초다. 마지막 항목의 시각을 그대로 커서로 쓰면 같은 밀리초 안의 행이 겹치거나 빠진다. 정렬과 비교를 둘 다 `date_trunc('milliseconds', …)`로 맞췄고, 같은 시각 25개로 확인했다.

### 날짜 문자열 검증은 되돌려 비교한다 (2026-11-03)

`new Date("2026-02-30T00:00:00+09:00")`은 3월 2일이 된다. `YYYY-MM-DD`가 진짜 날인지는 Date로 만든 뒤 다시 KST 문자열로 돌려 같은지 본다. `2026-13-01`은 Invalid Date라 `Intl`이 던지므로 그 전에 `isNaN`을 본다.
