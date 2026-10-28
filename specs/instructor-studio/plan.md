# Implementation Plan: 강사·스튜디오 자세히 보기

## Summary

`instructor_places`를 스튜디오로 넓히고(카카오 장소·위치·시설·목록에서 빼기), 스튜디오 사진 테이블과 강사 프로필 칸(사진·소개·포트폴리오·사진/영상 게재 동의)을 더한다. 사진은 Supabase Storage 공개 버킷에 서버 액션으로 올린다. 카카오 로컬 API는 서버에서, 카카오맵 정적 지도는 클래스 상세에서 필요할 때만 부른다.

## Requirements

1. 운영자 스튜디오 관리: 카카오 장소·주소 검색, 시설, 사진, 목록에서 빼기 (FR-1~6, FR-13~14)
2. 클래스 등록에서 스튜디오 고르기·그 자리에서 추가 (FR-7)
3. 클래스 상세 장소: 정적 지도, 시설, 사진 크게 보기, 카카오맵 사진·리뷰 링크 (FR-8~10)
4. 강사 프로필: 사진·소개·포트폴리오, 동의 조건 (FR-11~12)

## Critical Files

### New Files

- `app/src/db/migrations/0005_*.sql`(생성), `0006_media_storage.sql`(직접 작성: 버킷·정책·`is_admin()`)
- `app/src/db/schema/` — `studioPhotos` 추가, `instructorPlaces`·`instructorProfiles` 칸 추가
- `app/src/server/kakao/index.ts` — 장소·주소 검색 (서버 전용)
- `app/src/server/admin/studios.ts` — 스튜디오·사진·강사 프로필 저장
- `app/src/server/media/index.ts` — Storage 올리기·지우기·공개 주소
- `app/src/app/admin/instructors/studio-forms.tsx`, `profile-forms.tsx`, `image-upload.ts`(브라우저에서 두 크기로 줄이기)
- `app/src/components/static-map.tsx`, `photo-strip.tsx`(작은 목록 + 크게 보기)

### Modified Files

- `app/src/server/classes/index.ts` — 상세에 스튜디오·강사 정보
- `app/src/app/class/[id]/class-view.tsx` — 장소·강사 섹션
- `app/src/app/admin/instructors/[id]/page.tsx`, `app/src/app/admin/actions.ts`, `app/src/app/admin/classes/new/class-form.tsx`, `app/src/server/admin/classes.ts`
- `app/.env.local.example`, `_agent/rules/tech-stack.md` 환경변수 표, `docs/09-ERD.md` 8절, `_agent/rules/design.md` 부품 표

### Reference Files

- `app/src/server/admin/classes.ts` — 장소 재사용·권역 추정
- `app/src/server/youtube/index.ts` — 영상 확인

## Architecture

### User Flow

```text
운영자 /admin/instructors/{id}
 ├─ 프로필: 사진 올리기 · 소개 · 포트폴리오 링크 0~2 · 사진·영상 게재 동의
 └─ 스튜디오: [이름으로 찾기|주소로 찾기] → 후보 고르기 → 저장
             └─ 시설 고르기 · 사진 올리기(최대 8) · 목록에서 빼기
운영자 /admin/classes/new → 스튜디오 고르기(최근 순) / 그 자리에서 찾아 추가

수강생 /class/{id}
 ├─ 강사: 사진·이름·소개 / 포트폴리오 영상 / 인스타그램 더 보기
 └─ 장소: 정적 지도(누르면 카카오맵) · 이름·주소·권역·시설 · 사진 목록 → 크게 보기
          · 카카오맵 열기 · 주소 복사 · (카카오 장소면) 사진·리뷰 보기
```

### Domain Model

```text
instructor_places (= 스튜디오)
├── + kakao_place_id, kakao_place_url   (카카오 장소면)
├── + lat, lng                          (검색 결과에서 한 번 저장)
├── + facilities text[]                 (정해진 목록)
├── + archived_at                       (목록에서 빼기)
└── studio_photos (place_id, path, thumb_path, position) 최대 8

instructor_profiles
├── + photo_path, photo_thumb_path
├── + bio (80자)
├── + portfolio_video_ids text[] (최대 2)
└── + media_consent (대리 등록 강사의 사진·영상 게재 동의)

storage.buckets: media (공개 읽기)
storage.objects 정책: insert·update·delete는 public.is_admin()
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 클래스 상세의 장소·강사 섹션 모양부터 고정 데이터로 잡는다
- 실제 화면이 안쪽 설계를 끌어준다. 화면이 쓰는 값이 정해진 뒤 스키마를 확정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 클래스 상세 장소·강사 섹션 (화면)

`ClassDetail`에 스튜디오(위치·시설·사진·카카오 링크)와 강사(사진·소개·영상) 칸을 더하고 화면을 그린다. `StaticMap`(보일 때 SDK 로드, 정적 지도), `PhotoStrip`(작은 목록 + `<dialog>` 크게 보기, 뒤로 가기 닫기). 키나 위치가 없으면 지도를 숨긴다.

Mocking 상태: 임시 확인 페이지에서 가짜 데이터로 화면을 본다(커밋 금지). 조회는 Step 3 뒤 진짜로.

### Step 2: 스키마·마이그레이션

스키마 수정 → `pnpm db:generate` → SQL 검토 → 버킷·정책 커스텀 마이그레이션 작성 → **사용자에게 SQL을 보여주고 승인 후** `pnpm db:migrate` → generate가 "No schema changes".

Mocking 상태: 없음.

### Step 3: 서버

카카오 검색(키 없으면 "카카오 키가 없어요" 안내), 스튜디오 저장(같은 카카오 장소면 기존 것), 시설·목록에서 빼기, 사진 올리기·지우기(Storage + DB, 8장 제한), 강사 프로필(영상 확인, 80자), 클래스 상세 조회 확장(동의 조건).

Mocking 상태: 없음.

### Step 4: 운영자 화면

강사 화면에 프로필·스튜디오 섹션, 클래스 등록 폼의 장소를 스튜디오 고르기 + 그 자리 추가로.

Mocking 상태: 없음.

### Step 5: 마무리

임시 확인 페이지 삭제, 환경변수 표·ERD·design.md 갱신, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
cd app && pnpm db:check && pnpm db:generate
```

### Manual Test

1. 클래스 상세(모바일 375px): 지도·시설·사진 크게 보기(넘기기·Esc·뒤로 가기)·강사 영상, 가로 넘침 없음, 서버 로그 오류 없음
2. 운영자: 카카오 장소 검색 → 저장 → 시설·사진 → 클래스 등록에서 고르기 (카카오 키가 있을 때)
3. 운영자 아님·비로그인: 서버 액션 거절
4. 동의 없는 대리 강사: 사진·영상 숨김

## Considerations

### 기존 코드 재사용

장소 재사용·권역 추정(`guessRegion`)·영상 확인(`lookupVideo`)·스티커 부품을 그대로 쓴다.

### 호환성

기존 장소(위치 없음)는 지도 없이 보인다. 기존 클래스 등록 폼의 "새 장소 직접 입력"은 카카오 키가 없을 때의 대안으로 남긴다.
