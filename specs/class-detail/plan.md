# Implementation Plan: 클래스 상세와 예약 링크 이동

## Summary

`/class/{id}` 페이지와 `/go/{classId}` Route Handler를 만든다. 둘 다 `src/server`의 같은 공개 조건으로 클래스를 읽고, 상태는 DB 안에서 지금 시각과 비교해 정한다. 스키마는 바꾸지 않는다 (기존 `events` 테이블 사용).

## Requirements

1. 공개된 클래스의 F-05 항목을 비로그인으로 보여준다. 공개 안 됨·없음은 찾을 수 없음 (FR-1~4)
2. 상태는 취소 → 종료 시각 지남 → 저장된 상태 순으로 판단 (FR-5)
3. 모집 중·마감 임박만 예약 이동. 채널 종류 안내, 새 창 (FR-6, FR-11)
4. `/go`는 DB의 링크로만 302, 1회 기록, 같은 사람·클래스 10분 안 중복 제외, 예약 불가면 상세로 (FR-7~10)
5. 곡·지도·인스타·같은 곡 다른 클래스·추가요로 나가는 길, OG, 홈 진입로 (FR-12~15)

## Critical Files

### New Files

- `app/src/app/class/[id]/page.tsx` — 클래스 상세 (U-05)
- `app/src/app/go/[classId]/route.ts` — 예약 이동 Route Handler
- `app/src/server/bookings/index.ts` — 예약 이동 판단·클릭 기록

### Modified Files

- `app/src/server/classes/index.ts` — 상세 조회 `getPublicClass`, 상세 화면 타입
- `app/src/lib/format.ts` — 날짜(요일 포함), 진행 시간, 예약 채널 이름
- `app/src/components/sticker-button.tsx` — 링크에도 같은 모양을 쓰도록 클래스 문자열을 내보냄
- `docs/03-기능명세서.md` — F-05 마감·종료의 앵콜은 F-24 구현 때 넣는다는 메모

### Reference Files

- `app/src/app/song/[slug]/page.tsx` — Suspense·`connection()`·메타데이터 패턴
- `app/src/server/classes/index.ts` — `publiclyVisible`
- `app/src/lib/auth/current-user.ts` — 로그인 사용자
- `app/src/db/schema/activity.ts` — `events`

## Architecture

### User Flow

```text
곡 상세 티켓 / 공유 링크
        ↓
/class/{id}  ──(공개 아님·없음)──→ 찾을 수 없음
        ↓ 상태 판단 (DB의 now() 기준)
  모집 중·마감 임박            마감·종료·취소
        ↓                          ↓
 [예약하러 가기] 새 창      대표 곡 상세 / (취소) 곡 상세 ?request=open
        ↓
/go/{classId}
   ├─ 공개 아님·없음 → 404
   ├─ 예약 불가 → 302 /class/{id} (기록 없음)
   └─ 예약 가능 → 10분 중복 아니면 events(booking_click) 1건 → 302 booking_url
```

### Domain Model

```text
src/server/classes
├── getPublicClass(id) → ClassDetail | null
│     공개 조건 + 곡 목록(position 순) + 강사 + 권역 + 상태(displayStatus, canBook)
└── displayStatus = canceled > ended(ends_at <= now()) > closed > closing_soon > open

src/server/bookings
└── goToBooking({ classId, userId, sessionId, referrer })
      → { kind: "missing" } | { kind: "unavailable" } | { kind: "go", url }
      기록: INSERT … SELECT … WHERE NOT EXISTS (같은 class·같은 사용자 또는 세션·10분 안)
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 곡 상세 티켓의 404가 첫 Step에서 바로 사라진다
- 실제 화면이 안쪽 설계를 끌어준다. 화면이 쓰는 항목이 정해진 뒤에 조회 함수의 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md의 시나리오를 `tasks.md` Phase 4 체크리스트(입력·기대 결과)로 옮긴다. 자동 테스트 도구가 없어 수동 확인 절차로 쓴다.

Mocking 상태: 없음.

### Step 1: 클래스 상세 화면

`/class/[id]` 페이지. 상단(로고 → 홈), 이미지(클래스 이미지 → 대표 곡 영상 썸네일 + YouTube 표시), 상태 라벨·난이도, 클래스 이름, 곡 칩(→ 곡 상세), 일시·장소(→ 네이버 지도 검색)·권역·정원 표, 강사(→ 인스타), 설명. 아래 고정 바에 가격과 상태별 행동: 예약 가능이면 채널 안내 + 예약하러 가기(`/go/{id}`, 새 창), 아니면 이유 + 같은 곡 다른 클래스(+ 취소면 이 곡 추가요). 화면은 `_agent/rules/design.md`의 부품으로 만든다. `params`를 읽으므로 본문은 `<Suspense>` 안, `await connection()` 뒤에 읽는다. `generateMetadata`로 제목·설명·OG.

Mocking 상태: 화면이 받는 `ClassDetail` 타입을 먼저 정하고, 조회 함수는 Step 2에서 진짜로 만든다 (이 Step 안에서 바로 이어 진행해 고정 데이터를 커밋하지 않는다).

### Step 2: 상세 조회

`getPublicClass(id)`: id를 zod로 검증(양의 정수, 아니면 null). 곡 상세와 같은 `publiclyVisible`로 거르고, 곡은 `class_songs` position 순으로 곡명·아티스트·slug·영상 id를 함께 읽는다. 상태는 SQL에서 `ends_at <= now()`를 계산해 정한다 (시각 비교는 DB 안에서, design-system Learnings).

Mocking 상태: 없음 (dev DB의 테스트 클래스).

### Step 3: 예약 이동

`goToBooking`: 같은 공개 조건으로 클래스를 읽고, 예약 불가면 `unavailable`, 가능하면 중복이 아닐 때만 `events`에 `booking_click`을 한 문장으로 넣고 `booking_url`을 돌려준다. Route Handler는 첫 부분에서 `getCurrentUser()`, 세션 쿠키가 없으면 무작위 값(httpOnly, 1년)을 만들어 응답에 굽고, 결과에 따라 404 / 302. 리다이렉트 대상은 함수가 돌려준 DB 값뿐이다. Referer 헤더는 길이를 잘라 저장한다.

Mocking 상태: 없음.

### Step 4: 마무리

`docs/03` F-05에 앵콜 미구현 메모, findings·progress·tasks 갱신. 임시 확인용 코드가 있으면 지운다.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Manual Test

1. 비로그인으로 공개 클래스 상세(모바일 375px), 콘솔·서버 로그 오류 없음, "unstable value … while prerendering" 없음
2. 없는 번호·숫자 아닌 id·비공개 클래스 → 찾을 수 없음, `/go`는 404
3. 상태별 화면: 모집 중·마감 임박·마감·종료·취소 (DB를 바꾸지 않고, 상태 판단 함수는 SQL로 확인)
4. `/go` 중복 제거: 트랜잭션 안에서 같은 세션 2번·다른 세션 1번·11분 전 기록 후 1번을 넣어 보고 되돌린다 (dev DB가 운영과 같으므로 남기지 않는다)
5. `/go` 실제 이동은 응답 코드·Location 헤더로 확인한다. 기록이 남는 요청은 사용자 확인 후에만 보낸다

## Considerations

### 기존 코드 재사용

공개 조건은 `publiclyVisible` 하나를 같이 쓴다. 시간·가격·난이도 표시는 `format.ts`에 모은다. 추가요로 가는 길은 곡 상세의 `?request=open`을 그대로 쓴다.

### 호환성

곡 상세의 티켓 링크(`/class/{id}`)는 이미 있다. 스키마·마이그레이션 변경 없음. 새 쿠키 하나(브라우저 식별값)가 생기며 개인정보처리방침 문구는 출시 전 할 일이다.
