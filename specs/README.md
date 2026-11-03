# specs

기능 단위 스펙을 FBPW(File-based Planning Workflow) 방식으로 둔다. 기능마다 폴더 하나, 파일 여섯 개다.

| 파일 | 내용 | 언제 |
| --- | --- | --- |
| `README.md` | 왜 필요한가·무엇을 하는가·어떻게 동작하는가 | 구현 전 |
| `spec.md` | 사용자 시나리오·요구사항(FR)·제약(CON)·성공 기준(SC) | 구현 전 |
| `plan.md` | Outside-In 구현 단계, 검증 방법 | 구현 전 |
| `tasks.md` | 단계별 체크리스트, 지금 진행 중인 단계 | 구현 중 |
| `findings.md` | 조사 결과·결정과 이유·막힌 것·배운 것 | 계속 |
| `progress.md` | 세션별 작업 기록, 다시 시작할 때의 5문항 | 구현 중 |

## 쓰는 법

- 새 기능: `/fbpw-plan <기능 이름>` (`_agent/skills/fbpw-plan/SKILL.md`)
- 어떤 기능이 스펙을 거쳐야 하는지는 `_agent/rules/core-principles.md`의 "스펙 문서화" 기준을 따른다.
- 제품 전체 설계는 `docs/`에 있다. 스펙은 `docs/03`의 F-xx 등을 출발점으로 삼고 링크한다.

## 기능 목록

새 기능 폴더를 만들면 이 표의 맨 아래에 추가한다.

| 폴더 | 기능 | 상태 |
| --- | --- | --- |
| [admin-song-class-registration](admin-song-class-registration/) | 운영자 곡·클래스 등록 (F-15, F-16) | 구현 완료, 운영자 계정으로 확인 대기 |
| [design-system](design-system/) | 디자인 시스템 (덕질 스크랩북) + 곡 상세 적용 | 구현 완료, 로그인 흐름 확인 대기 |
| [admin-metrics](admin-metrics/) | 운영자 지표 (F-18) | 구현 완료, 운영자 화면은 사용자 확인 대기 |
| [account-withdrawal](account-withdrawal/) | 회원 탈퇴 (F-09, F-10) | 구현 완료, 실제 탈퇴·카카오 연결 끊기는 사용자 확인 대기 |
| [instructor-claim](instructor-claim/) | 대리 등록 강사의 계정 연결 (F-19) | 구현 완료, 실제 흐름은 사용자 확인 대기 |
| [teacher-profile](teacher-profile/) | 강사 프로필 페이지 (F-21) | 구현 완료 |
| [class-teaser](class-teaser/) | 강사 티저 영상 (F-25) | 구현 완료, 실제 폼 입력은 사용자 확인 대기 |
| [favorites](favorites/) | 찜 (F-22) | 구현 완료, 로그인 복귀 흐름은 사용자 확인 대기 |
| [story-image](story-image/) | 인스타 스토리 공유 이미지 (F-23) | 구현 완료, 휴대폰 공유 창은 사용자 확인 대기 |
