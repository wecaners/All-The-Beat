# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-25: 클래스 등록(F-12)에 선택 입력 "티저 영상 링크"(YouTube 일반 영상·쇼츠). 있으면 클래스 상세 상단에 임베드. 등록 규칙은 F-16 대표 영상과 같음(임베드 가능 여부 확인, 30일 갱신). 인스타 릴스는 MVP 이후
- F-16 구현 메모(specs/song-review): 영상 30일 갱신·"영상 교체 필요"는 아직 없다
- 와이어프레임 U-05: "강사 티저 영상이 있으면 이 자리(또는 맨 위 사진 대신)에 YouTube 임베드". T-02: 사진·소개·티저 영상은 접어 둔 선택 입력

## Research Findings

### 코드베이스 구조

- `classes.teaser_video_id text`가 처음 스키마(`0001`)부터 있다. 읽고 쓰는 코드는 없다
- 곡 대표 영상: `parseYouTubeVideoId`(youtu.be·watch·shorts·embed·live·ID), `lookupVideo`(oEmbed, 키 없음, 401/403 = 퍼가기 막힘, 400/404 = 없음) — `src/server/youtube`. 오류 문구 `VIDEO_ERROR`는 `admin/songs.ts`에 있다
- 클래스 입력 `classInput`(zod)은 운영자·강사가 같이 쓴다. 저장은 `createClass`(등록)와 `updateMyClass`(강사 수정)가 각각 `classes`에 넣는다
- 수정·복사·앵콜 폼의 초기값은 `getEncoreSource` → `ClassFormSource`
- 클래스 상세 `getPublicClass` → `ClassDetail`. 화면 맨 위는 대표 곡의 `VideoCard`(있을 때만)
- 운영 클래스 상세는 `getEncoreSource`를 펼쳐 정보를 보여준다

### 기존 패턴

- 외부 확인(oEmbed)은 트랜잭션 밖에서 먼저 한다(`setSongVideo`)
- 폼은 `FormData` → `readForm`/`parse` → zod. 선택 글자는 `optionalText`(비면 null)

## Resources

### 문서

- F-25·F-16: `docs/03-기능명세서.md`
- U-05 티저 자리: `wireframes/index.html:935`, T-02 선택 입력: `:1538`

### 코드 참조

- YouTube: `app/src/server/youtube/index.ts`, 대표 영상 저장: `app/src/server/admin/songs.ts:240`
- 클래스 입력·등록·폼 소스: `app/src/server/admin/classes.ts:35`, `:111`, `:246`
- 강사 수정: `app/src/server/instructors/classes.ts:109`
- 클래스 상세: `app/src/server/classes/index.ts:123`, 화면 머리: `app/src/app/class/[id]/class-view.tsx:36`

### API 엔드포인트

- 서버 액션: 기존 `createClassAction`(운영자), `createMyClassAction`·`updateMyClassAction`(강사)에 `teaserUrl` 입력이 추가된다. 새 액션 없음

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 입력은 링크(`teaserUrl`), 저장은 영상 ID(`teaser_video_id`). 저장 전에 `parseYouTubeVideoId` + `lookupVideo`로 확인하고 막힌·없는·YouTube 아닌 링크는 거절 | F-16과 같은 규칙. 화면은 ID로 임베드한다 |
| 오류 문구 `VIDEO_ERROR`를 `src/server/youtube`로 옮겨 곡·클래스가 같이 쓴다 | 같은 문구를 두 곳에 두지 않는다 |
| oEmbed 확인은 트랜잭션 밖에서 | `setSongVideo`와 같다. 외부 호출 중에 DB 잠금을 들고 있지 않는다 |
| 티저가 있으면 클래스 상세 맨 위에서 대표 곡 영상 대신 보인다 | U-05 메모 "맨 위 사진 대신". 영상 둘을 겹치면 무겁다. 곡 영상은 곡 상세에 있다 |
| 폼 초기값은 `https://youtu.be/{id}` | 저장한 ID를 사람이 읽을 수 있는 링크로 돌려준다 |
| 30일 갱신은 하지 않는다 | 곡 대표 영상도 아직 없다. 같이 만들 때 한다 |
| 운영 클래스 상세에 티저 링크를 보여준다 | 운영자가 어떤 영상이 붙었는지 확인할 수 있게 |

## Issues Encountered

### 1. 서버 모듈을 고친 직후 테스트가 옛 코드로 돈다

**문제**:

서버 코드를 고치고 바로 임시 Route Handler를 호출하니 새 입력(`teaserUrl`)이 전부 무시됐다.

**원인**:

개발 서버(Turbopack)가 이전에 컴파일한 서버 모듈을 들고 있었다. 이 세션에서 스키마를 바꿨을 때(specs/instructor-claim)도 같은 일이 있었다.

**해결**:

개발 서버를 다시 띄우고 다시 돌렸다.

**결과**:

12개 모두 통과

## Learnings

### 선택 입력도 외부 확인을 거치면 "비움"을 먼저 가른다 (2026-11-03)

링크가 비어 있으면 YouTube에 묻지 않고 바로 null이어야 한다. 비어 있는 입력을 확인 함수에 넘기면 "YouTube 링크가 아니에요"가 떠서 선택 입력이 필수처럼 보인다.

### 서버 모듈을 여러 개 고친 뒤 테스트는 개발 서버를 다시 띄우고 돌린다 (2026-11-03)

`src/server` 여러 파일을 한 번에 고치면 개발 서버가 일부만 다시 읽어 옛 함수가 섞여 돈다. 테스트가 "값이 전부 무시된다"처럼 이상하게 실패하면 코드를 의심하기 전에 서버부터 다시 띄운다.

