# Findings & Decisions

> **기술적 발견, 중요한 결정이 있을 때마다 이 파일을 즉시 업데이트하세요.**

## Requirements

- F-22: 클래스 찜. 마이페이지에서 목록. 찜한 클래스가 마감·취소되면 표시
- 04 IA: 마이(U-09) → 찜 목록(Should)
- terms-consent: 사용자 데이터를 남기는 행동은 약관 동의 뒤에

## Research Findings

### 코드베이스 구조

- 찜 테이블은 없다. ERD에도 없다(S3 "찜 / 최근 본 클래스"만 기획서에)
- 사용자 × 대상 1건은 유니크 + upsert로(`app.md`). `encores`·`requests`가 그 방식
- 클래스 상세: `getPublicClass` → `ClassView`. 로그인·내 상태는 `page.tsx`가 `readEncore`처럼 따로 읽어 넘긴다
- 로그인 복귀: `?request=open`·`?encore=open` 신호를 `useSearchParams`로 읽고 한 번 쓰고 `router.replace`로 지운다. 로그인 시트 문구·카톡 복귀 안내는 `request-panel.tsx`
- 마이: `listMyRequests`·`listMyEncores`(`src/server/me`) → `SongRow`·`ClassTicket`
- 화면 상태 계산: `displayStatusOf(status, ended)`, `classEnded` SQL (`src/server/classes`)

### 기존 패턴

- 액션은 `getCurrentUser` → `ensureProfile` → `hasConsented`(아니면 `consentRequired`) → 서버 함수 → `refresh()`
- 되돌리기 어려운 행동만 시트로 묻는다. 찜 해제는 가벼워 바로 한다

## Resources

### 문서

- F-22: `docs/03-기능명세서.md` "F-22", IA: `docs/04-IA.md:86`

### 코드 참조

- 앵콜 저장·액션: `app/src/server/encores/index.ts:112`, `app/src/app/class/[id]/actions.ts`
- 로그인 시트: `app/src/app/song/[slug]/request-panel.tsx:159`
- 마이 목록: `app/src/server/me/index.ts`

### API 엔드포인트

- 서버 액션: `setFavoriteAction(classId, on)` (로그인·동의)
- 페이지: `/class/{id}`(버튼), `/me`(목록)

## Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| 새 테이블 `favorites`(user_id, class_id, created_at), PK(user_id, class_id), 둘 다 cascade | 사용자 × 클래스 1건을 제약으로. 탈퇴·클래스 삭제 시 같이 사라진다 |
| 찜은 삽입(겹치면 무시)/삭제. 취소 시각을 남기지 않는다 | 다시 찜하면 새 찜이다. 남길 이유가 없다 |
| 찜할 때 클래스가 공개 상태인지 확인한다. 목록도 공개 조건으로 거른다 | 숨긴·비공개 클래스를 드러내지 않는다 |
| 어떤 화면 상태든 찜할 수 있다 | 마감된 클래스를 앵콜 기다리며 두는 쓰임 |
| 버튼은 제목 옆 둥근 스티커(하트 SVG + "찜"). 켜지면 핑크 | 상태 표시에 기호 대신 색·글자(design.md). 아이콘 버튼엔 `aria-label` |
| 비로그인: 로그인 시트 → `?favorite=1`로 돌아오면 자동 찜 | 추가요·앵콜과 같은 복귀 흐름 |
| 약관 동의 전이면 저장하지 않고 동의 화면으로 | terms-consent FR-5와 같다 |
| 마이 목록: 다가오는 것 날짜 순 → 지난·취소 최근 순. 상태 배지는 마감·끝남·취소만 | F-22 "마감·취소되면 표시" |

## Issues Encountered

(없음)

## Learnings

### 가벼운 토글은 시트 없이 (2026-11-03)

추가요·앵콜 취소는 되돌리기 어려워 시트로 묻지만, 찜 해제는 다시 누르면 그만이라 바로 한다. "되돌리기 어려운가"가 시트를 두는 기준이다.
