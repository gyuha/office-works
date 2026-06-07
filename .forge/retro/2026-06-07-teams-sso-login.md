# 2026-06-07 — Teams(Microsoft Entra) SSO 로그인 (백엔드 provider + 프론트 e2e, 보안 재그릴링 포함)

## Plan vs actual
- **What went as planned**:
  - 1차 워크플로(BE·FE 병렬, worktree 미사용·api/web 디스조인트)로 S1~S6 전부 구현 — Microsoft 어댑터, 콜백 redirect(ADR 0002), 프론트 콜백/버튼/로그아웃, 설정 가이드. `web pnpm typecheck`/`build` 0.
  - **rbac retro의 worktree 교훈을 성공적으로 적용** — 같은 패키지 추가 작업에 worktree를 안 쓰고 동일 트리 디스조인트(api/ vs web/)로 병렬 → 1차 산출물이 통째로 버려진 rbac 사고가 재발하지 않음.
  - 2차(재그릴링 후 직접 처리)로 신원 도출 교정(F1)·id_token 검증(F2) — `tests/auth/` 146 passed, 변경 파일 ruff·mypy clean.
- **Divergences**:
  - [Critical → 해소] **1차 구현이 자신의 글로서리를 위반** — CONTEXT.md가 이미 "provider_user_id가 식별 키, 이메일은 매칭/인가 키로 안 씀"이라 명시했는데, 1차 계획이 `email → preferred_username → upn` 폴백을 설계로 채택하고 그 폴백 결과를 `oauth_provision_user`의 이메일 병합 키로 흘려보냄 → 가변·미검증 클레임으로 기존 계정을 무검증 링크하는 계정 탈취 경로. 워크플로 조건부 코드리뷰(auth=고위험)가 이를 잡아냈고, fg-ask 재그릴링 → ADR 0003 → F1/F2 수정으로 해소.
  - [High, 수용] refresh token을 localStorage(persist)에 영속 — 계획 non-goal("httpOnly 쿠키 전환 안 함")이 의도적으로 수용한 트레이드오프. 신규 surprise 아님.
  - [Medium, 해소] id_token aud/tid/exp 미검증, oid KeyError 뭉개짐 → F2에서 검증 추가 + oid 명시적 거부.
  - [환경] DoD의 `task lint && task test` 종료코드 0이 이 환경에서 미충족 — 사전 존재 ruff 7건(test_auth_flows.py) + stale Makefile 테스트 12건 + Python 3.14(3.12 요구). 전부 이번 작업 외 원인.

## Learnings
- **Do differently next time**:
  - **계획의 설계 결정이 글로서리 용어를 건드리면, 그 용어 정의와 대조 검사를 grilling에서 강제할 것.** 이번 critical의 뿌리는 "코드 버그"가 아니라 1차 계획이 자기 프로젝트 글로서리("이메일은 매칭 키 아님")와 모순되는 결정(email 폴백→병합 키)을 채택한 것. 글로서리는 Source of truth에 링크돼 있었으나 grilling이 결정 vs 용어 정합을 체크하지 않았다. fg-ask에서 plan의 각 보안/식별 결정을 관련 글로서리 용어와 명시 대조하는 단계가 있었으면 실행 전에 걸렸다.
  - **외부 IdP가 보장 못 하는 필수 필드는 "거부 vs 불안전 폴백" 갈림길로 표면화될 것이다 — grilling에서 미리 결정하라.** `User.email`이 NOT NULL·UNIQUE 자연키인데 Microsoft는 email 클레임을 보장 안 함 → 이 간극이 1차에서 가변 클레임 폴백(불안전)으로 메워졌다. "필수 데이터 모델 제약 vs IdP 보장 부재"가 보이면, 폴백의 보안 함의를 grilling에서 따져 "검증된 클레임만 + 부재 시 거부"를 미리 못 박아야.
  - **게이트성 DoD(`task test` 종료코드 0)는 베이스가 이미 RED일 때 무의미하다 — rbac retro에서 이미 나온 교훈이 2번째 확인됨.** 이번엔 매수(green 강제) 없이 "사전 위반 보고만"으로 정직하게 처리됐으나, DoD 자체가 충족 불가였다. 다음부터 게이트 DoD는 "내 변경분으로 인한 신규 위반 0 + 사전 위반/환경 제약은 기준선으로 분리"로 적되, 사전 게이트 빚(ruff 7건·stale Makefile 테스트 12건·3.12 환경)은 별도 정리 작업으로 떼어내야.
  - **auth 같은 고위험 변경엔 워크플로 코드리뷰 페이즈가 값을 한다 — 유지.** 이번 critical을 plan 검증(스펙 충족)은 통과시켰지만 적대적 리뷰가 잡았다. 스펙-충족 ≠ 안전.
  - **작은 보안 수정은 워크플로보다 직접 처리가 맞다.** 2차 델타(microsoft.py 1파일 + 테스트)는 단일 세션 직접 처리로 빠르고 쌌다. 워크플로는 병렬 이득이 실재할 때만.

## Doc updates
- CONTEXT.md promotion: `provider_user_id`(재식별 키 명확화), `검증된 이메일 클레임`(신설), `JIT 프로비저닝`(검증 email로만 연결) — **재그릴링(fg-ask) 단계에서 이미 반영**. 이 retro에서 신규 승격 없음.
- ADR added: ADR-0003(OAuth 신원 도출·계정 연결 정책) — **재그릴링 단계에서 이미 추가**. 이 retro에서 신규 없음.

## 후속 작업 후보 (fg-cleanup 후 fg-ask 대상)
1. **자동 cross-provider 병합 제거 + 명시적 재인증 연결 플로우** (ADR 0003 후속) — 검증 email 기반 자동 연결의 신뢰 가정을 더 강하게 하려면.
2. **사전 게이트 빚 정리** — `test_auth_flows.py` ruff 7건, `test_dev_server.py`/`test_migrations.py`의 stale Makefile 테스트 12건, Python 3.12 환경 정합. `task lint && task test` 종료코드 0 복원.
3. refresh token localStorage → HttpOnly·Secure 쿠키 핸드오프 (보안 강화, 현재 non-goal로 수용 중).
4. 콜백 setTokens를 /me 검증 성공 후로 순서 변경, 로그아웃 조건을 refresh token만으로 완화 (low 하드닝).
5. `callback.tsx:21` route tree stale 진단 — 워킹트리에서 `pnpm typecheck`/`build` 재확인(routeTree.gen.ts는 .gitignore 생성물).
