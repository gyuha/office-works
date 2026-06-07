<!-- forge-slug: teams-sso-login -->
<!-- task: 2 -->
<!-- tdd: off -->
# Teams(Microsoft Entra) SSO 로그인 — 백엔드 provider + 프론트 end-to-end

> **재그릴링 1회 (2026-06-07)**: 1차 실행(`run.md` 참조)이 코드리뷰에서 Critical 계정 탈취 결함을 남겨 신원 도출·계정 연결 정책을 재설계함. S1~S6 구현물은 트리에 유지되고, 이번 갱신의 실행 대상은 아래 **수정 슬라이스(F1~F2)** = `microsoft.py`의 신원 도출 + id_token 검증 + 테스트 델타뿐이다. (재실행은 fg-run이 fresh run.md로 처리.)

## Goal / Non-goals
- **Goal**: "Microsoft로 로그인" 버튼이 실제 Microsoft Entra ID(single-tenant) authorization-code 로그인을 수행해, 사용자가 인증된 상태로 대시보드에 도달한다. 백엔드는 기존 Google/Kakao/Naver provider 패턴에 `microsoft`를 추가하고 자체 앱 JWT를 발급한다. 프론트는 mock을 실제 플로우로 교체한다. **신원 도출은 가변 클레임을 병합 키에서 배제해 계정 탈취 경로를 제거한다.**
- **Non-goals**: mock 화면(구성원/프로젝트/결재/근태 등)을 실제 API 데이터로 전환하지 않음 · email·password mock 로그인 제거 안 함 · PKCE 미적용(confidential client + state로 충분) · multi-tenant 미지원 · Microsoft Graph 호출 없음 · httpOnly 쿠키 전환 안 함.

## Source of truth
- **Glossary terms**: `OAuth 계정 연결(oauth_account)`, `provider_user_id`, `검증된 이메일 클레임`, `JIT 프로비저닝`, `앱 JWT / IdP 토큰` — `.forge/CONTEXT.md` (현행 "인증 / SSO" 섹션)
- **Related ADRs**: `.forge/adr/0002-oauth-browser-completion-fragment-redirect.md`, `.forge/adr/0003-oauth-identity-derivation-and-account-linking.md`
- **Definition of Done**: dev 환경에서 "Microsoft로 로그인" 클릭 → Entra(single-tenant) 인증 → 콜백 → SPA가 앱 JWT 저장 → 대시보드 도달. 로그아웃은 백엔드 `POST /auth/logout`으로 서버측 폐기 후 `/login` 이동. `api`: `task lint && task test`(커버리지 70%) 종료코드 0. `web`: `pnpm typecheck && pnpm build` 종료코드 0.

## 합의된 설계 결정 (요약)
- SSO 종류: **Entra ID OIDC 웹 로그인** (백엔드 authorization-code, Google 어댑터 미러링) — MSAL SPA 아님.
- 테넌트: **single-tenant**, authority = `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/{authorize,token}`.
- scope: **`openid email profile`** (사용자 동의로 충분, 관리자 동의·Graph User.Read 불필요).
- 신원 (재그릴링 교정, ADR 0003): **id_token 클레임만** — `oid`→provider_user_id(returning 사용자 재식별·인가 키), `name`→display_name. **이메일은 검증된 `email` 클레임으로만 도출하고, 부재 시 `preferred_username`/`upn`으로 폴백하지 않고 명확한 설정 오류로 거부**(Entra Token configuration의 optional `email` 클레임 안내). 가변 클레임은 신원/연결 키에서 완전 배제.
- id_token 검증 (재그릴링 추가, ADR 0003): 디코드-온리(서명 미검증, 직접 TLS 수신 신뢰모델)이되 **`aud == client_id`·`tid == microsoft_tenant_id`·`exp` 미만료를 디코드 후 검증**(single-tenant 강제, 게스트/cross-tenant 거부). `oid`는 `claims.get("oid")` + 부재 시 명시적 거부로 email 부재 거부 경로와 일관화.
- 토큰 핸드오프: 콜백 **302 → `{frontend}/auth/callback#access_token&refresh_token`** (ADR 0002), 실패 시 `→ {frontend}/login?error=oauth`.
- 프로비저닝: **JIT 자동 생성 + 검증된 이메일 기반 연결 유지**(기존 `oauth_provision_user` 그대로). 명시적 재인증 연결 플로우는 만들지 않음 — 단일 테넌트에서 검증된 `email`은 신뢰 가능한 디렉터리 mail이라는 가정(ADR 0003)에 의존. 자동 cross-provider 병합 제거는 후속 후보.
- 보안 디테일: client_secret은 토큰 POST에서 URL-encode(httpx form 자동), redirect URI는 경로 대소문자까지 정확 일치(AADSTS50011), http는 localhost만.

## Work slices (재그릴링 — 이번 실행 대상)

> **이미 구현됨 (1차 실행, `run.md`)**: S1 어댑터+config+`.env.example`, S2 콜백 redirect, S3 프론트 콜백/store, S4 버튼 실연결, S5 로그아웃, S6 docs. 이 슬라이스들의 산출물은 트리에 유지된다. 단 S1의 **신원 도출부**가 아래 F1으로 교체된다.

- [ ] **F1. 신원 도출 교정 — 가변 클레임 배제 (Critical)** — `api/src/domains/auth/oauth/microsoft.py` `exchange_code`의 email 도출을 `email || preferred_username || upn` → **검증된 `email` 클레임만**으로 변경. `email` 부재 시 `preferred_username`/`upn` 폴백 없이 명확한 `ValueError`로 거부(메시지에 Entra optional `email` 클레임 안내). `provider_user_id`는 `claims.get("oid")` + 부재 시 명시적 `ValueError`로 거부 경로 일관화.
  — 완료 기준: 단위 테스트가 (a) `email` 클레임만으로 정상 도출, (b) `email` 부재 + `preferred_username`/`upn`만 있을 때 **병합 없이 거부**(폴백 안 함), (c) `oid` 부재 시 명시적 거부를 검증. 기존 fallback 검증 테스트는 "거부" 기대로 교체.
- [ ] **F2. id_token 검증 추가 — single-tenant 강제** (same file) — `_decode_id_token_claims` 디코드 후 `aud == settings.microsoft_client_id`, `tid == settings.microsoft_tenant_id`, `exp` 미만료를 검증(서명 검증은 기존 신뢰모델대로 미적용). 불일치/만료 시 거부.
  — 완료 기준: 단위 테스트가 (a) 올바른 aud/tid/미만료 exp 통과, (b) 잘못된 aud·다른 tid(게스트/cross-tenant)·만료 exp 각각 거부를 검증.

> **범위 밖(이번 작업 아님, ADR 0003 후속 후보)**: 자동 cross-provider 병합 제거 + 명시적 재인증 연결 플로우. refresh token localStorage→HttpOnly 쿠키 전환(계획 non-goal로 수용). 사전 존재 게이트 위반(test_auth_flows.py ruff 7건, Makefile stale 테스트 12건)·Python 3.12 환경 정합은 별도 정리.

## Azure 앱 등록 — 사용자가 준비할 설정 (deep research 검증, Microsoft Learn 1차)
1. **앱 등록**: Entra 관리센터 → App registrations → New registration → 지원 계정 유형 **"이 조직 디렉터리만(single tenant)"** 선택.
2. **리다이렉트 URI**: 플랫폼 **Web** 추가 → `http://localhost:8000/api/v1/auth/oauth/microsoft/callback`(운영은 https 도메인). **경로 대소문자까지 정확히** 일치해야 함(불일치 → AADSTS50011). http는 localhost만 허용.
3. **ID 확보**: Overview에서 **Application (client) ID** = `MICROSOFT_CLIENT_ID`, **Directory (tenant) ID** = `MICROSOFT_TENANT_ID`.
4. **클라이언트 시크릿**: Certificates & secrets → New client secret → **Value를 즉시 복사**(이후 재표시 안 됨) = `MICROSOFT_CLIENT_SECRET`. 만료 최대 24개월(회전 정책 필요).
5. **API 권한**: `openid profile email`은 OIDC 사용자 동의 스코프라 **관리자 동의/Graph 권한 추가 불필요**(조직 정책상 admin consent를 선호하면 1회 부여 가능). Microsoft Graph **User.Read 불필요**.
6. **env**: `MICROSOFT_REDIRECT_URI`는 2번 값과 정확히 동일하게 설정.

(주의: `email` 클레임은 항상 오지 않음. **재그릴링 교정(ADR 0003)으로 백엔드는 검증된 `email` 클레임만 사용하고 부재 시 거부**하므로, 이 SSO를 쓰려면 Token configuration에서 optional claim `email`을 추가해야 한다 — `email → preferred_username → upn` 폴백은 제거됨.)
