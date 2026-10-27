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
