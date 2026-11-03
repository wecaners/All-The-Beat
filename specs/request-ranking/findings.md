# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-08: 탭 전체/권역별, 기간 최근 30일 고정, 행에 순위·곡 커버·곡명·아티스트·추가요 수·이번 주 증가 수·상태("클래스 N개 열림"/"아직 없음"), 각 행에 [나도 추가요!]. 3명 미만 제외, 최대 50위. 강사 로그인 시 기능은 F-11·F-12와 함께
- F-01: 추가요 TOP 5 → F-08로 더보기
- F-07 진입점에 추가요 랭킹(F-08)
- U-06(04 IA): `/requests?region=`, 권한 없음. 홈 TOP 5 "더보기"에서 들어온다. 탭바는 아직 없다
- 와이어프레임 U-06a: 제목 "추가요 랭킹 / 최근 30일 동안 사람들이 가장 기다린 곡", 전체·권역별 탭, 권역 칩, "원하는 곡이 없나요? 검색해서 추가요", 행마다 순위 + 변화(–·▲1·▼1·NEW), 썸네일, 곡명, "아티스트 · 23명 · 이번 주 ▲6", "아직 클래스 없음"/"클래스 5개 열림", [나도 추가요!]

## Research Findings

### 코드베이스 구조

- 홈 TOP 5 `listTopRequestedSongs`(`app/src/server/requests/index.ts`): 최근 30일·취소 제외·병합 곡 제외, 수가 같으면 최근 요청이 들어온 곡 먼저. 랭킹도 같은 기준을 쓴다
- 검색 `searchSongs`(`app/src/server/songs/search.ts`)가 곡별 "다가오는 클래스 수"를 센다: `class_songs ⋈ classes(open·closing_soon, 미래) ⋈ instructor_profiles` + `publiclyVisible`. 랭킹의 "클래스 N개 열림"도 같은 기준
- `requests.region_id`가 NULL이면 "어디든 좋아요". 인덱스 `requests_song_created_idx`(song_id, created_at, 취소 제외)와 `requests_region_created_idx`(region_id, created_at)가 있다
- `requests.canceled_at`이 있어 "7일 전에는 살아 있었던 요청"을 되짚을 수 있다. 취소했다 다시 하면 `created_at`이 지금으로 바뀐다(`saveRequest`)
- 권역은 `listRegions()`(id·name·shortName, sortOrder 순). 곡 상세가 `"use cache"` + `cacheLife("days")`로 감싸 쓴다
- 홈 `SectionHead`는 제목·라벨·영문 라벨(zine)만 있고 링크 자리가 없다

### 기존 패턴

- 검색 화면: 주소(`?q=`)를 `<Suspense>` 안 서버 컴포넌트가 읽는다. 결과 목록에는 착착 붙기를 쓰지 않는다
- `SongRow`(검색·마이): 전체가 `<Link>`라 안에 버튼을 둘 수 없다. `status`·`meta`·`href`로 세 번째 줄과 둘째 줄을 바꾼다
- 홈 TOP 5의 [나도 추가요!]는 `/song/{slug}?request=open`으로 보낸다. 곡 상세 `RequestPanel`이 열자마자 시트를 열고, 로그인·약관 동의 흐름을 거친다
- 요청마다 달라지는 데이터는 `await connection()` 뒤에 읽는다(홈)

## Resources

### 문서

- F-08: `docs/03-기능명세서.md:257`, F-01 TOP 5 더보기: `docs/03-기능명세서.md:94`, F-07 진입점: `docs/03-기능명세서.md:227`
- U-06 주소: `docs/04-IA.md:164`, 들어오는 길: `docs/04-IA.md:206`
- 와이어프레임 U-06a: `wireframes/index.html:1099`

### 코드 참조

- TOP 5: `app/src/server/requests/index.ts:134`, 홈 TOP 5 화면: `app/src/app/home-view.tsx:108`
- 다가오는 클래스 수: `app/src/server/songs/search.ts:53`, `publiclyVisible`: `app/src/server/classes/index.ts:23`
- 권역: `app/src/server/regions/index.ts`, 곡 한 줄: `app/src/components/song-row.tsx`
- 검색 화면(주소 읽기): `app/src/app/search/page.tsx`

### API 엔드포인트

- 페이지 `GET /requests?region=<권역 id>` (비로그인 가능)
- 서버 액션 없음. 추가요는 곡 상세의 액션을 그대로 쓴다

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 집계 기준은 홈 TOP 5와 같다(최근 30일, 취소 제외, 병합 곡 제외, 같으면 최근 요청 먼저) | 홈 TOP 5와 랭킹 1~5위가 같아야 "더보기"가 말이 된다 |
| 지난주 순위는 7일 전 시점의 랭킹을 같은 규칙으로 다시 계산한다: 7일 전부터 30일 안에 만들어졌고, 그때 취소되지 않았던(취소 안 함 또는 `canceled_at`이 7일 안) 요청 | 순위를 따로 저장하지 않는다. 숫자를 두 곳에 두지 않는다(app.md). 취소 후 다시 한 요청은 `created_at`이 바뀌어 새 요청으로 잡히는데, 곡 상세·홈과 같은 해석이다 |
| 지난주 랭킹에도 3명 미만 제외·50위까지를 똑같이 적용하고, 거기 없던 곡은 NEW | "지난주 랭킹에 없었다"는 사용자가 보는 것과 같은 규칙이어야 한다 |
| 권역을 고르면 그 권역을 희망한 요청만 센다. "어디든 좋아요"(NULL)는 전체에만 들어간다 | 강사가 "이 동네에서 이 곡을 기다리는 사람"을 보는 용도. 어디든은 특정 권역의 수요라고 말할 수 없다 |
| 권역을 골라도 "클래스 N개 열림"은 권역과 상관없이 공개된 다가오는 클래스 수 | 클래스가 열렸는지는 곡의 사실이다. 권역별 클래스 수는 F-03 클래스 목록의 몫 |
| 주소는 `/requests?region=<권역 id>`. 없거나 모르는 값이면 전체 | 04 IA의 주소. 권역 id는 시드로 고정돼 있어 공유해도 바뀌지 않는다 |
| 권역 고르기는 라디오가 아니라 링크(주소 바꾸기) | 고른 권역이 주소에 남아야 한다(F-08 공유). 서버가 다시 그린다 |
| [나도 추가요!]는 `/song/{slug}?request=open`으로 보낸다 | 로그인·약관 동의·시트가 곡 상세 한곳에만 있게 한다(홈 TOP 5와 같다) |
| 랭킹 행은 `SongRow`에 순위 스티커(`badge`)와 오른쪽 버튼(`action`) 자리를 더해 쓴다 | 화면 파일에 비슷한 줄을 따로 만들지 않는다(design.md). 둘이 없으면 지금처럼 전체가 링크다 |
| 순위 변화는 올랐으면 ▲n, 내렸으면 ▼n, 새로 들어왔으면 NEW, 같으면 표시하지 않는다 | 와이어프레임의 "–"는 정보가 없어 뺀다. 이번 주 증가 수는 "+n"으로 써서 ▲(순위)와 구분한다 |
| 랭킹은 매 요청 읽는다(`connection()`). 권역 목록만 캐시 | 추가요 수는 요청마다 달라야 한다(app.md) |
| 홈 TOP 5 머리의 영문 라벨 자리에 "랭킹 더보기" 링크를 둔다 | 와이어프레임 U-01의 "랭킹 ›". 섹션 머리 오른쪽에 둘을 두면 어지럽다 |
| 홈 TOP 5에는 3명 미만 제한을 두지 않는다(그대로) | F-01에 그 규칙이 없고, 초기엔 1~2명짜리 곡도 홈에 보일 가치가 있다. 그런 곡은 홈에는 있고 랭킹에는 없다 |
| 랭킹 줄의 둘째 줄은 "아티스트 · N명"까지. 이번 주 증가는 썸네일에 붙인 스티커, 순위 변화는 셋째 줄 | 375px에서 오른쪽 버튼이 있는 줄의 글자 폭은 150px쯤이라 "이번 주 +6"까지 넣으면 보통 길이의 아티스트 이름에서도 잘린다 |

## Issues Encountered

(없음)

## Learnings

### 버튼이 있는 한 줄에는 글자 자리가 150px뿐이다 (2026-11-03)

375px 화면에서 썸네일(86px)과 오른쪽 버튼(62px)을 둔 줄은 글자에 150px쯤 남는다. 한 줄에 세 가지(아티스트·수·증가)를 넣으면 보통 길이의 이름에서도 잘린다. 숫자 하나는 포토카드 위 스티커로 옮기는 편이 스크랩북 컨셉에도 맞고 자리도 번다.
