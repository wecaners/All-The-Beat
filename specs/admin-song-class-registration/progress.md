# Progress Log

> **각 단계를 완료하거나 문제가 발생하면 업데이트하세요.**

## Session 2026-10-27

### Phase 1: Requirements & Discovery ✅

**작업 내역**:

1. README.md 작성 (범위: 곡·아티스트 등록, 대리 강사·동의, 클래스 대리 등록 / 범위 밖: 병합, 영상 갱신, 숨김, 썸네일, 승인·클레임)
2. 사용자 지시로 단계별 리뷰 생략, findings·spec 바로 작성
3. 운영자 로그인 방식·권역 매핑·영상 정보 방식 결정 (findings Technical Decisions)

**생성/수정 파일**:

- `specs/admin-song-class-registration/README.md` (새로 생성)
- `specs/admin-song-class-registration/findings.md` (새로 생성)
- `specs/admin-song-class-registration/spec.md` (새로 생성)

### Phase 2: Planning & Structure ✅

**작업 내역**:

1. plan.md 작성 (Step 0~6), tasks.md 작성

**생성/수정 파일**:

- `specs/admin-song-class-registration/plan.md` (새로 생성)
- `specs/admin-song-class-registration/tasks.md` (새로 생성)

### Phase 3: Implementation ✅

**작업 내역**:

1. 권역 매핑 시드 마이그레이션 `0004` (서울 25개 구 → 권역 8개), dev 적용
2. 운영자 확인 `requireAdmin`(아니면 404), `/admin` 레이아웃(noindex)·요약, 운영자 지정 스크립트
3. 곡 등록·수정(아티스트 찾기/만들기, 다른 이름, slug 중복), 대표 영상(oEmbed, 퍼가기 막힘 거절), 곡 상세 캐시 갱신
4. 대리 강사 프로필(아이디 정규화·중복), 게재 동의(공개되는 클래스의 추가요 열기)
5. 클래스 대리 등록(F-12 검증, 장소 저장·재사용, 권역·링크 유형 추정, 공개 시 추가요 열기)

**생성/수정 파일**:

- `app/src/db/migrations/0004_seed_region_mappings.sql` (새로 생성)
- `app/src/server/admin/` shared·songs·instructors·classes (새로 생성)
- `app/src/server/youtube/index.ts` (새로 생성)
- `app/src/lib/auth/admin.ts` (새로 생성)
- `app/src/app/admin/` layout·page·actions·ui, songs·instructors·classes 화면 (새로 생성)
- `app/scripts/admin-grant.mts`, `app/package.json` (`admin:grant`)

### Phase 4: Testing 🔄

**작업 내역**:

1. `pnpm check` 통과, `db:generate` 차이 없음
2. 비로그인으로 `/admin` 4개 주소 → "찾을 수 없음", 운영 메뉴 안 보임, noindex
3. YouTube 링크 해석 6가지, oEmbed 공개 영상 성공·없는 영상 거절 확인
4. 사용자 계정을 운영자로 지정 (`pnpm admin:grant`), 사용자가 운영 화면에서 곡·영상·강사·동의·클래스 등록
5. DB로 결과 확인: 새 아티스트·곡·다른 이름, 영상 2곡, 대리 강사 동의, 장소 저장, 클래스 #1, NEON 추가요 opened
6. 한글 slug 곡 상세가 "찾을 수 없음"인 버그 발견·수정 (findings Issues 5), `pnpm check` 재통과

## Test Results

| Test             | Input          | Expected     | Actual      | Status |
| ---------------- | -------------- | ------------ | ----------- | ------ |
| 비로그인 /admin  | GET 4개 주소   | 찾을 수 없음 | 찾을 수 없음 (HTTP 200, 스트리밍) | ✅ |
| 영상 링크 해석   | youtu.be·watch·shorts·m.·다른 도메인·글자 | ID 4개, null 2개 | 같음 | ✅ |
| 영상 확인        | 공개 영상 / 없는 영상 | 성공 / not_found | 같음 | ✅ |
| 퍼가기 막힌 영상 | 막힌 영상 ID   | embed_blocked | 미확인 | ⏸️ |
| 곡 등록 (한글)   | 테스트가수·테스트곡 | 곡 상세 열림 | 수정 전 찾을 수 없음 → 수정 후 열림 | ✅ |
| 동의 → 추가요    | NEON 추가요 1건 | opened + 클래스 연결 | opened, 클래스 #1 | ✅ |
| 권역 추정        | 서울 마포구 양화로 100 | 홍대·합정 | 홍대·합정 (SQL) | ✅ |

## Error Log

| Timestamp  | Error            | Attempt | Resolution           |
| ---------- | ---------------- | ------- | -------------------- |
| 2026-10-27 | `tsc`가 `.next/dev/types` 라우트 타입 오류 | 1 | 개발 서버의 생성 타입이 새 레이아웃을 몰라서. `next typegen` 후 해결 |
| 2026-10-28 | 한글 slug 곡 상세 찾을 수 없음 | 1 | slug 디코딩 (findings Issues 5) |

## 5-Question Reboot Check

작업 재개 시 이 질문들로 컨텍스트 복구:

| Question               | Answer           |
| ---------------------- | ---------------- |
| 1. 현재 어느 단계인가? | Phase 4 Testing — 인수 1(일반 계정)·3(막힌 영상)·4·5·6·8·9 화면 확인 남음 |
| 2. 다음에 할 일은?     | 남은 인수 시나리오 확인, 테스트 데이터 정리 |
| 3. 목표는?             | 운영자가 곡과 아티스트를 등록하고, 강사를 대신해 클래스를 등록해서 수강생에게 공개 |
| 4. 지금까지 배운 것?   | findings.md 참고 |
| 5. 완료한 작업은?      | 위 내용 참고     |
