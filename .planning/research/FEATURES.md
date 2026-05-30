# Feature Landscape

**Domain:** Microsoft Teams (Azure AD) OAuth2 소셜 로그인 추가
**Researched:** 2026-05-30
**Context:** 기존 Google/Kakao OAuth2 구현 위에 Microsoft provider 추가. 신규 아키텍처 없음 — 패턴 재사용.

---

## 기존 구현 재사용 범위 (재구현 불필요)

| 기존 코드 | 재사용 방식 |
|-----------|------------|
| `AbstractOAuth2Handler` | 상속 — `fetchUserInfo()` 만 구현 |
| `SocialUserInfo` record | 그대로 사용 (provider, providerId, email, nickname, profileImageUrl) |
| `AuthController.socialLogin()` | switch 케이스 1개 추가만 필요 |
| `findOrCreateAccount()`, `issueTokens()` | 부모 클래스에 이미 구현됨 |
| `resolveEmail()` fallback | email nullable 처리 로직 재사용 |
| `WebClient`, Repository 빈들 | 주입 그대로 사용 |

---

## Table Stakes (없으면 기능 자체가 동작하지 않음)

| Feature | Why Expected | Complexity | 기존 의존성 |
|---------|--------------|------------|------------|
| `MicrosoftOAuth2Handler` 구현 | `AbstractOAuth2Handler` 패턴 그대로 확장 | Low | `AbstractOAuth2Handler` 상속 |
| Microsoft Graph UserInfo API 호출 | access token → `https://graph.microsoft.com/oidc/userinfo` 호출하여 사용자 정보 획득 | Low | `WebClient` 재사용 |
| `oauth_accounts` 테이블 CHECK 제약 확장 | 현재 `CHECK (provider IN ('google', 'kakao'))` 가 microsoft INSERT를 차단함 | Low | V4 Flyway 마이그레이션 필요 (V1~V3 수정 금지) |
| `AuthController` switch 케이스 추가 | `resolveHandler("microsoft")` 처리 | Low | 기존 switch 1줄 확장 |
| Azure AD App Registration | client-id 발급 (개발자 수동 작업, 코드 아님) | Low | 환경변수 추가 |
| 단위 테스트 `MicrosoftOAuth2HandlerTest` | JaCoCo 60% 라인 커버리지 요구사항 | Low | Google/Kakao 테스트 패턴 그대로 복사 후 수정 |

---

## Differentiators (있으면 좋지만, 없어도 기본 로그인은 동작)

| Feature | Value Proposition | Complexity | 기존 의존성 |
|---------|-------------------|------------|------------|
| `tenantId` 저장 | Azure AD 멀티테넌트 환경에서 사용자가 어느 조직에 속하는지 추적 가능. `tid` 클레임에서 획득. 현재 비즈니스 요구사항이 명확하지 않으면 구현하지 말 것 | Medium | `SocialAccount` 모델 또는 별도 컬럼 필요 |
| 개인 계정 vs. 조직 계정 구분 | `tid == 9188040d-6c67-4c5b-b112-36a304b66dad` 이면 개인 Microsoft 계정. 다르면 Azure AD 조직 계정 | Medium | `SocialAccount` 또는 `Account` 모델 변경 |
| `displayName` 우선 사용 (`name` 클레임) | Microsoft Graph가 반환하는 `name`은 Azure AD 디렉토리 displayName. 조직 계정은 부서명 포함 형식 가능 | Low | `SocialUserInfo.nickname` 매핑으로 충분 |

---

## Anti-Features (명시적으로 구현하지 말아야 할 것)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Microsoft Graph `/v1.0/me` API 호출 | `User.Read` 권한 동의 필요. UserInfo endpoint(`/oidc/userinfo`)로 충분 | `https://graph.microsoft.com/oidc/userinfo` 사용 |
| `email` 클레임 필수화 | 개인 Microsoft 계정은 email 클레임이 없을 수 있음. 조직 계정은 multi-tenant에서 unverified email 가능 [HIGH — 공식 문서] | 기존 `resolveEmail()` fallback 로직 그대로 사용 |
| access token을 JWT로 직접 파싱 | Microsoft Graph access token은 클라이언트가 파싱하면 안 되는 불투명 토큰일 수 있음. 공식 문서에 명시: "do not attempt to validate or read tokens for any API you don't own" [HIGH] | Bearer 토큰으로 UserInfo endpoint에 그냥 전달 |
| Spring Security OAuth2 Login 서버사이드 흐름 추가 | 현재 구조는 프론트엔드가 access token 획득 후 전달하는 클라이언트 주도 방식. 서버사이드 redirect 흐름은 아키텍처 변경 필요 | 기존 `POST /api/v1/auth/social/{provider}` 패턴 유지 |
| `offline_access` scope 요청 | 서버가 Microsoft refresh token을 저장하는 구조가 아님. 프론트에서 access token만 전달 | scope 최소화: `openid profile email` |

---

## Microsoft Identity Platform: 스코프별 제공 데이터 정리

### 스코프 선택 기준 [HIGH — Microsoft 공식 문서]

| Scope | 필요 여부 | 획득 데이터 |
|-------|----------|------------|
| `openid` | 필수 | `sub` (pairwise ID), UserInfo endpoint 접근권 |
| `profile` | 필수 | `name`, `given_name`, `family_name`, `preferred_username`, `oid` |
| `email` | 권장 | `email` (없을 수 있음 — nullable 처리 필수) |
| `User.Read` | 불필요 | Graph API 전체 사용자 프로필 — 이번 범위 초과 |

**권장 스코프:** `openid profile email`

### UserInfo Endpoint (`https://graph.microsoft.com/oidc/userinfo`) 응답 클레임 [HIGH]

```json
{
  "sub": "OLu859SGc2Sr9ZsqbkG-QbeLgJlb41KcdiPoLYNpSFA",
  "name": "Mikah Ollenburg",
  "family_name": "Ollenburg",
  "given_name": "Mikah",
  "picture": "https://graph.microsoft.com/v1.0/me/photo/$value",
  "email": "mikoll@contoso.com"
}
```

Microsoft 공식 문서: "Information in an ID token is a superset of the information available on UserInfo endpoint. We suggest getting the user's information from the token instead of calling the UserInfo endpoint." — 그러나 현재 구조(프론트가 access token만 전달)에서는 UserInfo endpoint 호출이 가장 단순한 경로.

### ID 토큰 주요 클레임 (참고용 — 현재 구조에서는 직접 사용 안 함)

| 클레임 | 타입 | 설명 | 주의 |
|--------|------|------|------|
| `oid` | GUID | 테넌트 내 사용자 고유 ID — 앱 간 공유 가능 | `profile` scope 필요 |
| `sub` | String | client-id별 pairwise ID — 앱 교차 조회 불가 | UserInfo는 `sub` 반환 |
| `tid` | GUID | 테넌트 ID. `9188040d-...` = 개인 계정 | `profile` scope 포함 시 포함 |
| `email` | String | 이메일 (nullable — 개인 계정은 없을 수 있음) | `email` scope 필요 |
| `name` | String | displayName (mutable, 변경 가능) | `profile` scope 필요 |
| `preferred_username` | String | UPN 또는 이메일 형식 (mutable) | v2.0 토큰만 |

### `oid` vs `sub`: providerId 선택 판단 [HIGH]

- UserInfo endpoint는 `sub`(pairwise)만 반환. `oid`를 쓰려면 ID token을 별도로 획득해야 함.
- `sub`(pairwise)를 `providerId`로 쓰면: 동일 사용자가 다른 앱으로 로그인해도 이 앱의 `oauth_accounts` 레코드와 충돌 없음.
- **결론:** 현재 구조(프론트가 access token만 전달)에서는 UserInfo endpoint의 `sub`를 `providerId`로 사용하는 것이 가장 단순하고 안전함. ID token 분리 파싱은 불필요한 복잡성.

---

## 개인 계정 vs. Azure AD 조직 계정 차이 [HIGH — Microsoft 공식 문서]

| 항목 | 개인 Microsoft 계정 | Azure AD 조직 계정 |
|------|--------------------|--------------------|
| tenant 값 | `common` 또는 `consumers` | `organizations` 또는 특정 tenant ID |
| `tid` 클레임 | `9188040d-6c67-4c5b-b112-36a304b66dad` | 조직 고유 GUID |
| `email` 가용성 | 있을 수도, 없을 수도 있음 | 보통 있음 (UPN 기반) |
| App Registration 설정 | "Personal accounts only" 또는 "Any Entra ID + Personal" | "Multitenant" 또는 "Single tenant" |

**권장 Azure App Registration 설정:** `Multitenant + Personal Microsoft accounts` (authorizationUri의 tenant=`common`) — 가장 넓은 범위로 시작, 추후 조직 계정 전용으로 제한 가능.

---

## Feature 의존성 그래프

```
V4 Flyway 마이그레이션 (oauth_accounts CHECK 제약 확장: 'microsoft' 추가)
    ↓
MicrosoftOAuth2Handler (AbstractOAuth2Handler 구현)
    ↓
AuthController switch 케이스 추가 ("microsoft" → handler)
    ↓
application-local.yml / application-prod.yml 환경변수 추가
```

단위 테스트(`MicrosoftOAuth2HandlerTest`)는 `MicrosoftOAuth2Handler` 완성 후 작성.

---

## MVP 구현 범위

**구현:**
1. V4 Flyway — `oauth_accounts.provider` CHECK 제약에 `'microsoft'` 추가
2. `MicrosoftOAuth2Handler` — `AbstractOAuth2Handler` 상속, `fetchUserInfo()` 구현
3. `AuthController` — switch에 `case "microsoft" -> microsoftOAuth2Handler` 추가
4. `application-local.yml` / `application-prod.yml` — 환경변수 주석 추가 (필요 시)
5. `MicrosoftOAuth2HandlerTest` — 기존 Google/Kakao 테스트 패턴으로 단위 테스트

**명시적 제외:**
- `tenantId` 저장 — 현재 비즈니스 요구사항 없음
- 개인/조직 계정 구분 로직
- Microsoft Graph `/v1.0/me` 상세 프로필 조회

---

## 구현 시 핵심 주의사항 (우선순위순)

1. **`email` nullable 처리 필수** — 기존 `resolveEmail()` fallback 이미 존재하므로 그대로 활용
2. **UserInfo `sub`를 providerId로** — 별도 ID token 파싱 없이 단순하게 처리
3. **UserInfo endpoint 주소 하드코딩 가능** — `https://graph.microsoft.com/oidc/userinfo` (Google의 `USERINFO_URL` 패턴 그대로)
4. **V4 마이그레이션만 추가** — V1~V3 수정 금지 (기존 CLAUDE.md 규칙)
5. **`SocialAccount.provider` CHECK 제약 변경** — DB 레벨 제약도 함께 수정해야 INSERT 성공

---

## Sources

- [Microsoft Identity Platform OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc) [HIGH]
- [Microsoft Identity Platform Scopes](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc) [HIGH]
- [ID Token Claims Reference](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference) [HIGH]
- [UserInfo Endpoint](https://learn.microsoft.com/en-us/entra/identity-platform/userinfo) [HIGH]
- [App Registration Guide](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app) [HIGH]
- [Spring Security 6.5 Reactive OAuth2 Login](https://docs.spring.io/spring-security/reference/6.5/reactive/oauth2/login/core.html) [HIGH]
