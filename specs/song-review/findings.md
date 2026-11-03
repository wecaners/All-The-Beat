# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-16: 곡 목록(검색·검수 대기 필터), 곡 수정(곡명·아티스트·별칭·발매일·slug·대표 영상), 곡 병합(A→B: 클래스·추가요·별칭 이동, A의 URL은 B로 리다이렉트), 아티스트 수정·병합(같은 방식). 영상 30일 갱신·"영상 교체 필요"는 이번에 없음(README)
- F-13: 수강생·강사가 만든 곡은 검수 대기로 쌓이고 운영자가 중복이면 기존 곡으로 병합
- 04 IA: A-04 곡·아티스트 관리(`/admin/*`, noindex)
- 09 ERD: `songs.merged_into_id`(옛 slug 리다이렉트용으로 행은 남김), `artists.merged_into_id`, `song_aliases`(곡 × alias_norm unique), `artist_aliases`(아티스트 × alias_norm unique)

## Research Findings

### 코드베이스 구조

- `songs.reviewStatus`(`pending`·`confirmed`)와 `createdBy`(profiles)가 있다. 운영자 곡은 `confirmed`·`createdBy null`, 수강생·강사 곡은 `pending`·`createdBy`(specs/song-register). 만든 사람이 강사인지는 `instructor_profiles.userId`로 안다
- `getSongBySlug`가 `mergedIntoId`를 보고 `{ kind: "merged", slug }`를 돌려주고 곡 상세가 리다이렉트한다. 홈·검색·랭킹·목록·운영 목록은 모두 `isNull(songs.mergedIntoId)`로 거른다 → 병합은 `mergedIntoId`만 세우면 화면이 따라온다
- `class_songs`는 `(classId, songId)` 기본키 + `position` 1~3. 한 클래스가 A·B 둘 다 배우면 병합 때 충돌한다
- `requests`는 `(userId, songId)` unique. 같은 사람이 A·B 둘 다 추가요했으면 충돌한다
- `events.songId`는 집계용(검색·조회). `encores`는 클래스 단위라 곡 병합과 무관
- `song_aliases`·`artist_aliases`는 `(owner, aliasNorm)` unique. 대표 이름도 별칭 1행(`isPrimary`)
- `saveSong`이 곡 수정·별칭 갱신을, `findOrCreateArtist`·`addAliases`가 아티스트·별칭 처리를 이미 한다
- 운영 홈(`app/src/app/admin/page.tsx`)이 곡 전부를 표로 보여준다(검수 열 있음). 곡 상세(`admin/songs/[id]`)는 수정 폼 + 대표 영상. 아티스트 화면은 없다
- 운영자 곡 검색 액션 `searchSongsForClassAction`(id·label)을 병합 대상 고르기에 쓸 수 있다

### 기존 패턴

- 운영 액션: `requireAdmin` → `parse`·`toState` → `refresh()`/`redirect`. 한 번 누르는 버튼은 `ActionButton`(confirm)
- 캐시: 곡 상세는 `cacheTag(song:${slug})` → 곡이 바뀌면 `updateTag`

## Resources

### 문서

- F-16: `docs/03-기능명세서.md` "F-16. 운영자: 곡·아티스트 관리", F-13 검수: "F-13"
- A-04: `docs/04-IA.md:130`, ERD 병합: `docs/09-ERD.md:251`

### 코드 참조

- 곡 운영 서버: `app/src/server/admin/songs.ts`, slug 조회: `app/src/server/songs/index.ts:20`
- 스키마: `app/src/db/schema/songs.ts`(aliases), `app/src/db/schema/classes.ts`(class_songs), `app/src/db/schema/activity.ts`(requests unique)
- 운영 홈·곡 상세: `app/src/app/admin/page.tsx`, `app/src/app/admin/songs/[id]/page.tsx`

### API 엔드포인트

- 페이지(운영자): `GET /admin/songs?review=pending`(곡 목록·필터), `GET /admin/artists`
- 서버 액션(운영자): `confirmSongAction`, `mergeSongAction`, `renameArtistAction`, `mergeArtistAction`

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 검수 확인은 `reviewStatus: confirmed`만 바꾼다. 수정(`saveSong`)도 저장하면 `confirmed`가 된다(기존 동작) | 운영자가 봤다는 뜻 |
| 곡 병합 A→B는 한 트랜잭션: `class_songs` A→B(그 클래스에 B가 이미 있으면 A 행 삭제), `requests` A→B(같은 사용자가 B에도 있으면 A 행 삭제, B 유지), `song_aliases` A→B(같은 별칭이 있으면 건너뜀, A 제목도 별칭으로), `events.songId` A→B, A에 `mergedIntoId = B`·`reviewStatus confirmed`. A 행은 남긴다 | ERD·F-16. unique 충돌은 대상 쪽을 남기는 게 "기존 곡으로 합친다"에 맞다 |
| 추가요 충돌 삭제는 집계에서 한 건 줄어드는 셈이다. 병합 결과 문구에 "겹친 추가요 N건은 대상 곡 것만 남겼다"를 보여준다 | 운영자가 알아야 한다 |
| 대상 곡은 병합되지 않은 곡이어야 하고 자기 자신이면 거절. B가 이미 A로 병합돼 있으면(순환) 거절 | 체인·순환을 만들지 않는다 |
| 병합 전에 옮겨질 클래스·추가요 수를 보여주고 `confirm`으로 한 번 더 묻는다. 되돌리기는 없다 | README |
| 아티스트 병합 A→B: `songs.artistId` A→B, `artist_aliases` A→B(충돌 건너뜀, A 이름도 별칭), A에 `mergedIntoId = B`. 곡 slug는 그대로 둔다 | 곡 주소는 안정성이 우선. 이름은 곡 수정에서 바뀐다 |
| 아티스트 이름 수정은 `artists.name`과 대표 별칭(`isPrimary`) 행을 같이 바꾼다 | 검색이 대표 이름으로도 걸려야 한다 |
| 곡 목록은 `/admin/songs?review=pending`로 따로 두고, 운영 홈은 "검수 대기 N곡 ›" 안내만 더한다 | 홈 표가 길다. 필터는 주소에 |
| 병합·확인·이름 수정 뒤 `updateTag(song:slug)`로 곡 상세 캐시를 비운다(관련 곡 전부) | 곡 상세가 "use cache" |

## Issues Encountered

### 1. `sql` 템플릿 상관 서브쿼리가 바깥 테이블과 묶이지 않음

**문제**:

아티스트 목록의 곡 수를 `sql`(select count(*) from ${songs} where ${songs.artistId} = ${artists.id} …)`로 세니 모든 아티스트에 같은 수(전체 곡 수)가 나왔다.

**원인**:

확인하지 못했다. 같은 모양의 서브쿼리를 강사 목록(클래스 수)에서는 잘 썼는데, 여기서는 바깥 `artists`와 상관이 끊긴 것으로 보인다.

**해결**:

`group by artist_id`로 따로 세어 Map으로 붙였다.

**결과**:

해결됨 (테스트 34개 통과)

### 2. 병합 때 제목 별칭 추가가 unique 위반

**문제**:

`addAliases("song", …)`이 대상 곡의 제목 행을 다시 넣으려 해 `song_aliases(song_id, alias_norm)` unique에 걸렸다.

**원인**:

곡 별칭 insert에 `onConflictDoNothing`이 없었다(저장 폼은 먼저 지우고 넣어서 필요 없었다).

**해결**:

곡 별칭 insert에도 `onConflictDoNothing`을 붙였다. 저장 폼 동작은 그대로다.

**결과**:

해결됨

## Learnings

### unique가 있는 테이블을 옮길 때는 "대상에 이미 있는 것 삭제 → 나머지 update" 두 단계로 (2026-11-03)

클래스 연결·추가요·별칭 모두 `(소유자, 키)` unique가 있다. 먼저 대상에 같은 키가 있는 행을 지우고 나머지를 update하면 충돌 없이 한 트랜잭션에 끝난다. 삭제 수는 결과로 돌려줘 운영자에게 보여준다.
