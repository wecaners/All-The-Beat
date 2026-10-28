# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-10-28

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. README 작성 → 사용자 리뷰("다음")
2. docs 03·04·05·08·09, 와이어프레임 U-05, 기존 코드 조사 → findings.md
3. spec 작성 → 사용자 결정: 남은 자리는 말하지 않음, 이후 FBPW 리뷰 생략하고 끝까지 진행

**생성/수정 파일**:

- `specs/class-detail/README.md`, `spec.md`, `findings.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md (Outside-In: 화면 → 조회 → 예약 이동 → 마무리), tasks.md 인수 체크리스트

**생성/수정 파일**:

- `specs/class-detail/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. 상세 조회 `getPublicClass` (곡 상세와 같은 공개 조건, 상태는 DB의 `ends_at <= now()`로 종료 판단), 숫자만 받는 클래스 번호 검증
2. 예약 이동 `goToBooking` + `/go/[classId]` Route Handler: DB 링크로만 302, 예약 불가면 상세로, 10분 중복 제외 기록(한 문장 `INSERT … WHERE NOT EXISTS`), 비로그인 식별 쿠키 `ab_sid`
3. `/class/[id]` 화면: 로고, 영상 썸네일, 상태·난이도 라벨, 곡 칩, 일시·장소·권역·정원·강사 표, 소개, 아래 고정 바(예약 채널 안내 + 예약하러 가기 / 이유 + 같은 곡 다른 클래스 + 취소면 추가요)
4. 상태별 화면 확인을 위해 화면을 `ClassView`로 분리, `StickerButton` 모양을 링크에도 쓰도록 `stickerButtonClass` 추가
5. `docs/03` F-05에 구현 메모 (앵콜 없음, 종료 판단, 정원 표시)

**생성/수정 파일**:

- `app/src/app/class/[id]/page.tsx`, `class-view.tsx`, `app/src/app/go/[classId]/route.ts`, `app/src/server/bookings/index.ts` (새로 생성)
- `app/src/server/classes/index.ts`, `app/src/lib/format.ts`, `app/src/components/sticker-button.tsx`, `docs/03-기능명세서.md` (수정)

### Phase 4: Testing 🔄

**작업 내역**:

1. `pnpm check` 통과
2. 개발 서버(3101, 3100은 원래 폴더의 서버가 사용 중)에서 모바일 375px로 `/class/1` 확인. 서버 로그 오류·"unstable value" 없음, 가로 넘침 없음
3. 마감·종료·취소·마감 임박·무료·정원/설명 없음은 임시 페이지에서 가짜 데이터로 확인하고 임시 페이지는 지움
4. 중복 제거는 같은 SQL을 트랜잭션 안에서 돌린 뒤 되돌려 확인 (DB에 남은 기록 0건)
5. 사용자 승인 후 실제 `/go/1` 이동 확인: 302 + 쿠키 + 기록 1건, 같은 쿠키로 다시 열면 기록 그대로. 확인용 기록 1건은 공용 DB에 남음

## Test Results

| Test             | Input          | Expected     | Actual      | Status |
| ---------------- | -------------- | ------------ | ----------- | ------ |
| 공개 클래스 상세 | `/class/1` (비로그인) | F-05 항목·모집 중·구글 폼 안내 | 같음 | ✅ |
| 메타데이터 | `/class/1` | 이름·날짜·권역·강사 | 같음 | ✅ |
| 없는 클래스 | `/class/999999`, `abc`, `0x1`, `1e0` | 찾을 수 없음 | 화면 같음, HTTP 200 | ⚠️ 이슈 3 |
| `/go` 없음 | `/go/999999`, `abc`, `0x1` | 404, 기록 없음 | 같음 | ✅ |
| 중복 제거 | 같은 세션 2번 / 다른 세션 / 11분 뒤 / 로그인 두 브라우저 | 1 / 1 / 2 / 1 | 같음 (되돌림) | ✅ |
| 상태별 화면 | 가짜 데이터 open·closing_soon·closed·ended·canceled | 상태별 문구·행동 | 같음 | ✅ |
| 실제 예약 이동 | `/go/1` 두 번 (같은 쿠키) | 302 + 쿠키 1번 + 기록 1건 | 같음 | ✅ |

## Error Log

| Timestamp  | Error            | Attempt | Resolution           |
| ---------- | ---------------- | ------- | -------------------- |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question               | Answer           |
| ---------------------- | ---------------- |
| 1. 현재 어느 단계인가? | Phase 4 Testing — 비공개·예약 불가 클래스 `/go`만 미확인 (dev DB에 해당 데이터 없음) |
| 2. 다음에 할 일은?     | 커밋·PR (사용자 지시 시) |
| 3. 목표는?             | 클래스 상세를 보고 강사 예약 채널로 넘어가며, 넘어간 횟수를 클래스별로 센다 |
| 4. 지금까지 배운 것?   | findings.md 참고 |
| 5. 완료한 작업은?      | 위 내용 참고 |
