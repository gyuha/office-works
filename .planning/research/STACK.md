# Technology Stack — Spring WebFlux RBAC + Microsoft Teams OAuth2

**Project:** 메뉴별 접근 권한 관리 (RBAC) + v1.1 Microsoft Teams 소셜 로그인
**Researched:** 2026-05-27 (RBAC), 2026-05-30 (Microsoft OAuth2 추가)
**Scope:** Spring Security reactive method security + R2DBC permission lookups + Azure AD OAuth2

---

## v1.1 Microsoft Teams(Azure AD) OAuth2 추가 — 스택 결론

### 핵심 결론: 추가 라이브러리 불필요

기존 WebClient + `AbstractOAuth2Handler` 패턴으로 Microsoft도 동일하게 처리 가능하다. Microsoft 전용 스타터(`spring-cloud-azure-starter-active-directory`, MSAL4J)는 **WebFlux 환경에서 동작하지 않으며 필요하지도 않다.**

```groovy
// build.gradle — v1.1에서 신규 추가 의존성 없음
// 기존 WebClient + AbstractOAuth2Handler 패턴 재사용
```

[높음] 근거: 기존 Google/Kakao 구현이 `spring-security-oauth2-client` 없이 WebClient로 userinfo를 직접 호출하는 방식. Microsoft도 동일.

---

### Microsoft Azure AD 실제 엔드포인트

Microsoft OIDC discovery 문서(`https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration`)에서 직접 확인한 값:

| 항목 | URL |
|------|-----|
| Authorization Endpoint | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` |
| Token Endpoint | `https://login.microsoftonline.com/common/oauth2/v2.0/token` |
| **UserInfo Endpoint** | `https://graph.microsoft.com/oidc/userinfo` |
| OIDC Discovery | `https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration` |

[높음] 근거: Microsoft OIDC discovery 문서 직접 조회 (2026-05-30).

**주의:** UserInfo endpoint 호스트가 `graph.microsoft.com`이다. `login.microsoftonline.com`이 아님. Google의 `googleapis.com/oauth2/v3/userinfo`와 호스트가 다르므로 하드코딩 시 혼동 주의.

---

### Microsoft UserInfo 응답 구조

스코프 `openid profile email` 요청 시:

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

[높음] 근거: 공식 문서 learn.microsoft.com/en-us/entra/identity-platform/userinfo.

`SocialUserInfo` record 필드 매핑:
- `provider` → `"microsoft"` (고정 상수)
- `providerId` → `sub`
- `email` → `email` (nullable — 개인 Microsoft 계정 미제공 가능, 기존 placeholder 로직이 처리)
- `nickname` → `name`
- `profileImageUrl` → `null` 처리 (Graph API 포토 URL은 별도 인증 없이 접근 불가)

---

### 필요한 OAuth2 스코프

프론트엔드가 Microsoft access token 획득 시 요청해야 할 스코프:

```
openid profile email
```

`User.Read`는 Microsoft Graph API 직접 호출 시에만 필요. UserInfo endpoint는 `openid profile email`만으로 충분하다.

---

### spring-cloud-azure-starter-active-directory 배제 이유

| 항목 | 내용 |
|------|------|
| 최신 버전 | 6.0.0-beta.4 (2026-05-30 기준) — GA 미달 |
| WebFlux 지원 | 없음 — 서블릿 의존성 전제로 설계됨 |
| 커뮤니티 확인 | "servlet dependencies를 전제하므로 WebFlux에서 동작하지 않는다" |
| 결론 | 이 프로젝트에 적용 불가 |

[높음] 근거: Microsoft GitHub 이슈(azure-spring-boot#879), Medium 커뮤니티 기사.

### MSAL4J 배제 이유

- 데몬/서버간(client_credentials) 흐름 전용 시나리오에서 의미 있음
- 클라이언트 주도 소셜 로그인(프론트가 access_token 획득 후 백엔드 전달 패턴)에는 불필요
- 블로킹 API — WebFlux Reactive 환경 부적합
- 기존 Google/Kakao와 아키텍처 불일치

---

### 기존 코드 재사용 지점

| 컴포넌트 | 변경 여부 | 내용 |
|---------|----------|------|
| `AbstractOAuth2Handler` | 변경 없음 | `fetchUserInfo(String)` 추상 메서드만 구현 |
| `SocialUserInfo` record | 변경 없음 | 필드 그대로 재사용 |
| `SocialAccount` 엔티티 | 변경 없음 | `provider` 컬럼에 `"microsoft"` 문자열 삽입 가능 |
| `SocialAccountRepository` | 변경 없음 | `findByProviderAndProviderId` 재사용 |

신규 작성 파일:
- `MicrosoftOAuth2Handler.java` — `AbstractOAuth2Handler` 상속, `fetchUserInfo` 구현
- `AuthController` 라우팅 분기 추가
- Flyway 마이그레이션 불필요 — `oauth_accounts.provider`가 `VARCHAR`이므로 값만 추가

### Azure App Registration 설정 요건

| 항목 | 값 |
|------|-----|
| 플랫폼 타입 | Single Page Application (SPA) |
| Redirect URI | 프론트엔드 앱 URL |
| `tenant-id` | 조직만: 실제 테넌트 ID / 모든 계정: `common` |
| 매니페스트 | `api.requestedAccessTokenVersion: 2` (v2.0 토큰) |

---

## v1.0 RBAC — 기존 스택 (변경 없음)

### Confirmed Versions (Spring Boot 3.4.5 BOM)

| Artifact | Managed Version | Source |
|----------|-----------------|--------|
| `spring-security` | **6.4.5** | spring-boot-dependencies-3.4.5.pom [HIGH] |
| `spring-data-r2dbc` | **3.4.5** | spring-data-bom 2024.1.5 [HIGH] |
| `r2dbc-postgresql` (org.postgresql) | **1.0.7.RELEASE** | spring-boot-dependencies-3.4.5.pom [HIGH] |

모든 버전은 `io.spring.dependency-management` 플러그인이 관리한다. `build.gradle`에 버전을 명시할 필요 없다.

---

### Core Security Layer

#### 현재 상태 (변경 없음)

`SecurityConfig.java`는 이미 올바르게 구성되어 있다.

```java
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity   // ← 이미 활성화됨
public class SecurityConfig { ... }
```

`@EnableReactiveMethodSecurity`는 Spring Security 6.x에서 `useAuthorizationManager=true`가 기본값이다. 명시할 필요 없다. [HIGH — 공식 문서 확인]

**Path 기반 SecurityConfig는 건드리지 않는다.** 현재 path 매칭 규칙(`/api/v1/admin/**`, `anyExchange().authenticated()`)은 그대로 유지한다. RBAC 메뉴 권한 체크는 전부 메서드 레벨 `@PreAuthorize`로 처리한다. Defense in depth — 두 레이어가 공존하는 것이 Spring Security 공식 권장 패턴이다.

---

### Method Security: @PreAuthorize 패턴 선택

#### 결론: Custom Authorization Bean (Pattern A)

```java
@Component("menuAuthz")
public class MenuAuthorizationService {

    private final MenuPermissionRepository permissionRepository;

    public Mono<Boolean> canAccess(MethodSecurityExpressionOperations root, String menuCode) {
        return ReactiveSecurityContextHolder.getContext()
            .map(ctx -> ctx.getAuthentication())
            .flatMap(auth -> {
                // ADMIN은 즉시 허용 — DB 조회 없음
                if (auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                    return Mono.just(true);
                }
                Long userId = extractUserId(auth);
                return permissionRepository.hasPermission(userId, menuCode);
            });
    }
}
```

컨트롤러에서 사용:

```java
@PreAuthorize("@menuAuthz.canAccess(#root, 'MENU_CODE')")
public Mono<List<MenuDto>> getMyMenus(...) { ... }
```

**이 패턴을 선택한 이유:**

1. **Reactive DB 조회 가능** — 빈 메서드가 `Mono<Boolean>`을 반환할 수 있다. `@PreAuthorize` SpEL에서 직접 reactive 타입을 다룰 때의 타입 변환 문제(이하 참조)를 우회한다.
2. **ADMIN 바이패스** — 빈 내부에서 role 체크 후 DB 조회를 스킵하는 분기가 자연스럽다.
3. **독립 테스트** — 빈을 단독으로 단위 테스트할 수 있다.

#### 피해야 할 패턴

**`@PreAuthorize`에서 복합 표현식 금지:**

```java
// 절대 하지 말 것 — issue #15209, ConverterNotFoundException 발생
@PreAuthorize("hasRole('USER') && @permSvc.hasMenuAccess(#menuCode)")
```

Spring Security 6.3에서 보고된 미해결 버그: `hasRole()`(Boolean 반환)과 커스텀 `Mono<Boolean>` 빈 메서드를 `&&`/`||`로 조합하면 `ConverterNotFoundException`이 발생한다. 6.4.5 기준 공식 수정 여부 미확인. [LOW confidence — GitHub issue #15209, 닫힘 여부 미확인]

**안전한 대안:** 복합 로직 전부를 단일 빈 메서드 내부에서 처리한다.

---

### R2DBC Permission Lookup 전략

#### 단순 Join 쿼리: @Query on R2dbcRepository

단일 테이블 조회 또는 단순 join은 `@Query` 어노테이션으로 처리한다.

```java
public interface UserMenuPermissionRepository extends R2dbcRepository<UserMenuPermission, Long> {

    @Query("""
        SELECT can_read, can_write
        FROM user_menu_permissions ump
        JOIN menus m ON m.id = ump.menu_id
        WHERE ump.user_id = :userId AND m.code = :menuCode
        """)
    Mono<PermissionRow> findByUserIdAndMenuCode(
        @Param("userId") Long userId,
        @Param("menuCode") String menuCode
    );
}
```

**권장 이유:** Spring Data R2DBC 3.4.x에서 `@Query`에 named parameter(`:param`)가 완전히 지원된다. PostgreSQL의 네이티브 `$1` positional binding과 달리 가독성이 높고 순서 독립적이다. [HIGH — Context7 공식 문서 확인]

#### 복잡한 다중 테이블 Join: DatabaseClient

역할 기반 + 개인 오버라이드를 합산하는 쿼리처럼 `@Query` 단독으로 표현하기 어려운 경우:

```java
@Repository
public class MenuPermissionRepositoryImpl implements MenuPermissionRepository {

    private final DatabaseClient client;

    public Mono<Boolean> hasPermission(Long userId, String menuCode) {
        return client.sql("""
            SELECT
                COALESCE(ump.can_read, rmp.can_read, false) AS effective_read
            FROM menus m
            LEFT JOIN user_menu_permissions ump
                ON ump.menu_id = m.id AND ump.user_id = :userId
            LEFT JOIN user_roles ur
                ON ur.user_id = :userId
            LEFT JOIN role_menu_permissions rmp
                ON rmp.menu_id = m.id AND rmp.role_id = ur.role_id
            WHERE m.code = :menuCode AND m.active = true
            LIMIT 1
            """)
            .bind("userId", userId)
            .bind("menuCode", menuCode)
            .map(row -> row.get("effective_read", Boolean.class))
            .first()
            .defaultIfEmpty(false);
    }
}
```

`DatabaseClient.sql(...).bind(...).map(...).first()` — Spring Framework 6.x R2DBC 표준 API. `DatabaseClient.execute()` 구 API는 사용 금지 (1.1→1.2 마이그레이션에서 `sql()`로 교체됨). [HIGH — Spring Framework 공식 문서 확인]

**null 주의:** `map(row -> row.get("col"))` 결과가 `null`이면 Reactive Streams 위반. 반드시 `Boolean.class` 명시 또는 `Optional` 래핑.

---

### 접근 가능 메뉴 목록 API (`GET /api/menus/my`) 구현 전략

ADMIN이면 모든 메뉴를 반환하고, USER이면 권한 있는 메뉴만 필터링한다. 이 로직은 컨트롤러/서비스에서 `ReactiveSecurityContextHolder`로 현재 인증 정보를 꺼내 분기한다. `@PreAuthorize`로 접근 자체를 막는 것이 아니라, 응답 데이터를 필터링하는 구조다.

```java
// service layer
public Flux<MenuDto> getAccessibleMenus(Authentication auth) {
    if (isAdmin(auth)) {
        return menuRepository.findAllActive().map(mapper::toDto);
    }
    Long userId = extractUserId(auth);
    return menuRepository.findAccessibleByUserId(userId).map(mapper::toDto);
}
```

---

### 추가 의존성 불필요 (v1.0 RBAC 기준)

| 후보 | 판단 |
|------|------|
| Spring Authorization Server | 불필요. OAuth2 인가 서버 구축용이며 이 프로젝트는 JWT 소비자다. |
| Casbin / OPA | 불필요. 자체 permission 테이블로 충분한 복잡도다. |
| `spring-security-acl` | 불필요. ACL은 도메인 오브젝트 수준 퍼미션용이며 메뉴 접근 제어와 맞지 않는다. |
| `jjwt` (추가) | 이미 `0.12.6` 사용 중. 변경 없음. |

**v1.1 Microsoft OAuth2 추가 시에도 신규 의존성 없음.** WebClient가 이미 `spring-boot-starter-webflux`에 포함되어 있다.

---

### 패턴 결정 요약

| 결정 사항 | 선택 | 근거 |
|-----------|------|------|
| Method security 활성화 | `@EnableReactiveMethodSecurity` (이미 활성화) | 변경 없음 |
| Permission check 진입점 | Custom `@Component` bean (`@menuAuthz`) | Mono<Boolean> 반환, ADMIN 바이패스 내장 |
| 단순 join 쿼리 | `@Query` on `R2dbcRepository` | 간단한 케이스에서 보일러플레이트 최소화 |
| 복잡한 다중 join | `DatabaseClient.sql()` + `.bind()` | R2DBC 공식 권장 저수준 API |
| SecurityConfig path rules | 현행 유지 | 기존 코드 브레이킹 체인지 없음 |
| SpEL 복합 표현식 | **금지** | issue #15209 타입 변환 버그 회피 |
| Microsoft OAuth2 라이브러리 | spring-cloud-azure 및 MSAL4J 불사용 | WebFlux 미지원, 기존 WebClient 패턴으로 충분 |

---

## Sources

- Spring Security 6.4.x Reactive Method Security: https://docs.spring.io/spring-security/reference/6.5/reactive/authorization/method.html
- Spring Data R2DBC @Query / DatabaseClient: https://github.com/spring-projects/spring-data-relational
- Spring Framework R2DBC DatabaseClient: https://docs.spring.io/spring-framework/reference/data-access/r2dbc.html
- Spring Security BOM 버전 (3.4.5): https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-dependencies/3.4.5/spring-boot-dependencies-3.4.5.pom
- Spring Security issue #15209 (Mono<Boolean> + hasAuthority): https://github.com/spring-projects/spring-security/issues/15209
- Microsoft UserInfo endpoint: https://learn.microsoft.com/en-us/entra/identity-platform/userinfo
- Microsoft OIDC discovery (직접 조회): https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration
- Spring Boot Starter for Microsoft Entra 개발자 가이드: https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/spring-boot-starter-for-entra-developer-guide
- spring-cloud-azure WebFlux 미지원 이슈: https://github.com/microsoft/azure-spring-boot/issues/879
- Spring WebFlux Reactive App RBAC with Azure AD: https://naridnevahgar.medium.com/spring-webflux-reactive-app-rbac-with-azure-ad-666ad05ac3c6
