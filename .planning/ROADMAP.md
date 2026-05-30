# 로드맵: 메뉴별 접근 권한 관리 (RBAC)

## Milestones

- ✅ **v1.0 메뉴별 접근 권한 관리** — Phase 1-3 (shipped 2026-05-29)
- 🔄 **v1.1 Microsoft Teams 소셜 로그인** — Phase 4-5 (in progress)

## Phases

<details>
<summary>✅ v1.0 메뉴별 접근 권한 관리 (Phase 1-3) — SHIPPED 2026-05-29</summary>

- [x] Phase 1: DB 스키마 + 도메인 모델 — 2/2 plans — Flyway V3 마이그레이션 5개 테이블 + R2DBC 엔티티/리포지토리 5개
- [x] Phase 2: 권한 서비스 + 핵심 API — 3/3 plans — MenuPermissionService + GET /api/menus/my
- [x] Phase 3: ADMIN API + Security 통합 — 3/3 plans — GET /api/menus + AccessDeniedHandler + SecurityConfig

Full roadmap archived at: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Microsoft Teams 소셜 로그인

- [ ] **Phase 4: Azure AD 앱 등록 설정** — Azure Portal 체크리스트 + 환경변수 구성
- [ ] **Phase 5: Microsoft OAuth2 백엔드 구현** — MicrosoftOAuth2Handler + Flyway V4 + 단위/통합 테스트

## Phase Details

### Phase 4: Azure AD 앱 등록 설정
**Goal**: Microsoft Identity Platform 연동에 필요한 Azure AD 앱 등록이 완료되고 환경변수가 API 서버에 주입된다
**Depends on**: Phase 3 (v1.0 완료)
**Requirements**: OAUTH-05
**Success Criteria** (what must be TRUE):
  1. Azure Portal에서 App Registration이 생성되고 client-id, tenant-id, client-secret 세 값을 확보할 수 있다
  2. `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_SECRET` 환경변수가 로컬 실행 환경에 설정된다
  3. Redirect URI가 Azure Portal에 등록되어 OAuth2 콜백을 허용한다
  4. `application-local.yml`에 Microsoft OAuth2 provider 블록이 추가되고 앱이 오류 없이 기동한다
**Plans**: TBD

### Phase 5: Microsoft OAuth2 백엔드 구현
**Goal**: Microsoft Teams(Azure AD) 계정으로 소셜 로그인이 동작하고, oid 매핑·email fallback·기존 사용자 재로그인이 모두 검증된다
**Depends on**: Phase 4
**Requirements**: OAUTH-01, OAUTH-02, OAUTH-03, OAUTH-04, DB-01, TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. Microsoft 계정으로 로그인하면 JWT access/refresh 토큰이 발급되고 `oauth_accounts.provider = 'microsoft'` 레코드가 생성된다
  2. Graph API `/v1.0/me`의 `id`(oid) 필드가 `providerId`로 저장되고 `sub` 값은 사용되지 않는다
  3. email이 없는 계정은 `preferred_username` → `microsoft_{oid}@social.placeholder` 순으로 fallback 처리된다
  4. 동일 Microsoft 계정으로 재로그인하면 신규 `oauth_accounts` 레코드를 생성하지 않고 기존 사용자로 처리된다
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DB 스키마 + 도메인 모델 | 2/2 | Complete | 2026-05-28 |
| 2. 권한 서비스 + 핵심 API | 3/3 | Complete | 2026-05-28 |
| 3. ADMIN API + Security 통합 | 3/3 | Complete | 2026-05-29 |
| 4. Azure AD 앱 등록 설정 | 0/1 | Not started | - |
| 5. Microsoft OAuth2 백엔드 구현 | 0/3 | Not started | - |
