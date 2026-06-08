# 2026-06-07 — 조직 설정 ④/④ 근무·연차·회사정보 (config 싱글톤)

## Plan vs actual

- **What went as planned**:
  - 직접 순차 실행, 4커밋(`5f3b35f` 싱글톤 테이블+시드 · `e33b67f` 제네릭 repo+3 service+단위 · `9b6a7ef` config 라우트+통합 · `4f69484` 3개 탭 연동). org 테스트 **31 passed**, 변경분 ruff/mypy clean, typecheck/build OK, 0006 down/up 멱등. 라이브 config 게이트 401 확인.
  - 제네릭 `SingletonRepository[T]`(PEP 695)로 work/leave/company 3 리소스 공통화. GET(get_current_user)/PUT(org:write). 프론트 3개 탭 GET prefill+PUT 저장.
- **Divergences** (전부 정보성):
  - ruff UP046 → PEP 695 제네릭 신문법(3.14). mypy `_model: type[T]` 명시.
  - 회사정보 폼 키(camel) ↔ API(snake) 매핑. 통합테스트가 싱글톤 수정 후 시드 복원.

## Learnings

- **Do differently next time**:
  - **org 설정 4-part 시리즈를 완주했다 — part-plan 분할이 잘 작동했다.** 직급/고용형태(리스트)·등급(테이블 승격+sealed 연동)·config(싱글톤) 각자 독립 루프로 출시·검증·봉인. part 1이 세운 domains/org + org:write idempotent + 집계 라우터 + gen-api 패턴을 2~4가 그대로 복제 → 뒤 part일수록 빨라졌다. 이질적 묶음을 한 plan으로 안 묶은 게 정답이었다.
  - **단일 설정 레코드는 제네릭 SingletonRepository(PEP 695) 한 패턴으로 N개 리소스를 커버**한다. work/leave/company가 동일 get/put 모양이라 repo 보일러플레이트를 거의 0으로. 향후 단일 config 추가 시 재사용.
  - **★ admin role 부트스트랩 미해결이 5연속(members-list·positions·employment·grades·config) 화면 쓰기 UAT를 막았다.** 정적 게이트로 verified는 받았지만 브라우저 실검증은 매번 불가. org 시리즈가 끝났으니 **이제 이걸 다음 작업 최우선**으로 — env `ADMIN_EMAILS` 부트스트랩 또는 부여 UI.

## Doc updates
- CONTEXT.md promotion: **none** — 근무 기본값·연차 설정·회사 정보는 disambiguation이 필요한 도메인 개념이 아닌 자명한 설정 레코드(직급/등급처럼 혼동 축이 아님). 글로서리 등재 불필요.
- ADR added: **none** — 싱글톤 테이블·PEP 695 제네릭은 관행, 되돌리기 어렵·의아·트레이드오프 3조건 미충족.

## 후속 작업 후보 (fg-cleanup 후 fg-ask 대상)
1. **admin role 부트스트랩** (env ADMIN_EMAILS 등) — 5연속 UAT 차단, **최우선**. org 시리즈가 끝났으니 다음 작업.
2. **브랜치 머지 전략** — feat/member-management-api → members-list → org-positions → … → org-config로 stacked된 미머지 브랜치 체인. main 머지/PR 정리.
3. `.forge/codebase/*` 맵 stale(org 도메인 신설·Python 3.14·등급 테이블화 미반영) — fg-map 재실행.
4. (선택) 프론트 인증 SPA 클릭 UAT(전 org 탭 + members 등급) 일괄 검증.
