# Microsoft Teams (Azure AD) OAuth2 통합 함정

**프로젝트:** v1.1 — Microsoft Teams 소셜 로그인 추가
**분석 대상:** 기존 Spring Boot 3.x WebFlux + R2DBC + Google/Kakao OAuth2에 Azure AD 추가
**작성일:** 2026-05-30
**신뢰 수준:** HIGH (공식 Microsoft 문서 + Spring Security 문서 + 코드베이스 직접 분석)

---

## 치명적 함정 (Critical)

### 함정 1: `sub` 클레임을 providerId로 사용 — 재현 불가 사용자 충돌

**무엇이 잘못되는가:**
현재 `SocialAccount` 엔티티의 `providerId` 컬럼은 Google의 경우 `sub` 클레임을 그대로 저장한다. Azure AD에서 `sub` 클레임은 **applicationId × tenantId × userId의 해시값**으로, 동일한 사용자라도 앱을 삭제/재등록하면 값이 바뀐다. 또한 다중 테넌트 시나리오에서 같은 사람이 다른 테넌트로 접근하면 완전히 다른 `sub`가 발급된다.

Google의 `sub`는 사용자 전역 불변 식별자이므로 이 방식이 동작했지만, Azure AD에서는 구조적으로 다르다.

**올바른 식별자:** `oid` (Object ID) 클레임. Azure AD에서 `oid`는 테넌트 내 사용자를 영구적으로 식별하는 GUID이며, 앱 등록을 삭제해도 바뀌지 않는다.

**결과:**
- 앱 재등록 후 기존 사용자 전부 신규 계정으로 재가입
- 같은 회사 사람이 다른 테넌트 컨텍스트로 로그인하면 별도 계정 생성
- `oauth_accounts` 테이블의 `provider_id` 컬럼 데이터 오염 — 복구 불가

**예방 전략:**
- `MicrosoftUserInfoResponse` DTO에서 `oid` 필드를 `providerId`로 매핑
- `SocialUserInfo` 레코드의 providerId에 `oid` 값을 넣음 (`sub` 사용 금지)
- id_token을 파싱할 경우에도 동일: `oid` 클레임 우선

```java
// 틀린 방식
new SocialUserInfo("microsoft", response.sub(), ...)

// 올바른 방식
new SocialUserInfo("microsoft", response.oid(), ...)
```

**경고 신호:**
- 같은 사람이 로그인할 때마다 새 계정이 생성되는 버그
- `oauth_accounts` 테이블에 동일 이메일로 `provider_id`가 다른 레코드 다수 존재

**담당 단계:** MicrosoftOAuth2Handler 구현 단계 (Phase 1)

---

### 함정 2: `email` 클레임 부재 — 게스트 계정 및 B2B 사용자 처리 실패

**무엇이 잘못되는가:**
현재 `AbstractOAuth2Handler.resolveEmail()`은 이메일이 null이면 placeholder를 생성한다. Azure AD에서는 이메일 클레임 자체가 없는 시나리오가 매우 흔하다.

- **게스트(B2B) 계정:** `email` 클레임이 없거나 외부 테넌트의 UPN 형식이 포함됨
- **일반 조직 계정:** 관리자가 "email" optional claim을 토큰 구성에서 명시적으로 추가하지 않으면 absent
- **가용 필드:** `preferred_username`(UPN 형식, `user@company.com`), `upn`, `unique_name` — 이 중 `preferred_username`이 가장 안정적이지만 변경될 수 있음
- **불변 식별자:** 이메일이 아닌 `oid`만 불변. 이메일을 사용자 식별에 쓰면 안 됨

Graph API `/me` 엔드포인트를 호출하면 `mail` 필드를 얻을 수 있지만 추가 API 호출이 필요하고, 해당 필드도 null일 수 있다.

**결과:**
- 이메일 없는 사용자가 placeholder 이메일로 가입 → 이후 이메일 기반 로그인과 충돌
- `accounts.email` 컬럼에 UNIQUE 제약이 있으면 placeholder 충돌로 회원가입 실패
- 게스트 계정이 서비스에서 완전히 사용 불가

**예방 전략:**
- Microsoft 토큰에서 이메일 후보를 우선순위 순으로 시도:
  1. `email` 클레임 (있으면 최우선)
  2. `preferred_username` 클레임 (UPN, 대부분의 조직 계정에 존재)
  3. fallback: `microsoft_{oid}@social.placeholder` (oid 기반 유일성 보장)
- `accounts.email`을 사용자 식별의 PK로 쓰지 않도록 주의. `oauth_accounts.provider_id`(oid)가 실질적 식별자

```java
private String resolveEmail(MicrosoftUserInfoResponse resp) {
    if (resp.email() != null && !resp.email().isBlank()) return resp.email();
    if (resp.preferredUsername() != null && !resp.preferredUsername().isBlank()) return resp.preferredUsername();
    return "microsoft_" + resp.oid() + "@social.placeholder";
}
```

**경고 신호:**
- 로그인 시 `DataIntegrityViolationException` (UNIQUE 제약 위반)
- 동일 사용자가 이메일 클레임 유무에 따라 다른 계정으로 분리

**담당 단계:** MicrosoftOAuth2Handler 구현 단계 (Phase 1)

---

### 함정 3: v1/v2 엔드포인트 혼용 — audience 검증 실패

**무엇이 잘못되는가:**
Azure AD는 두 종류의 토큰 엔드포인트를 운영한다.

| 버전 | 엔드포인트 | 토큰 발급자(`iss`) | `aud` 클레임 형식 |
|------|-----------|-------------------|--------------------|
| v1.0 | `/oauth2/authorize` | `https://sts.windows.net/{tenantId}/` | Application ID URI |
| v2.0 | `/oauth2/v2.0/authorize` | `https://login.microsoftonline.com/{tenantId}/v2.0` | client-id (GUID) |

프론트엔드 SDK가 v2.0 엔드포인트로 토큰을 발급했는데, 서버가 v1.0 발급자 URL로 검증하면 `iss` 불일치로 토큰 검증이 실패한다. 반대로도 마찬가지다.

추가로: Azure App Registration 매니페스트의 `accessTokenAcceptedVersion`이 `null`이면 v1.0 토큰이 발급된다. 이를 `2`로 설정하지 않으면 v2.0 엔드포인트를 써도 내부적으로 v1.0 형식 토큰이 올 수 있다.

**결과:**
- 이 프로젝트의 현재 흐름(프론트가 provider access_token을 서버로 전달)에서는 직접적 JWT 검증이 없어서 `iss` 문제는 없음
- 그러나 Microsoft Graph userinfo 엔드포인트 호출 URL이 버전에 따라 다름:
  - v1.0 access token → `https://graph.microsoft.com/oidc/userinfo` 호출 가능하지만 클레임 제한
  - v2.0 access token → `https://graph.microsoft.com/v1.0/me` 또는 userinfo 엔드포인트 사용

**예방 전략:**
- 프론트엔드 MSAL.js 설정에서 반드시 v2.0 엔드포인트 사용: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize`
- Azure App Registration 매니페스트에서 `"accessTokenAcceptedVersion": 2` 설정 (기본 null → v1.0이므로 반드시 변경)
- 서버에서 Graph API 호출 시 `/v1.0/me` 엔드포인트를 사용해 일관성 유지
- 버전 혼용 발생 시 에러: `401 Unauthorized`와 함께 `InvalidAuthenticationToken` 응답

**경고 신호:**
- Graph API 호출 시 `401: InvalidAuthenticationToken`
- `iss` 클레임이 `sts.windows.net`으로 시작 (v1.0 토큰)

**담당 단계:** Azure App Registration 설정 + MicrosoftOAuth2Handler 구현 단계 (Phase 1)

---

### 함정 4: `/common` 테넌트 vs 특정 tenantId — 앱 등록 방식에 따른 실패

**무엇이 잘못되는가:**
Azure AD의 토큰 발급 엔드포인트는 tenantId 위치에 따라 동작이 완전히 달라진다.

| tenantId 위치 | 허용 계정 유형 | 주의 사항 |
|--------------|---------------|-----------|
| `{specific-tenant-id}` | 해당 테넌트 조직 계정만 | 단일 조직 앱에 적합 |
| `common` | 조직 계정 + 개인 Microsoft 계정 | 2018.10.15 이후 생성 단일 테넌트 앱에서 오류 발생 |
| `organizations` | 조직 계정만 (개인 제외) | B2B 게스트 허용 |
| `consumers` | 개인 Microsoft 계정만 | |

2018년 10월 15일 이후 생성된 앱이 단일 테넌트로 등록되어 있으면서 `/common` 엔드포인트를 사용하면 Azure AD가 `AADSTS50194` 오류를 반환한다.

Teams 환경에서는 보통 특정 조직의 테넌트 ID를 사용하는 것이 정석이다. "Microsoft Teams 로그인"이 실제로는 **해당 조직의 Azure AD 계정으로 로그인**이기 때문이다.

**결과:**
- `AADSTS50194: Application is not configured as a multi-tenant application` 오류
- 프론트에서 로그인 창 자체가 뜨지 않거나 콜백에서 에러 반환

**예방 전략:**
- 단일 조직(회사 내부 전용): 특정 `{tenantId}`를 하드코딩
- 여러 조직을 지원해야 한다면: App Registration에서 "Accounts in any organizational directory"를 선택하고 `/organizations` 사용
- 개인 Microsoft 계정도 지원하려면 App Registration에서 "Accounts in any organizational directory and personal Microsoft accounts" 선택 후 `/common` 사용
- 이 프로젝트의 "Microsoft Teams 소셜 로그인" 목적은 단일 조직으로 추정 → 특정 tenantId 권장

**경고 신호:**
- 로그인 창에서 `AADSTS50194` 에러 코드
- "Usage of the /common endpoint is not supported for such applications" 메시지

**담당 단계:** Azure App Registration 설정 단계 (Phase 0 사전 작업)

---

## 보통 함정 (Moderate)

### 함정 5: Microsoft Graph `/oidc/userinfo` 엔드포인트 — 반환 클레임이 id_token보다 적음

**무엇이 잘못되는가:**
현재 Google 핸들러는 `https://www.googleapis.com/oauth2/v3/userinfo`를 호출한다. Microsoft도 OIDC 표준 userinfo 엔드포인트(`https://graph.microsoft.com/oidc/userinfo`)를 제공하지만 반환 클레임이 매우 제한적이다: `sub`, `name`, `family_name`, `given_name`, `picture`, `email`(선택적).

특히 `oid` 클레임이 userinfo 엔드포인트에는 없다. `oid`를 얻으려면 id_token을 직접 파싱하거나 Graph API `/v1.0/me`를 호출해야 한다.

Microsoft 공식 문서도 "ID 토큰에서 정보를 가져오는 것이 최대 2번의 네트워크 요청을 줄이므로 권장"한다고 명시한다.

**결과:**
- userinfo 엔드포인트만 호출하면 `oid`를 얻을 수 없어 함정 1이 반드시 발생
- `email` 클레임도 관리자 설정에 따라 absent일 수 있음

**예방 전략:**
선택지 두 가지:

1. **Graph API `/v1.0/me` 호출 (권장):**
   - 반환 필드: `id`(=oid), `displayName`, `mail`, `userPrincipalName` 등
   - `id` 필드가 곧 `oid`이므로 providerId에 직접 사용 가능
   - 단 이 엔드포인트는 access token이 `https://graph.microsoft.com` audience로 발급되어야 함 (scope: `User.Read`)

2. **id_token 파싱 (JWT 디코딩):**
   - 프론트에서 id_token을 같이 전달받아 Base64 디코딩 후 클레임 추출
   - 추가 네트워크 호출 없음, `oid` 클레임 포함
   - 단 서버에서 서명 검증 없이 파싱만 할 경우 보안 위험 — **서명 검증 필수**

이 프로젝트의 현재 패턴(access_token으로 userinfo 호출)과 일관성을 유지하려면 Graph API `/v1.0/me` 호출이 적합하다.

**경고 신호:**
- `oid` 클레임이 없어서 providerId가 `sub`로 저장됨 (함정 1로 이어짐)
- userinfo 엔드포인트 응답에 `oid` 필드 없음

**담당 단계:** MicrosoftOAuth2Handler.fetchUserInfo() 구현 단계 (Phase 1)

---

### 함정 6: scope 오류 — access token이 Graph API에 접근할 수 없음

**무엇이 잘못되는가:**
프론트엔드에서 `openid`, `profile`만 scope에 포함하여 토큰을 발급받으면, 그 토큰으로는 `https://graph.microsoft.com/v1.0/me`를 호출할 수 없다. Graph API는 별도의 리소스(`https://graph.microsoft.com`)에 대한 access token이 필요하고, 이를 위해서는 `User.Read` scope (= `https://graph.microsoft.com/User.Read`)가 포함되어야 한다.

scope 오류는 두 가지 형태로 나타난다:

1. **audience 불일치:** openid scope만으로 발급된 토큰의 `aud`는 앱의 client_id. Graph API는 `https://graph.microsoft.com`을 audience로 요구 → `401 InvalidAuthenticationToken`
2. **permission 부족:** `User.Read` 없이 Graph API 호출 → `403 Forbidden`

**결과:**
- Graph `/v1.0/me` 호출 시 `401` 또는 `403` 응답
- `fetchUserInfo`가 에러를 던지고 소셜 로그인 전체 실패

**예방 전략:**
- 프론트엔드 MSAL 설정에서 scope에 반드시 `User.Read` 포함:
  ```javascript
  scopes: ["openid", "profile", "email", "User.Read"]
  ```
- `offline_access`도 포함하면 refresh token 발급됨 (프론트 토큰 갱신 필요 시)
- MSAL은 기본적으로 `openid`, `profile`, `offline_access`를 자동 포함하므로 `User.Read`만 명시적으로 추가하면 됨

**경고 신호:**
- Graph API 응답: `{"error": {"code": "InvalidAuthenticationToken"}}`
- 또는: `{"error": {"code": "Authorization_RequestDenied"}}`

**담당 단계:** 프론트엔드 MSAL 설정 + MicrosoftOAuth2Handler 통합 테스트 단계 (Phase 1~2)

---

### 함정 7: `AbstractOAuth2Handler`를 상속할 때 `@Autowired` 생성자와 `WebClient.Builder` 주입 문제

**무엇이 잘못되는가:**
현재 `GoogleOAuth2Handler`와 `KakaoOAuth2Handler` 모두 동일한 `WebClient.Builder webClientBuilder`를 주입받아 `webClientBuilder.build()`로 WebClient를 생성한다. Spring Boot의 `WebClient.Builder`는 `@Scope(PROTOTYPE)` — 즉, 호출될 때마다 새 인스턴스를 반환한다.

Microsoft Graph API는 base URL이 `https://graph.microsoft.com`이다. 기존 핸들러처럼 `webClientBuilder.build()`를 그대로 쓰면 매번 상대 경로 URI를 완전한 URL로 작성해야 한다. `webClientBuilder.baseUrl(...).build()` 패턴을 쓰면 더 간결하지만, 동일한 `Builder` 인스턴스를 여러 핸들러가 공유할 경우 **마지막으로 설정한 baseUrl이 다른 핸들러에 오염**될 수 있다.

Spring이 기본적으로 `WebClient.Builder`를 prototype으로 등록하므로 이 오염은 실제로 발생하지 않아야 하지만, 커스텀 `WebClientConfig`에서 Builder를 singleton으로 등록했다면 심각한 버그가 된다.

**결과:**
- MicrosoftOAuth2Handler에서 설정한 baseUrl이 GoogleOAuth2Handler WebClient에도 적용
- Google userinfo 호출이 `https://graph.microsoft.com/oauth2/v3/userinfo`로 날아가 `404`

**예방 전략:**
- `WebClient.Builder`가 prototype scope인지 확인 (`@Autowired WebClient.Builder`는 Spring Boot 기본이 prototype이므로 안전)
- 커스텀 WebClientConfig가 있다면 `@Bean @Scope(BeanDefinition.SCOPE_PROTOTYPE)` 확인
- 안전한 방식: 각 핸들러에서 `webClientBuilder.clone().baseUrl(...).build()` 사용

**경고 신호:**
- Google 로그인이 Microsoft 추가 이후부터 갑자기 실패
- Google userinfo 호출 URL이 `graph.microsoft.com`으로 나타남

**담당 단계:** MicrosoftOAuth2Handler 빈 등록 단계 (Phase 1)

---

### 함정 8: WebFlux 환경에서 `azure-spring-boot-starter` 사용 불가

**무엇이 잘못되는가:**
검색하면 Microsoft의 공식 Spring Boot 통합 라이브러리인 `com.azure.spring:spring-cloud-azure-starter-active-directory`를 추천하는 결과가 많다. 이 라이브러리는 **Servlet 기반 Spring MVC**를 전제로 설계되어 있다. WebFlux 환경에서 이 의존성을 추가하면:

- Servlet API 의존성 충돌
- `FilterChain` vs `WebFilterChain` 타입 불일치
- 자동 구성이 활성화되어 기존 `SecurityWebFilterChain` 설정을 덮어씀

이 프로젝트는 이미 `WebClient` 기반의 수동 OAuth2 핸들러 패턴(`AbstractOAuth2Handler`)을 갖고 있으므로, Microsoft 전용 스타터 없이 동일 패턴으로 구현하는 것이 올바르다.

**결과:**
- 앱 기동 실패: `NoSuchMethodError`, `ClassCastException` 또는 기존 보안 설정 무력화
- 기존 JWT 인증 필터가 비활성화될 수 있음

**예방 전략:**
- `spring-cloud-azure-starter-active-directory` 의존성 추가 금지
- Microsoft Graph WebClient 호출에 필요한 것은 `spring-webflux`(이미 있음)과 HTTP 호출 코드만으로 충분
- 필요하다면 `com.azure:azure-identity` (Azure SDK Core)는 추가 가능하지만 이 프로젝트 규모에는 과함

**경고 신호:**
- `build.gradle`에 `spring-cloud-azure-starter` 또는 `azure-spring-boot-starter-active-directory` 추가
- 앱 기동 시 `AutoConfiguration` 관련 빈 충돌 에러

**담당 단계:** 의존성 추가 전 검토 (Phase 1 시작 시)

---

### 함정 9: WebFlux에서 MS Graph API 호출 시 `block()` 사용

**무엇이 잘못되는가:**
`fetchUserInfo()`는 `Mono<SocialUserInfo>`를 반환해야 한다. 개발자가 Microsoft Graph SDK(`GraphServiceClient`)를 사용하면 동기 API이므로 `Schedulers.boundedElastic()`에서 `block()`을 써야 하거나 `Mono.fromCallable()`로 감싸야 한다. 그러나 이미 WebFlux reactor 스레드 위에서 `block()`을 직접 호출하면 `IllegalStateException: block()/blockFirst()/blockLast() are blocking...` 에러가 발생하고 서버가 데드락에 빠진다.

현재 `AbstractOAuth2Handler`의 `authenticate()` 메서드는 Reactor 체인 내부에서 실행된다. 여기에 동기 블로킹 코드를 끼워 넣으면 전체 이벤트 루프가 블로킹된다.

**결과:**
- Reactor Netty 이벤트 루프 스레드 블로킹 → 전체 서버 처리량 급감
- `IllegalStateException` 발생으로 소셜 로그인 완전 실패
- 스레드 고갈로 다른 API 엔드포인트도 응답 불가

**예방 전략:**
- Microsoft Graph SDK 사용 금지. `WebClient`로 직접 HTTP 호출 (기존 Google/Kakao 핸들러와 동일 패턴)
- `fetchUserInfo()`는 반드시 `Mono<SocialUserInfo>`를 리액티브하게 반환:

```java
@Override
protected Mono<SocialUserInfo> fetchUserInfo(String accessToken) {
    return webClient.get()
        .uri("https://graph.microsoft.com/v1.0/me")
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
        .retrieve()
        .bodyToMono(MicrosoftUserInfoResponse.class)
        .map(this::mapToSocialUserInfo);
}
```

**경고 신호:**
- `fetchUserInfo()` 내부에 `graphClient.me().get()` 같은 동기 호출
- 에러 로그: `block()/blockFirst()/blockLast() are blocking, which is not supported in thread reactor-http-nio-*`

**담당 단계:** MicrosoftOAuth2Handler 구현 단계 (Phase 1)

---

## 경미한 함정 (Minor)

### 함정 10: `SocialAccount.provider` 컬럼 값 명명 충돌

**무엇이 잘못되는가:**
`SocialAccount` 엔티티의 `provider` 컬럼에 저장되는 문자열은 현재 `"google"`, `"kakao"`. Microsoft를 추가할 때 `"microsoft"`, `"azure"`, `"ms"`, `"teams"` 중 무엇을 쓸지 정하지 않으면 `findByProviderAndProviderId` 쿼리가 일관되지 않게 된다.

**예방 전략:**
- `MicrosoftOAuth2Handler.PROVIDER = "microsoft"` 상수로 고정하고 코드 전체에서 리터럴 문자열 사용 금지
- 기존 `GoogleOAuth2Handler.PROVIDER = "google"`, `KakaoOAuth2Handler.PROVIDER = "kakao"` 패턴과 동일

**담당 단계:** MicrosoftOAuth2Handler 상수 정의 (Phase 1)

---

### 함정 11: id_token 파싱 시 nonce 검증 — Azure AD의 비표준 동작

**무엇이 잘못되는가:**
이 프로젝트는 id_token을 서버에서 직접 검증하지 않고, provider의 userinfo API를 호출하는 패턴이므로 실제로 발생하지 않을 가능성이 높다. 그러나 만약 id_token을 파싱하는 방식으로 구현을 변경할 경우:

Azure AD의 id_token은 JWT 헤더의 `nonce` 필드에 실제 nonce 값 대신 **SHA-256 해시값**을 넣는다. OIDC 표준 구현은 nonce를 평문으로 기대하므로, 표준 JWT 라이브러리로 nonce 검증하면 항상 실패한다.

**예방 전략:**
- id_token 직접 파싱 방식은 사용하지 않음 (Graph API `/v1.0/me` 호출 방식 유지)
- 불가피하게 id_token을 파싱할 경우 nonce 검증 로직 비활성화 또는 SHA-256으로 해시하여 비교

**담당 단계:** 해당 구현 방식 선택 시 (Phase 1)

---

### 함정 12: Flyway V4 마이그레이션에서 `provider` 컬럼 CHECK 제약 미업데이트

**무엇이 잘못되는가:**
만약 V3 마이그레이션의 `oauth_accounts` 테이블에 `CHECK (provider IN ('google', 'kakao'))` 같은 제약이 있다면, `"microsoft"` 값 INSERT 시 PostgreSQL이 `CHECK constraint violation` 에러를 던진다.

현재 V3 스키마에 이 제약이 없을 수도 있지만, 추가된 경우 반드시 V4 파일에서 수정해야 한다. V3 파일을 직접 수정하면 체크섬 위반으로 앱 기동 실패.

**예방 전략:**
- `oauth_accounts` 테이블 현재 DDL에서 `CHECK` 제약 확인
- 제약이 있으면 새 마이그레이션 파일(V4__)에서 `ALTER TABLE oauth_accounts DROP CONSTRAINT ...` 후 재정의하거나 CHECK 없이 유지
- V1~V3 파일 절대 수정 금지 원칙 유지

**경고 신호:**
- Microsoft 로그인 시 `R2dbcDataIntegrityViolationException: check constraint violation`

**담당 단계:** V4 마이그레이션 작성 단계 (Phase 1, V3 DDL 확인 후)

---

## 단계별 경고 요약

| 단계 | 핵심 함정 | 예방 액션 |
|------|-----------|-----------|
| Phase 0: Azure App Registration | `/common` vs tenantId 혼용, v1/v2 엔드포인트 미설정 | App Registration "Supported account types" 결정, 매니페스트 `accessTokenAcceptedVersion: 2` 설정 |
| Phase 1: MicrosoftOAuth2Handler 구현 | `sub` 대신 `oid` 사용, Graph `/v1.0/me` 호출, email null 처리, block() 금지 | `oid` 필드 매핑, `preferred_username` fallback, WebClient 비동기 체인 유지 |
| Phase 1: 빈 등록 | azure-spring-boot-starter 추가 금지, WebClient.Builder scope 확인 | 기존 패턴 그대로 복제, 외부 SDK 추가 없음 |
| Phase 1: 마이그레이션 | oauth_accounts CHECK 제약, provider 명명 | V4 파일 신규 작성, `"microsoft"` 상수 통일 |
| Phase 2: 프론트엔드 통합 | MSAL scope에 User.Read 누락, v1.0 access token | scope 목록 검증, accessTokenAcceptedVersion 확인 |
| Phase 2: 통합 테스트 | Graph API mock 부재, oid/email null 케이스 누락 | Mockito/WireMock으로 Graph API 응답 스텁, null email 테스트 케이스 필수 포함 |

---

## 출처

- Microsoft Entra 공식 문서 — [ID Token Claims Reference: oid vs sub](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference) [HIGH]
- Microsoft Entra 공식 문서 — [UserInfo Endpoint](https://learn.microsoft.com/en-us/entra/identity-platform/userinfo) [HIGH]
- Microsoft Entra 공식 문서 — [Scopes and Permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc) [HIGH]
- Microsoft Entra 공식 문서 — [OAuth2 Authorization Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) [HIGH]
- Microsoft Q&A — [/common endpoint not supported for single-tenant apps post 2018](https://learn.microsoft.com/en-us/answers/questions/960066/aad-returned-an-error-response-case-usage-of-the-c) [HIGH]
- Microsoft Q&A — [accessTokenAcceptedVersion setting](https://learn.microsoft.com/en-us/answers/questions/1118962/azure-ad-setting-the-accesstokenacceptedversion) [HIGH]
- Microsoft Q&A — [Email optional claim not returned in Entra ID access token](https://learn.microsoft.com/en-us/answers/questions/2126330/email-optional-claim-not-being-returned-in-entra-i) [HIGH]
- GitHub Issue — [oauth2-proxy: Invalid audience with Azure AD v1/v2 mismatch](https://github.com/oauth2-proxy/oauth2-proxy/issues/1715) [MEDIUM]
- Medium — [Making Azure AD OIDC Compliant: nonce SHA-256 비표준 동작](https://xsreality.medium.com/making-azure-ad-oidc-compliant-5734b70c43ff) [MEDIUM]
- Spring Security 공식 문서 — [OAuth2 WebFlux](https://docs.spring.io/spring-security/site/docs/5.1.7.RELEASE/reference/html/webflux-oauth2.html) [HIGH]
- 코드베이스 직접 분석: `AbstractOAuth2Handler.java`, `GoogleOAuth2Handler.java`, `KakaoOAuth2Handler.java`, `SocialAccount.java`, `SocialUserInfo.java`, `AuthController.java` [HIGH]
