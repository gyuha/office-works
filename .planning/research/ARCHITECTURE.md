# 아키텍처 패턴: Microsoft OAuth2 통합

**도메인:** 소셜 로그인 확장 (Google/Kakao → Google/Kakao/Microsoft)
**조사일:** 2026-05-30
**신뢰 수준:** HIGH (기존 코드 직접 분석 + Microsoft 공식 문서 확인)

---

## 현재 아키텍처 분석

이 프로젝트의 소셜 로그인은 Spring Security OAuth2의 서버-사이드 리다이렉트 흐름이 아니라,
**클라이언트 주도 방식(Client-Initiated Token Exchange)**으로 구현되어 있다.

프론트엔드가 각 provider로부터 access token을 직접 획득한 후,
`POST /api/v1/auth/social/{provider}` 에 그 토큰만 전달하면 백엔드가 userinfo를 조회하고 JWT를 발급한다.

```
프론트엔드
  → provider 로그인 (Google/Kakao SDK)
  → provider access token 획득
  → POST /api/v1/auth/social/{provider} { accessToken }
      ↓
AuthController.resolveHandler(provider)
      ↓
{Google|Kakao}OAuth2Handler.authenticate(token)
      ↓
fetchUserInfo(token) → provider userinfo API
      ↓
findOrCreateAccount(userInfo) → oauth_accounts + users 테이블
      ↓
issueTokens(account) → JWT Access/Refresh 반환
```

이 구조 덕분에 Microsoft 추가는 **Spring Security OAuth2 설정을 전혀 건드리지 않는다.**
`application.yml`의 `spring.security.oauth2.client.*` 섹션은 이 흐름과 무관하다.

---

## Microsoft UserInfo 엔드포인트 vs Graph API /me — 핵심 차이

Microsoft는 두 가지 방식으로 사용자 정보를 제공한다.

| 항목 | OIDC UserInfo 엔드포인트 | Microsoft Graph `/me` |
|------|--------------------------|----------------------|
| URL | `https://graph.microsoft.com/oidc/userinfo` | `https://graph.microsoft.com/v1.0/me` |
| 반환 필드 | `sub`, `name`, `given_name`, `family_name`, `email`, `picture` | `id`, `displayName`, `mail`, `userPrincipalName`, `givenName`, `surname`, ... (더 많음) |
| 필수 스코프 | `openid`, `profile`, `email` | `User.Read` |
| `picture` 필드 | `https://graph.microsoft.com/v1.0/me/photo/$value` URL 반환 | 없음 (별도 `/me/photo/$value` 호출 필요) |
| providerId 식별자 | `sub` (Azure AD Object ID와 동일) | `id` |
| 이메일 필드 | `email` (consented 시 제공) | `mail` (nullable) + `userPrincipalName` (항상 존재) |

**결론: OIDC UserInfo 엔드포인트를 사용한다.**

이유:
1. 반환 필드가 Google UserInfo(`sub`, `name`, `email`, `picture`)와 동일한 구조다.
2. `SocialUserInfo` record의 5개 필드에 1:1 매핑된다. Graph API `/me`는 `mail`이 nullable이어서 별도 fallback 로직이 필요하다.
3. 기존 Google/Kakao 핸들러 패턴을 그대로 복제할 수 있다.

단, `picture` 필드 값(`https://graph.microsoft.com/v1.0/me/photo/$value`)은 **공개 URL이 아니다.** 이 URL에 접근하려면 별도 Bearer 토큰이 필요하다. 프론트엔드에서 `<img src="...">` 로 직접 렌더링할 수 없으므로 `profileImageUrl`을 null로 처리한다.

---

## 통합 포인트: 신규 vs 수정

### 신규 생성 (새 파일)

**`MicrosoftOAuth2Handler.java`**

위치: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/`
패턴: `KakaoOAuth2Handler`, `GoogleOAuth2Handler`와 완전히 동일한 구조

핵심 구현:

```java
@Component
public class MicrosoftOAuth2Handler extends AbstractOAuth2Handler {

    static final String USERINFO_URL = "https://graph.microsoft.com/oidc/userinfo";
    static final String PROVIDER = "microsoft";

    // 생성자 시그니처는 Google/Kakao 핸들러와 동일

    @Override
    protected Mono<SocialUserInfo> fetchUserInfo(String providerAccessToken) {
        return webClient.get()
                .uri(USERINFO_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + providerAccessToken)
                .retrieve()
                .bodyToMono(MicrosoftUserInfoResponse.class)
                .map(this::mapToSocialUserInfo);
    }

    private SocialUserInfo mapToSocialUserInfo(MicrosoftUserInfoResponse r) {
        return new SocialUserInfo(
                PROVIDER,
                r.sub(),      // Azure AD Object ID — providerId
                r.email(),    // nullable — AbstractOAuth2Handler가 placeholder 처리
                r.name(),
                null);        // picture URL은 인증 필요 → null 처리
    }

    record MicrosoftUserInfoResponse(
            @JsonProperty("sub") String sub,
            @JsonProperty("name") String name,
            @JsonProperty("email") String email,
            @JsonProperty("picture") String picture) {}
}
```

**`V4__microsoft_provider.sql`**

위치: `api/src/main/resources/db/migration/`

```sql
-- V4__microsoft_provider.sql
-- oauth_accounts.provider CHECK 제약에 'microsoft' 추가
ALTER TABLE oauth_accounts
    DROP CONSTRAINT chk_oauth_accounts_provider;

ALTER TABLE oauth_accounts
    ADD CONSTRAINT chk_oauth_accounts_provider
        CHECK (provider IN ('google', 'kakao', 'microsoft'));
```

---

### 수정 (기존 파일)

**`AuthController.java`**

수정 범위: `resolveHandler()` 메서드의 switch 표현식 1줄 추가 + `MicrosoftOAuth2Handler` 필드/생성자 주입.

```java
// 추가할 필드
private final MicrosoftOAuth2Handler microsoftOAuth2Handler;

// resolveHandler() switch에 추가
case "microsoft" -> microsoftOAuth2Handler;
```

---

## 데이터 흐름 (Microsoft 추가 후)

```
POST /api/v1/auth/social/microsoft
  { "accessToken": "<microsoft_access_token>" }
          ↓
AuthController.resolveHandler("microsoft")
  → MicrosoftOAuth2Handler
          ↓
GET https://graph.microsoft.com/oidc/userinfo
  Authorization: Bearer <microsoft_access_token>
          ↓
MicrosoftUserInfoResponse { sub, name, email, picture }
          ↓
SocialUserInfo { provider="microsoft", providerId=sub, email, nickname=name, profileImageUrl=null }
          ↓
socialAccountRepository.findByProviderAndProviderId("microsoft", sub)
  → 기존 계정: accountRepository.findById(userId)
  → 신규 계정: users INSERT + oauth_accounts INSERT (provider="microsoft")
          ↓
jwtTokenProvider.generateAccessToken(...) + generateRefreshToken(...)
          ↓
200 OK { accessToken, refreshToken }
```

---

## 빌드 순서 의존성

```
1. V4__microsoft_provider.sql 작성
       ↓ (DB 스키마가 먼저 확정되어야 통합 테스트 실행 가능)
2. MicrosoftOAuth2Handler.java 신규 생성
       ↓ (AbstractOAuth2Handler 상속 — 기존 코드 변경 없음)
3. AuthController.java 수정 (핸들러 주입 + switch 분기)
       ↓
4. MicrosoftOAuth2HandlerTest.java 신규 작성
       ↓
5. AuthControllerIT.java 또는 SocialLoginIT.java에서 "microsoft" 분기 통합 테스트
```

테스트 패턴: `KakaoOAuth2HandlerTest`를 그대로 복제하고 URL과 응답 DTO만 교체한다.

---

## 컴포넌트 경계

| 컴포넌트 | 책임 | 변경 여부 |
|----------|------|-----------|
| `AbstractOAuth2Handler` | 공통 흐름 (findOrCreate, JWT 발급) | 수정 없음 |
| `GoogleOAuth2Handler` | Google userinfo 조회 | 수정 없음 |
| `KakaoOAuth2Handler` | Kakao userinfo 조회 | 수정 없음 |
| `MicrosoftOAuth2Handler` | Microsoft OIDC userinfo 조회 | **신규 생성** |
| `AuthController` | provider 라우팅 | **수정: switch 1줄 + 필드 주입** |
| `SocialUserInfo` | 정규화 DTO | 수정 없음 |
| `SocialAccount` / `SocialAccountRepository` | DB 엔티티/조회 | 수정 없음 |
| `oauth_accounts` 테이블 | CHECK 제약 | **수정: V4 마이그레이션** |

---

## 주의사항

**provider 필드는 String — enum 아님.**

`SocialAccount.provider`는 `String` 타입이고, `SocialUserInfo.provider`도 `String`이다. DB에만 CHECK 제약이 있다. "MICROSOFT enum 추가"라는 작업 자체가 존재하지 않는다. 코드에서 바꿀 enum은 없고, 새 핸들러에서 `PROVIDER = "microsoft"` 상수만 정의하면 끝이다.

**`picture` URL은 인증 필요.**

Microsoft UserInfo의 `picture` 필드 값(`https://graph.microsoft.com/v1.0/me/photo/$value`)은 공개 URL이 아니다. 해당 URL에 접근하려면 유효한 Microsoft access token이 필요하다. 프론트엔드에서 `<img src>` 로 직접 사용 불가. `null`로 저장하는 것이 정답이다. 실제 프로필 이미지가 필요하다면 별도 Graph API 호출이 필요하며, 이번 milestone 범위 밖이다.

**테넌트 설정은 프론트엔드/Azure 등록 문제다.**

Microsoft OAuth2 앱 등록 시 `tenant_id` 설정 방식(`common` vs 특정 tenant ID)에 따라 프론트엔드가 사용하는 authority URL이 달라진다. 백엔드는 이에 무관하다. 어떤 tenant에서 발급된 access token이든 `https://graph.microsoft.com/oidc/userinfo`로 동일하게 호출하면 된다.

**V1 마이그레이션에 CHECK 제약이 있다.**

`V1__init.sql`의 `oauth_accounts` 테이블에 `CHECK (provider IN ('google', 'kakao'))` 제약이 걸려 있다. V4 마이그레이션에서 이 제약을 DROP 후 재생성해야 한다. V1은 절대 수정 금지이므로, V4에서 `ALTER TABLE ... DROP CONSTRAINT ... / ADD CONSTRAINT ...` 패턴을 사용한다. 이 외에 `users` 테이블의 role CHECK 제약은 이번 변경과 무관하다.

---

## 참고 출처

- [Microsoft Identity Platform UserInfo endpoint](https://learn.microsoft.com/en-us/entra/identity-platform/userinfo) — UserInfo 응답 필드 및 스코프 요구사항 [HIGH]
- [Get user - Microsoft Graph v1.0](https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0) — Graph `/me` 필드 목록 비교 [HIGH]
- [Get profilePhoto](https://learn.microsoft.com/en-us/graph/api/profilephoto-get?view=graph-rest-1.0) — picture URL 인증 요구사항 확인 [HIGH]
- 기존 코드 직접 분석: `AbstractOAuth2Handler`, `GoogleOAuth2Handler`, `KakaoOAuth2Handler`, `AuthController`, `V1__init.sql` [HIGH]
