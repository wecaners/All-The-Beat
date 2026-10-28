# Implementation Plan: 운영자 곡·클래스 등록

## Summary

`/admin` 아래에 운영자 전용 화면을 두고, 서버 액션이 운영자 여부를 매번 확인한 뒤 `src/server/admin`의 등록 로직을 부른다. 클래스 공개 시점에 추가요를 "열렸어요"로 바꾸는 처리는 한 트랜잭션에서 한다.

## Requirements

1. 운영자만 접근 (FR-1, CON-1)
2. 곡·아티스트·별칭·대표 영상 등록·수정 (FR-2~6)
3. 대리 강사 프로필·게재 동의 (FR-7, FR-8)
4. 클래스 대리 등록·권역 추정·장소 재사용 (FR-9~13)
5. 공개 시점의 추가요 "열렸어요" (FR-14)

## Critical Files

### New Files

- `app/src/app/admin/layout.tsx` — 운영자 확인(아니면 404), noindex, 상단 메뉴
- `app/src/app/admin/page.tsx` — 곡·강사·클래스 요약 목록
- `app/src/app/admin/songs/new/page.tsx`, `app/src/app/admin/songs/[id]/page.tsx` — 곡 등록·수정, 대표 영상
- `app/src/app/admin/instructors/new/page.tsx`, `app/src/app/admin/instructors/[id]/page.tsx` — 강사 프로필, 게재 동의
- `app/src/app/admin/classes/new/page.tsx` — 클래스 대리 등록
- `app/src/app/admin/actions.ts` — 운영자 서버 액션
- `app/src/server/admin/` — 운영자 권한 확인, 곡·강사·클래스 등록 로직, 입력 스키마
- `app/src/server/youtube/` — 링크에서 영상 ID 뽑기, oEmbed로 정보·퍼가기 가능 여부
- `app/src/db/migrations/0004_seed_region_mappings.sql`
- `app/scripts/admin-grant.mts` — 운영자 지정

### Modified Files

- `app/src/server/requests/index.ts` — 공개된 클래스로 추가요 열기
- `app/package.json` — `admin:grant` 스크립트

### Reference Files

- `app/src/server/classes/index.ts` (공개 조건), `app/src/app/song/[slug]/` (서버 액션·폼 패턴)

## Architecture

### User Flow

```text
운영자 → /admin (layout: getCurrentUser → profiles.role = admin? 아니면 404)
   ├─ 곡 등록 → 곡 저장 액션 → 곡 상세 주소 안내 → 대표 영상 지정
   ├─ 강사 등록 → 강사 프로필 저장 → 게재 동의 기록 → (공개 + 추가요 열기)
   └─ 클래스 등록 → 클래스 등록 액션 → (동의 있으면 공개 + 추가요 열기)
```

### Event Flow

```text
1. 서버 액션: requireAdmin() → 아니면 notFound
2. zod 입력 검증 (src/server/admin/schemas)
3. src/server/admin/* 트랜잭션
   클래스 등록: 장소 저장/갱신 → 클래스 → 클래스-곡 → (공개면) 추가요 열기
   동의 기록: 강사 consent_at → 그 강사의 다가오는 공개 클래스들의 곡에 대해 추가요 열기
4. updateTag(song:<slug>) 또는 refresh()
```

### Domain Model

```text
profiles.role = admin              ← scripts/admin-grant.mts 로만 지정
instructor_profiles (is_proxy, status=approved, consent_at)
  └─ instructor_regions, instructor_places
classes ── class_songs ── songs ── song_aliases
                              └── artists ── artist_aliases
requests: waiting → opened (fulfilled_class_id)   ← 클래스가 공개될 때
region_mappings: 시군구 → 권역                    ← 0004 시드
```

### Outside-In 으로 가는 이유

1. 운영자가 실제로 쓰는 입력 화면부터 세우면, 등록 2분이라는 기준을 처음부터 손으로 확인할 수 있다.
2. 화면에서 실제로 필요한 입력이 서버 로직과 스키마 검증의 모양을 정한다.

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md의 Acceptance Scenarios를 수동 검증 절차로 옮겨 tasks.md Phase 4에 둔다. 아직 구현이 없으니 모두 통과하지 않는다.

Mocking 상태: 전부 없음.

### Step 1: 권역 매핑 시드

`region_mappings`에 서울 25개 구를 넣는 마이그레이션을 만들고 dev에 적용한다 (findings Issues 1).

Mocking 상태: 없음 (기준 데이터).

### Step 2: 운영자 틀

운영자 확인(`requireAdmin`)과 `/admin` 레이아웃·요약 페이지, 운영자 지정 스크립트를 만든다. 운영자가 아니면 404.

Mocking 상태: 요약 목록은 진짜 DB를 읽는다.

### Step 3: 곡·아티스트 등록·수정과 대표 영상

등록·수정 화면 → 서버 액션 → 곡 저장 로직(아티스트 찾기/만들기, 별칭 교체, slug 중복 처리) → YouTube 링크 해석·oEmbed 확인 → 곡 캐시 갱신.

Mocking 상태: 없음.

### Step 4: 대리 강사와 게재 동의

강사 화면 → 서버 액션 → 프로필 저장(핸들 정규화·중복) → 동의 기록(공개되는 클래스의 추가요 열기).

Mocking 상태: 없음.

### Step 5: 클래스 대리 등록

등록 화면(강사 선택, 곡 1~3, 저장된 장소, 권역 자동, 예약 링크 유형 자동) → 서버 액션 → 등록 트랜잭션.

Mocking 상태: 없음.

### Step 6: 마무리

검증, 문서(`docs/04` 운영자 로그인 방식, `docs/09` 구현 메모) 갱신.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

```bash
cd app && pnpm db:check && pnpm db:generate
```

### Manual Test

1. 운영자 아닌 계정·비로그인으로 `/admin` → 404
2. spec.md의 시나리오를 tasks.md Phase 4 순서대로 확인
3. 곡 상세에서 영상·클래스·"열렸어요" 반영 확인

## Considerations

### 기존 코드 재사용

`normalizeAlias`, `publiclyVisible`, 추가요 상태값, 곡 상세의 캐시 태그를 그대로 쓴다.

### 호환성

시드 스크립트로 넣은 샘플 곡도 같은 구조라 운영 화면에서 수정할 수 있다.
