<!-- forge-slug: teams-sso-login -->
# run.md — Teams(Microsoft Entra) SSO 로그인 실행 기록 (계획 vs 실제)

**2-pass 기록**: 1차(아래)는 S1~S6 전체 구현 워크플로, 2차는 재그릴링 후 보안 수정(F1·F2). divergence #1(Critical)은 2차에서 해소됨.

---

## 2차 실행 (2026-06-07, 재그릴링 후 — 직접 처리, 워크플로 미사용)
재그릴링으로 신원 도출·계정 연결 정책 교정(ADR 0003). 델타가 `microsoft.py` 한 파일이라 단일 에이전트 직접 처리(test-first).

- **F1 (Critical 해소)**: `microsoft.py` email 도출을 `email || preferred_username || upn` → **검증된 `email` 클레임만**으로 변경. 부재 시 폴백 없이 거부(메시지에 Entra optional `email` 클레임 안내). `provider_user_id`는 `claims.get("oid")` + 부재 시 명시적 `ValueError`. → **가변 클레임이 병합 키에 도달하는 경로 제거.**
- **F2**: `_validate_claims` 추가 — `aud == client_id`·`tid == tenant_id`·`exp` 미만료 검증(서명 미검증은 기존 신뢰모델 유지). 게스트/cross-tenant/만료 토큰 거부.
- **테스트**: `test_microsoft_oauth_adapter.py` 재작성 — 기존 fallback 검증 2건을 "거부" 기대로 교체, oid 부재·aud 불일치·tid 불일치·exp 만료 거부 4건 추가. fallback 거부 테스트는 preferred_username/upn이 있어도 병합 안 함을 확인.
- **검증(직접)**: 변경 2파일 `ruff` clean, `microsoft.py` `mypy strict` clean, `pytest tests/auth/` → **146 passed, 1 skipped**(어댑터 9건 포함). plan 검증: F1·F2 완료 기준 충족.
- **코드리뷰**: 별도 리뷰 페이즈 생략 — 변경이 ADR 0003의 합의된 완화책을 그대로 구현한 ~40줄 보안 하드닝이고 테스트로 자체 검증됨.
- **DoD 게이트 환경 제약은 1차와 동일** — `task lint && task test` 종료코드 0은 사전 존재 ruff 7건 + stale Makefile 테스트 12건 + Python 3.14로 여전히 미충족(작업 외 원인). 3.12 + 사전 정리 후 재검증 필요.

---

## 1차 실행 (S1~S6 전체 구현)
실행: 2026-06-07 · Dynamic Workflow `wf_f9a8a187-cbd` · 에이전트 4개(BE·FE 병렬 → review → verify) · ~283k 토큰 · ~12.5분 · worktree 미사용(동일 트리, api/·web/ 디스조인트)

## 계획대로 된 것
- **백엔드 S1·S2·S6 (api/)**
  - `oauth/microsoft.py` 신규 — single-tenant v2.0 authorize(scope `openid email profile`, response_mode=query, state), `exchange_code`(token POST → id_token 디코드-온리 → `oid`/email-fallback/`name` 추출). `_get_oauth_adapter` 디스패치에 `microsoft` 등록, `core/config.py`에 `microsoft_*` 4개 필드.
  - 공유 `oauth_callback`을 `RedirectResponse(302)`로 전환 — 성공 `{frontend}/auth/callback#access_token&refresh_token`, 실패(state 불일치/교환/프로비저닝) 단일 `{frontend}/login?error=oauth`. `/login` 엔드포인트는 authz URL 반환 유지.
  - `.env.example`에 `MICROSOFT_*` 4개(주석·redirect 예시), `README.md`에 Azure 앱 등록 6단계 가이드.
  - 단위 테스트 6 + 콜백 redirect 테스트 3 신규(`tests/auth/test_microsoft_oauth_adapter.py`, `test_oauth_callback_route.py`). auth 단위 테스트 통과.
- **프론트 S3·S4·S5 (web/)**
  - `routes/auth/callback.tsx` 신규(route `beforeLoad` async 핸들러 — fragment 파싱→토큰 저장→`/auth/me`→`/`), `lib/api.ts` 신규(베이스 URL + bearer), `auth.store.ts` 토큰 보관 확장(persist 유지).
  - `teams-login.tsx` mock 제거 → `GET /api/v1/auth/oauth/microsoft/login` → `authorization_url`로 이동.
  - `topbar.tsx` 로그아웃이 `POST /auth/logout`(bearer) 호출 후 로컬 clear + `/login` 이동(오류여도 clear 보장).
- **빌드 게이트(web)**: `pnpm typecheck` 0, `pnpm build` 0.

## 계획과 어긋난 것 (divergences) — fg-learn / fg-ask 입력

### 1. [Critical → RESOLVED in 2차] 가변 클레임 fallback + 이메일 병합 → 계정 탈취 경로 (코드리뷰 발견)
> **해소(2차 F1)**: email 도출을 검증된 `email` 클레임만으로 제한, fallback 제거. 가변 클레임(preferred_username/upn)이 `get_user_by_email` 병합 키에 도달하지 못함. 자동 병합 자체는 ADR 0003 결정대로 유지(검증 email 기반). 아래는 1차 시점의 원 기록.

- `microsoft.py:131` email 도출 = `email → preferred_username → upn`. `preferred_username`/`upn`은 Entra에서 immutable 보장이 없는 가변 클레임(Microsoft 공식: 영구 식별자로 쓰지 말 것).
- `auth_service.py:455` `oauth_provision_user`는 OAuthAccount 미존재 시 그 email로 기존 User를 찾아 **재인증 없이 링크**하고 신규 생성 시 `mark_user_verified`까지 호출(:458).
- 결과: Entra UPN 재할당, 또는 email 클레임 부재로 preferred_username 폴백되는 테넌트에서, 공격자가 자기 Microsoft 로그인으로 같은 email 문자열의 기존 로컬/구글/카카오 계정에 무검증 링크 → 그 계정으로 JWT 발급(검증 우회 + 탈취).
- **분류 주의**: 이메일 병합 자체는 기존 동작(google/kakao/naver 공유)이고 계획이 "이메일 매칭(기존 oauth_provision_user 그대로)"를 명시 채택. 이번 변경의 델타는 **가변 클레임 fallback을 병합 키에 투입**한 점. plan 레벨 보안 결정이라 묵시 수정하지 않고 보고 → **fg-ask 재그릴링 대상**.
- 리뷰 권고: 링크 조인 키를 email→`(oid, tid)`/`sub`로, 자동 cross-provider 병합 제거(명시적 계정 연결 플로우), 최소한 검증된 email 없으면 폴백 병합 거부.

### 2. [High] refresh token을 localStorage(persist)에 영속 저장 — 단, 계획 non-goal로 수용된 트레이드오프
- 콜백이 refresh_token을 fragment로 받아 zustand persist(`om-auth`, localStorage)에 저장. XSS 1회로 7일 refresh token 유출 + 로테이션 패밀리 장악 면.
- 계획 non-goal이 "httpOnly 쿠키 전환 안 함"을 명시 → 이 위험은 **계획이 의도적으로 수용한 결과**. 신규 surprise 아님. 향후 보안 강화 시 partialize 제외 또는 HttpOnly 쿠키 핸드오프 검토 후보.

### 3. [Medium] id_token issuer/audience/tenant/exp 미검증 (디코드-온리)
- `_decode_id_token_claims`가 서명·iss·aud·tid·exp를 검증 안 함. 트러스트 모델(토큰 엔드포인트 직접 TLS 수신)은 google 어댑터와 동일하나, microsoft는 id_token 페이로드를 그대로 신뢰(google은 access_token으로 userinfo 별도 호출). 게스트/cross-tenant 토큰이 무검증 통과 가능, oid 식별자 불안정.
- 권고: 서명 없이도 가능한 `aud == client_id`, `tid == microsoft_tenant_id`, `exp` 미만료 검증 추가.

### 4. [Medium] `claims["oid"]` KeyError가 의도된 거부 경로와 뭉개짐
- `provider_user_id = claims["oid"]`(:140) 직접 인덱싱 → oid 부재 시 KeyError가 router의 `except Exception`(:337)에 잡혀 email-부재 ValueError와 구분 불가. 권고: `claims.get("oid")` + 명시적 ValueError.

### 5. [Low] 콜백 토큰 저장 순서 / 로그아웃 조건 / redirect_uri 일치
- callback.tsx: `/auth/me` 검증 **전** setTokens로 localStorage에 씀 → me 실패 시 clearUser로 정리되나, me 도중 탭 닫으면 미검증 토큰 잔존. 권고: me 성공 후 setTokens.
- topbar: access+refresh 둘 다 있어야 서버 logout 호출 → access만 비면 서버측 refresh 무효화 스킵.
- 운영: `MICROSOFT_REDIRECT_URI`와 Entra 등록 redirect 경로·대소문자 정확 일치 필요(불일치 AADSTS50011).

### 6. [Low] FE 부수 정리 (정당)
- 실 플로우는 클릭 즉시 Entra로 이동하므로 `teams-login.tsx`의 도달 불가 success 상태 분기 제거, `onAuthenticated` prop 제거 + `login.tsx`의 해당 전달부 정리(내 변경이 만든 orphan). 외과적 범위 내.
- `routeTree.gen.ts`는 Vite 플러그인 생성물(.gitignore) — dev 서버 18초 기동해 재생성. **유의: 새 TS 진단이 `callback.tsx:21` `"/auth/callback"` 미등록으로 떠 있음 → 현재 워킹트리의 route tree가 stale일 수 있음. UAT 전 `pnpm typecheck`/`pnpm build` 재확인 필요.**

## 검증 결과 (verify 에이전트, green 매수 없음)
- `web pnpm typecheck` → **0**, `web pnpm build` → **0** (DoD web 충족).
- `api task lint` → **1 (FAIL)**. ruff 7건 전부 `tests/auth/test_auth_flows.py`(unmodified, 5c5103d) — **사전 존재**, 이번 변경 무관.
- `api task test-unit` → **1 (FAIL)**. 12건 전부 `test_dev_server.py`/`test_migrations.py`가 **존재하지 않는 `api/Makefile`** 읽기 시도(stale, 5c5103d) — **사전 존재**, 이번 변경 무관. auth 단위 테스트는 통과. (커버리지 45% 보고는 unit 서브셋만 돌린 탓.)
- **DoD의 `task lint && task test` 종료코드 0은 이 환경에서 충족 불가** — (a) 활성 Python 3.14.2(CLAUDE.md는 3.12 요구), (b) 사전 존재 ruff 7건, (c) stale Makefile 테스트 12건. 전부 이번 작업 외 원인. **3.12 환경 + 사전 위반 정리 후 재검증 필요.**

## 남은 이슈 / 후속 후보
- **[Critical]** OAuth 신원/병합 정책 재설계(가변 클레임 fallback + 이메일 병합) — fg-ask 재그릴링.
- DoD 게이트 환경 정합: Python 3.12로 `task lint && task test` 재검증, 사전 존재 ruff 7건 + stale Makefile 테스트 12건 별도 정리(이번 작업 범위 밖, 보고만 함).
- `callback.tsx:21` route tree stale 진단 — 워킹트리에서 typecheck/build 재확인.
- id_token aud/tid/exp 검증, oid KeyError 거부 일관화, 콜백 setTokens 순서 (medium/low 보안 하드닝).
- 기능 UAT(Microsoft 로그인 → Entra → 대시보드)는 Azure 앱 등록 + 인프라 + 3.12 필요 — 사람 확인 대기.
