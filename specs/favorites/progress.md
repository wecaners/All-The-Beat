# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**


## Session 2026-11-03


### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. 사용자가 남은 Should 기능을 한 번에 하자고 해 F-20은 빼고(채널 결정·외부 설정 필요) F-22·F-23을 한 브랜치에서. README·findings·spec을 리뷰 없이 작성

**생성/수정 파일**:

- `specs/favorites/README.md`, `findings.md`, `spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan·tasks 작성. 새 테이블 마이그레이션은 사용자가 미리 승인

**생성/수정 파일**:

- `specs/favorites/plan.md`, `tasks.md`, `progress.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. `favorites` 스키마 → `0009_favorites` 생성·검토·적용 → generate "No schema changes"
2. `src/server/favorites`: `isFavorite`·`setFavorite`(공개 클래스만, 겹치면 무시/삭제)·`listMyFavorites`(다가오는 날짜 순 → 지난 최근 순, 화면 상태)
3. `setFavoriteAction`(로그인·프로필·동의·공개), `FavoriteButton`(하트 SVG + "찜", 켜지면 핑크, 로그인 시트, `?favorite=1` 복귀 자동 찜, 토스트), 클래스 상세 제목 줄 오른쪽, 마이 "찜한 클래스"(`ClassTicket` + 상태 배지)
4. docs/03 F-22 메모, docs/09 테이블·8절, `specs/README.md`

**생성/수정 파일**:

- `app/src/server/favorites/index.ts`, `app/src/app/class/[id]/favorite-button.tsx`, `app/src/db/migrations/0009_favorites.sql`, `meta/0009_snapshot.json` (새로 생성)
- `app/src/db/schema/{activity,index}.ts`, `app/src/app/class/[id]/{page,class-view,actions}.tsx`, `app/src/app/me/page.tsx`, `meta/_journal.json`, `docs/03-기능명세서.md`, `docs/09-ERD.md`, `specs/README.md` (수정)

### Phase 4: Testing 🔄

**작업 내역**:

1. 되돌리는 트랜잭션 안에서 가짜 사용자·클래스 5개(모집·마감·끝남·취소·숨김)로 8개 확인. 끝난 뒤 남은 행 0
2. 실제 `/class/16`(비로그인)에서 찜 버튼과 로그인 시트 확인 (375px)
3. `pnpm check`, `pnpm db:generate`, 개발 서버 로그 prerender 경고 없음

## Test Results

| Test | Input | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| 찜·두 번·빼기 | 공개 클래스 | 저장 / 1건 / 삭제 | 같음 | ✅ |
| 거절 | 숨김·없는 클래스 | "없는 클래스예요" | 같음 | ✅ |
| 목록 | 마감·모집·취소·끝남·숨김 찜 | 마감(2일)→모집(5일)→취소→끝남, 숨김 없음 | 같음 | ✅ |

## Error Log

| Timestamp | Error | Attempt | Resolution |
| --- | --- | --- | --- |

## 5-Question Reboot Check


작업 재개 시 이 질문들로 컨텍스트 복구:

| Question | Answer |
| --- | --- |
| 1. 현재 어느 단계인가? | Phase 4 (사용자 확인만 남음) |
| 2. 다음에 할 일은? | 로그인 복귀 자동 찜·동의 전 흐름 사용자 확인 |
| 3. 목표는? | 클래스를 찜해 두고 마이에서 모아 보며 마감·취소를 바로 안다 |
| 4. 지금까지 배운 것? | findings.md 참고 |
| 5. 완료한 작업은? | 위 내용 참고 |
