# 2026-06-07 — 조직 설정 ③/④ 등급 체계(grades) DB 승격 + members 연동

## Plan vs actual

- **What went as planned**:
  - 재그릴링 확정대로 직접 순차 실행, 4커밋(`341031f` 스키마+시드 · `9427baa` repo/service+members 검증전환 · `85d9f2b` router+varchar(16) · `2e8b1de` GradesTab CRUD+members 동적). org/members **41 passed**(unit+integration), 변경분 ruff/mypy clean, typecheck/build OK, 0005 down/up 멱등.
  - 핵심 위험 동작 통합테스트로 검증: rename이 member.grade로 cascade·참조 중 등급 delete 409·잘못된 grade로 member 생성 거부·reorder. **sealed members 회귀 0.**
  - import 순환(members↔org) 회피: 교차 도메인 접근을 전부 raw SQL로.
- **Divergences**:
  - **[Medium · 해소] members.grade varchar(8) → varchar(16)** — 고정 4값(2자)용 컬럼 폭이라 16자 등급명 rename cascade가 `StringDataRightTruncation`. 통합테스트가 잡음 → 0005에 ALTER 추가(+모델 String(16)).
  - [정보] members API 계약 거의 불변(grade enum→str 완화). PATCH가 grade엔 존재(편집 UI 있음).

## Learnings

- **Do differently next time**:
  - **★ "고정 enum → 관리 목록" 전환 시, 그 값을 참조하는 컬럼의 *폭*도 함께 넓혀라.** members.grade가 enum 4값(2자)용 varchar(8)였는데 관리 등급명은 16자까지 → cascade가 truncation으로 터졌다. enum을 테이블화할 때 "참조 컬럼이 새 값 길이를 수용하는가"를 마이그레이션 체크리스트에 넣을 것. (통합테스트가 실 DB라 잡았다 — 단위/모의만이었으면 놓쳤을 것.)
  - **교차 도메인 무결성(검증·cascade·count)은 raw SQL로 처리하면 import 순환을 피한다.** members→org(grade_exists)와 org→members(count/cascade)가 양방향이라 모델 import는 순환을 만든다. 양쪽을 `text("... other_table ...")` raw SQL로 두어 한 방향 import도 없이 해결. 재사용 가능한 패턴.
  - **sealed 작업을 건드리는 part는 "기존 테스트 전부 재실행 = 회귀 게이트"를 슬라이스마다 돌릴 것.** members schema/service/repo/프론트를 광범위하게 바꿨지만 매 슬라이스 끝에 `tests/members` 전체를 재실행해 회귀 0을 확인하며 진행 → 안전했다.
  - **admin role 부트스트랩 미해결이 4연속(members-list·positions·employment·grades) UAT를 막았다.** 더는 미루면 안 됨 — 다음 작업으로 빼는 것을 강하게 권장(part 4 끝나면 우선).

## Doc updates
- CONTEXT.md promotion: **`등급(Grade)` 정의 개정** — "고정 enum" → "관리 테이블(이름·색·설명·순서); members.grade가 이름으로 참조(FK 아님), rename cascade, 참조 중 삭제 차단". [[ADR-0005]] 링크.
- ADR added: **ADR-0005** — members.grade를 물리 FK 아닌 검증된 이름 문자열 + 앱레벨 rename-cascade로 둔 결정(되돌리기 어려움·의아함·트레이드오프 3조건 충족, sealed members 충격 최소화가 이유).

## 후속 작업 후보 (fg-cleanup 후 fg-ask 대상)
1. **admin role 부트스트랩** (env ADMIN_EMAILS 등) — 4연속 UAT 차단, **최우선**.
2. **part 4(config — 근무·연차·회사정보)** — backlog 마지막.
3. (선택) `members.grade`를 물리 FK로 승격 — 강한 무결성이 필요해지면(ADR-0005 뒤집기).
4. `.forge/codebase/*` 맵 stale — fg-map 재실행(등급 enum→테이블 등 반영).
