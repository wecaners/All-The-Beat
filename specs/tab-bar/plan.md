# Implementation Plan: 하단 탭바

## Summary

`src/components/tab-bar.tsx` 클라이언트 부품 하나를 만들고 네 화면이 각자 붙인다. 켜진 탭은 `usePathname()`으로, 누르면 알약이 스프링으로 옮겨 가고 아이콘이 뛴 뒤 `Link`가 이동한다. 서버·스키마 변경은 없다.

## Requirements

1. 네 화면에 탭바, 그 밖엔 없음 (FR-1)
2. 탭·주소·켜짐 규칙 (FR-2~3, FR-6)
3. 알약·아이콘 움직임, 동작 줄이기 (FR-4)
4. 고정·안전 영역·아래 여백 (FR-5)
5. 홈 머리 정리 (FR-7)

## Critical Files

### New Files

- `app/src/components/tab-bar.tsx` — 탭바 부품

### Modified Files

- `app/src/app/page.tsx`, `app/src/app/classes/page.tsx`, `app/src/app/requests/page.tsx`, `app/src/app/me/page.tsx` — 탭바 붙이기, 아래 여백
- `_agent/rules/design.md` — 부품 표, 인터랙션 표 "탭바 알약" 상태
- `docs/03-기능명세서.md` — F-01·F-10 메모(입구 정리)

### Reference Files

- `design/concepts/round-3.html`(탭바 스타일·아이콘·움직임), `app/src/components/motion.ts`, `app/src/components/logo.tsx`(누르면 움직이는 링크 예)

## Architecture

### User Flow

```text
홈 / ─┐
목록 /classes ─┼─ [홈] [찾기] [추가요] [마이]  ← 아래 고정, 라임 알약이 켜진 탭 아래
랭킹 /requests ┤     │      │        │       │
마이 /me ─────┘     /    /search  /requests  /me
                         (검색 칸 자동 포커스)
누르면: 알약 left 전환(.45s 스프링) + 아이콘 hop → Link 이동 → 새 화면의 탭바가 같은 자리에 켜진 채 그려진다
```

### Domain Model

```text
TabBar (client)
├── TABS: [{ href, label, icon, isActive(pathname) }] × 4
├── active: usePathname() → index (없으면 -1)
├── pill: style.left = calc((active·2+1)·12.5% − 21px), motion-safe:transition-[left]
└── onClick(i): setActive(i), play(icon, hop 450ms)  (이동은 Link)
```

### Outside-In 으로 가는 이유

- 사용자가 일찍 화면을 손에 쥔다. 탭바 부품과 네 화면 붙임이 전부다
- 실제 화면이 안쪽 설계를 끌어준다. 켜짐 규칙과 여백은 화면에서 정해진다

## Implementation Steps

### Step 0: 인수 시나리오 작성

spec.md 시나리오를 `tasks.md` Phase 4 체크리스트로 옮긴다.

Mocking 상태: 없음.

### Step 1: 탭바 부품과 네 화면 붙이기

부품(알약·아이콘·켜짐), 네 화면 `pb-32` + `<TabBar />`, 홈 머리 마이 버튼 제거.

Mocking 상태: 없음.

### Step 2: 마무리

design.md 표 두 곳, docs/03 메모, 스펙 기록.

Mocking 상태: 없음.

## Verification

### Build

```bash
cd app && pnpm check
```

### Test

서버 변경이 없어 트랜잭션 테스트는 없다.

### Manual Test

1. 375px에서 네 화면의 탭바·켜진 탭, `/classes`에서 찾기 켜짐
2. 탭 누르면 이동·알약 이동, 찾기 → 검색 칸 포커스
3. 상세·검색·동의·약관에 탭바 없음
4. 긴 목록 끝이 가려지지 않음, 가로 넘침 없음, 서버 로그 오류 없음

## Considerations

### 기존 코드 재사용

`play`·`SPRING`(`motion.ts`), 스티커 테두리·그림자 토큰, `Logo`의 "누르면 움직이고 이동은 Link" 방식.

### 호환성

서버·스키마 변경 없음. 홈 머리의 마이 버튼이 사라진다(탭으로 대체).
