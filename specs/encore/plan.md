# Implementation Plan: 앵콜

## Summary

`src/server/encores`에 앵콜 규칙(앵콜할 수 있는지, 기준 인원, 표시 상태, 저장·취소, 운영자 응답)을 모으고, 클래스 상세에 앵콜 패널(응원봉)을, 운영 화면에 앵콜 목록·클래스 마감·앵콜 클래스 등록을 붙인다. 스키마는 이미 있어 바꾸지 않는다.

## Requirements

1. 수강생 앵콜 남기기·수정·취소, 로그인 복귀 (FR-1~4, FR-11~12)
2. 기준 인원·전달됨 전이·만료 계산·뒤로 가지 않는 상태 (FR-5~8)
3. 클래스 상세 상태 문구·앵콜 클래스 연결 표시 (FR-9~10, FR-16)
4. 운영 앵콜 목록·검토할게요·어려워요 (FR-13~14, FR-18)
5. 앵콜 클래스 등록 (FR-15)
6. 클래스 마감·마감 풀기 (FR-17)

## Critical Files

### New Files

- `app/src/server/encores/index.ts` — 앵콜 규칙, 수강생 저장·취소, 클래스 상세용 요약
- `app/src/server/admin/encores.ts` — 운영 앵콜 목록, 응답, 마감·마감 풀기
- `app/src/app/class/[id]/encore-panel.tsx` — 앵콜 패널(시트·로그인·취소·응원봉)
- `app/src/app/class/[id]/actions.ts` — 앵콜 저장·취소 서버 액션
- `app/src/components/lightstick.tsx` — 응원봉 SVG
- `app/src/app/admin/encores/page.tsx` — 운영 앵콜 목록

### Modified Files

- `app/src/server/classes/index.ts` — 상세에 앵콜 원본·앵콜 클래스 연결 추가
- `app/src/app/class/[id]/page.tsx`, `class-view.tsx` — 로그인·내 앵콜 읽기, 앵콜 패널, 앵콜 클래스 표시
- `app/src/server/admin/classes.ts` — 앵콜 클래스 등록 연결, 원 클래스 불러오기, 목록에 상태
- `app/src/app/admin/actions.ts` — 응답·마감·등록 액션
- `app/src/app/admin/classes/new/page.tsx`, `class-form.tsx`, `song-picker.tsx` — 미리 채우기
- `app/src/app/admin/page.tsx`, `layout.tsx` — 마감 버튼, 앵콜 메뉴
- `_agent/rules/design.md` — `Lightstick`, 인터랙션 표 앵콜 응원봉 상태
- `docs/03-기능명세서.md` — F-24 구현 메모(운영자 대리 응답, 마감 풀기 규칙)

### Reference Files

- `app/src/server/requests/index.ts`, `app/src/app/song/[slug]/request-panel.tsx` — 같은 모양의 요청 흐름
- `design/concepts/round-3.html` — 응원봉 움직임

## Architecture

### User Flow

```text
클래스 상세 (마감 / 종료 30일 이내)
  앵콜 패널: N명 앵콜 중 · M명 더 모이면 전달 (게이지)
  [앵콜!] ─비로그인→ 로그인 시트 → 카카오 → /class/{id}?encore=open → 앵콜 시트 자동
          ─로그인→ 앵콜 시트(시간대·한마디) → 저장 → 응원봉 흔들림·관객 응원봉·숫자 튐
                                                  └ 기준 도달이면 "강사님께 전달됐어요" 안내
  내 앵콜: 도장 + 내가 고른 것, [수정하기] [취소] → 확인 시트

운영자
  /admin/encores: 응답 필요(전달됨·검토 중) 카드 → [검토할게요] [이번엔 어려워요] [앵콜 클래스 등록]
                  모으는 중 표
  [앵콜 클래스 등록] → /admin/classes/new?encoreOf={id} (원 클래스 값 미리 채움, 강사 고정)
  /admin 다가오는 클래스: [마감하기] / [마감 풀기]
```

### Domain Model

```text
encore_rounds (클래스당 1행, 첫 앵콜 때 생성)
  threshold = capacity ? max(3, ceil(capacity × 0.3)) : 5
  expires_at = ends_at + 30일

표시 상태(effective)
  행 없음                 → collecting (또는 종료 + 30일 지났으면 expired)
  collecting·delivered    → 만료 시각 지났으면 expired
  그 밖                   → 저장된 상태

앵콜 가능 = 공개 클래스 ∧ 표시 상태 closed|ended ∧ effective ∈ {collecting, delivered, reviewing}

저장(트랜잭션)
  라운드 행 insert … on conflict do nothing → select … for update
  effective 확인 → encores upsert (취소였으면 살리고 created_at = now)
  유효 인원 count → collecting ∧ count ≥ threshold 이면 delivered, reached_at = now

운영자 응답(트랜잭션, 행 잠금)
  review : delivered → reviewing, reviewing_at·responded_at = now, count_at_review = 지금 인원
  decline: delivered|reviewing → declined, responded_at = now
  open   : 클래스 등록과 같은 트랜잭션, delivered|reviewing → opened, encore_class_id
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 클래스 상세의 앵콜 패널부터 만들어 상태별 모양을 본다
- 실제 화면이 안쪽 설계를 끌어준다. 패널이 필요한 값(인원·기준·표시 상태·내 앵콜·앵콜 클래스 링크)이 서버 반환 모양을 정한다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 클래스 상세 앵콜 패널

`Lightstick` 부품, `EncorePanel`(상태별 문구·게이지·내 앵콜·시트 3개·응원봉 움직임·고정 하단 버튼), `ClassView`에서 마감·종료면 기존 하단 막대 대신 패널을 쓴다. 앵콜 클래스 표시·원 클래스 링크.

Mocking 상태: Step 2와 바로 이어 진행해 고정 데이터를 커밋하지 않는다. 상태별 모양은 트랜잭션 안 가짜 데이터로 확인한다.

### Step 2: 앵콜 서버·수강생 액션

`src/server/encores`: 규칙 함수, `getEncoreSummary`, `getMyEncore`, `saveEncore`, `cancelEncore`. `class/[id]/actions.ts`. 페이지에서 로그인·내 앵콜을 읽는다.

Mocking 상태: 없음 (dev DB). 실제 저장은 카카오 로그인이 필요해 사용자 확인, 규칙은 되돌리는 트랜잭션으로 확인.

### Step 3: 운영 앵콜 목록·응답·마감

`src/server/admin/encores.ts`, `/admin/encores`, 응답·마감 액션, 운영 메뉴, 다가오는 클래스 목록의 상태·마감 버튼.

Mocking 상태: 없음.

### Step 4: 앵콜 클래스 등록

`?encoreOf=` 로 원 클래스를 불러와 폼을 미리 채우고 강사를 고정한다. `createClassByAdmin`에 앵콜 연결(같은 트랜잭션에서 라운드 오픈).

Mocking 상태: 없음.

### Step 5: 마무리

design.md·docs/03 갱신, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

자동 테스트 도구가 없다. 상태 전이 규칙은 dev DB에서 되돌리는 트랜잭션(`BEGIN … ROLLBACK`)으로 확인한다.

### Manual Test

1. 테스트 데이터 클래스 하나를 트랜잭션 안에서 마감·종료로 바꿔 상태별 화면(모으는 중·전달됨·검토 중·오픈·어려워요·만료)을 375px로 본다
2. 비로그인 앵콜 → 로그인 시트
3. 앵콜 저장·취소·운영자 응답·마감·앵콜 클래스 등록은 로그인이 필요해 사용자가 확인한다

## Considerations

### 기존 코드 재사용

추가요의 시트·로그인 시트·도장·토스트, `publiclyVisible`, `displayStatusOf`, `createClassByAdmin`, `SongPicker`를 그대로 쓴다.

### 호환성

스키마 변경이 없다. 이미 공지한 클래스는 상태만 바뀐다. 마감 풀기를 앵콜 없는 클래스로 제한해 앵콜 기록이 화면에서 사라지지 않게 한다.
