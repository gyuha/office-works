# Requirements — Microsoft Teams (Azure AD) 소셜 로그인

## v1.1 Requirements

### OAuth (Microsoft 로그인 통합)

- [ ] **OAUTH-01**: 사용자는 Microsoft Teams(Azure AD) 계정으로 소셜 로그인할 수 있다 (단일 조직, 특정 tenantId)
- [ ] **OAUTH-02**: Microsoft 로그인 시 Graph API `/v1.0/me`의 `id` 필드(oid)를 providerId로 저장한다 (`sub` 사용 금지)
- [ ] **OAUTH-03**: Microsoft 로그인 시 email이 없는 경우 `preferred_username`(UPN) → `microsoft_{oid}@social.placeholder` 순으로 fallback 처리한다
- [ ] **OAUTH-04**: 기존 `AbstractOAuth2Handler` 패턴을 상속하는 `MicrosoftOAuth2Handler`를 구현한다 (신규 의존성 추가 금지)
- [ ] **OAUTH-05**: `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID` 환경변수로 Azure AD 앱 설정을 주입한다

### DB (스키마 변경)

- [ ] **DB-01**: Flyway V4 마이그레이션으로 `oauth_accounts.provider` CHECK 제약에 `'microsoft'`를 추가한다 (V1 수정 금지)

### Test (테스트)

- [ ] **TEST-01**: `MicrosoftOAuth2HandlerTest` 단위 테스트 — oid 매핑, null email fallback 케이스 포함 (JaCoCo 60% 충족)
- [ ] **TEST-02**: Microsoft 소셜 로그인 통합 테스트 (IT) — Graph API mock + 신규 사용자 생성 / 기존 사용자 재로그인 시나리오

## Future Requirements

- tenantId 저장 — `SocialAccount`에 컬럼 추가, 조직별 사용자 구분이 필요할 때
- 프로필 이미지 — Graph API 사진 API 연동 (현재는 null 처리)
- 개인/조직 계정 구분 (`tid` 클레임 기반)

## Out of Scope

- spring-cloud-azure-starter 또는 MSAL4J 도입 — WebFlux 미지원, 기존 SecurityWebFilterChain 오염
- 프론트엔드 MSAL.js 연동 — `mock-auth-api.ts` 실 연동 범위는 별도 마일스톤
- 멀티테넌트 (`/common` 엔드포인트) — 단일 조직 전용으로 결정

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| OAUTH-01 | Phase 5 | — |
| OAUTH-02 | Phase 5 | — |
| OAUTH-03 | Phase 5 | — |
| OAUTH-04 | Phase 5 | — |
| OAUTH-05 | Phase 4 | — |
| DB-01 | Phase 5 | — |
| TEST-01 | Phase 5 | — |
| TEST-02 | Phase 5 | — |
