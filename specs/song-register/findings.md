# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-13: 찾는 곡이 없을 때 곡명(필수)·아티스트(필수, 기존 아티스트 자동완성)·YouTube 링크(선택)로 신규 곡 등록. 바로 쓸 수 있고, 운영자 화면에 검수 대기로 쌓인다. 대표 영상은 운영자가 정한다. 곡 정보 외부 API 검색은 하지 않는다(2026-10-26)
- F-02: 결과 없음 → "추가요! 이 곡 열어주세요" → F-07. 수용 기준 "결과 없음에서 두 번 이내 탭으로 추가요"
- 05 유저플로우 추가요: 검색 결과 없음 → 신규 곡 등록 → 추가요 시트. "신규 곡 등록이 흐름을 끊지 않는다"
- 와이어프레임 U-02c: 결과 없음 안내 + [추가요! 이 곡 열어주세요] + "이런 곡은 어때요?" 두세 곡. 시트 "새 곡 추가요!"(곡 이름 미리 채움 → 아티스트 자동완성 → 희망 지역). 등록 곡은 검수 대기, 사용자는 바로 곡 상세
- U-04 메모: 결과 없음에서 신규 곡을 만들면 곡 상세로 오고 숫자 0 → "첫 추가요를 남겨 주세요"

## Research Findings

### 코드베이스 구조

- `findOrCreateSong(input)`(`app/src/server/admin/songs.ts`): 같은 아티스트(별칭 포함)에 같은 곡명(별칭 포함)이 있으면 그 곡, 없으면 `saveSong`으로 만든다. `saveSong`은 `reviewStatus: "confirmed"`로 고정하고 `createdBy`를 쓰지 않는다 → 수강생용으로는 둘을 바꿀 수 있어야 한다
- `songs.reviewStatus`(`pending`·`confirmed`, 기본 `pending`)와 `songs.createdBy`(profiles)가 스키마에 이미 있다. 마이그레이션이 필요 없다
- 운영자 곡 고르기(`admin/classes/new/song-picker.tsx`)가 `createSongForClassAction`으로 같은 함수를 부른다(운영자 전용)
- 검색 결과 없음(`app/src/app/search/page.tsx`)은 안내만 있다. `Results`는 `<Suspense>` 안 서버 컴포넌트라 `getCurrentUser()`를 읽을 수 있다
- 곡 상세 `RequestPanel`은 `?request=open`이면 로그인 상태에서 시트를 자동으로 연다. 로그인·약관 동의 뒤 복귀 주소에 같은 신호를 쓴다
- 로그인 시트·동의 복귀 패턴: `startKakaoLogin(돌아올 주소)`, 액션이 `consentRequired`를 돌려주면 `consentPath(돌아올 주소)`로
- 홈의 `listHotSongsThisWeek(limit)`가 이번 주 클래스 있는 곡을 준다 → "이런 곡은 어때요?"
- 아티스트 찾기는 `artist_aliases.alias_norm LIKE`로 `searchSongs`와 같은 정규화를 쓰면 된다

### 기존 패턴

- 서버 액션은 첫 부분에서 `getCurrentUser()`·`ensureProfile`·`hasConsented`를 거친다(추가요·앵콜)
- 입력 검증은 `src/server`의 zod 스키마(`quickSongInput`)
- 수강생 화면 부품: `BottomSheet`, `StickerButton`, `SongRow`

## Resources

### 문서

- F-13: `docs/03-기능명세서.md` "F-13. 곡 선택·신규 곡 등록", F-02 결과 없음: `docs/03-기능명세서.md:121`, F-16 검수: `docs/03-기능명세서.md` "F-16"
- 유저플로우: `docs/05-유저플로우.md:129`, `docs/05-유저플로우.md:273`
- 와이어프레임 U-02c: `wireframes/index.html:554`
- 운영자 새 곡 결정: `specs/search/findings.md:63`

### 코드 참조

- `findOrCreateSong`·`saveSong`: `app/src/server/admin/songs.ts:146`, `app/src/server/admin/songs.ts:242`
- 검색 결과 없음: `app/src/app/search/page.tsx:43`
- 추가요 패널 자동 열기·로그인·동의 복귀: `app/src/app/song/[slug]/request-panel.tsx:28`
- 곡 스키마: `app/src/db/schema/songs.ts` (`reviewStatus`, `createdBy`)

### API 엔드포인트

- 서버 액션(로그인 사용자) `registerSongAction(prev, formData)`: 곡명·아티스트 → `{ ok, slug, existed }` 또는 `consentRequired`
- 서버 액션(누구나, 읽기) `searchArtistsAction(query)`: 아티스트 이름 제안

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 곡만 만들고 곡 상세의 추가요 시트(`/song/{slug}?request=open`)로 잇는다. 새 곡 시트에서 권역은 받지 않는다 | 추가요 규칙(로그인·동의·시트·순번·완료 순간)이 한곳에만 있게. 와이어프레임의 한 시트 처리는 같은 입력을 두 곳에 두게 된다(README에서 사용자에게 알림) |
| 곡 만들기는 로그인 사용자만. `createdBy`에 남기고 `reviewStatus: "pending"` | 검수 때 누가 만들었는지 보고, 아무나 곡을 쌓지 못하게. 운영자가 만든 곡은 지금처럼 `confirmed` |
| `saveSong`·`findOrCreateSong`에 `{ reviewStatus, createdBy }` 옵션을 더하고, 수강생용 `registerSong(userId, input)`은 `src/server/songs/register.ts`에서 그 옵션으로 부른다 | 중복 판단·아티스트 묶기·별칭을 운영자와 같은 코드로. `AdminInputError`는 수강생용 오류로 바꿔 던진다 |
| 같은 곡이 이미 있으면 만들지 않고 그 곡 상세로 간다(`existed`) | 운영자 새 곡과 같은 규칙(specs/search). 검색에 안 걸렸어도 별칭 조합으로는 같은 곡일 수 있다 |
| 아티스트 제안은 `<datalist>`에 서버 액션 결과를 채운다. 치는 동안 250ms 멈추면 찾는다 | 브라우저 기본 자동완성이라 부품이 늘지 않는다. 다른 표기로 써도 서버가 같은 아티스트로 묶으므로 제안은 편의일 뿐이다 |
| 로그인·동의 뒤 복귀 주소는 `/search?q=<검색어>&newsong=open`. 시트가 자동으로 열리고 신호는 주소에서 지운다 | 추가요 패널의 `?request=open`과 같은 방식 |
| 결과 없음 화면에 "이런 곡은 어때요?"로 이번 주 핫한 곡 최대 3개(`SongRow`) | 와이어프레임 U-02c. 없으면 섹션을 숨긴다 |
| 운영자 곡 목록에 검수 대기 표시만 더한다. 필터·병합·승인은 F-16 | 이번 범위(README). 표시가 없으면 쌓이는 걸 아무도 모른다 |
| YouTube 링크는 받지 않는다 | README. 대표 영상은 운영자가 검수 때 정한다(F-13·F-16). 영상 전에는 기본 이미지가 이미 있다(`SongRow`·`SongCard`) |

## Issues Encountered

(없음)

## Learnings

### 운영자 전용 함수를 수강생이 쓰려면 "누가·어떤 상태로"만 옵션으로 연다 (2026-11-03)

`findOrCreateSong`은 중복 판단·아티스트 묶기·별칭을 다 갖고 있었다. 수강생용을 따로 만들면 규칙이 둘이 된다. 검수 상태와 만든 사람만 옵션(`SongOrigin`)으로 열고, 수강생 쪽 얇은 함수가 운영자 오류를 수강생 오류로 바꿔 던지게 했다. 서버 액션의 로그인·동의 검사는 그대로 수강생 쪽에 둔다.
