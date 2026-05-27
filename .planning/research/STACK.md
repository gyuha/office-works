# Technology Stack — Spring WebFlux RBAC

**Project:** 메뉴별 접근 권한 관리 (RBAC)
**Researched:** 2026-05-27
**Scope:** Spring Security reactive method security + R2DBC permission lookups

---

## Confirmed Versions (Spring Boot 3.4.5 BOM)

| Artifact | Managed Version | Source |
|----------|-----------------|--------|
| `spring-security` | **6.4.5** | spring-boot-dependencies-3.4.5.pom [HIGH] |
| `spring-data-r2dbc` | **3.4.5** | spring-data-bom 2024.1.5 [HIGH] |
| `r2dbc-postgresql` (org.postgresql) | **1.0.7.RELEASE** | spring-boot-dependencies-3.4.5.pom [HIGH] |

모든 버전은 `io.spring.dependency-management` 플러그인이 관리한다. `build.gradle`에 버전을 명시할 필요 없다.

---

## Core Security Layer

### 현재 상태 (변경 없음)

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

## Method Security: @PreAuthorize 패턴 선택

### 결론: Custom Authorization Bean (Pattern A)

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

### 피해야 할 패턴

**`@PreAuthorize`에서 복합 표현식 금지:**

```java
// 절대 하지 말 것 — issue #15209, ConverterNotFoundException 발생
@PreAuthorize("hasRole('USER') && @permSvc.hasMenuAccess(#menuCode)")
```

Spring Security 6.3에서 보고된 미해결 버그: `hasRole()`(Boolean 반환)과 커스텀 `Mono<Boolean>` 빈 메서드를 `&&`/`||`로 조합하면 `ConverterNotFoundException`이 발생한다. 6.4.5 기준 공식 수정 여부 미확인. [LOW confidence — GitHub issue #15209, 닫힘 여부 미확인]

**안전한 대안:** 복합 로직 전부를 단일 빈 메서드 내부에서 처리한다.

---

## R2DBC Permission Lookup 전략

### 단순 Join 쿼리: @Query on R2dbcRepository

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

### 복잡한 다중 테이블 Join: DatabaseClient

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

## 접근 가능 메뉴 목록 API (`GET /api/menus/my`) 구현 전략

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

## 추가 의존성 불필요

| 후보 | 판단 |
|------|------|
| Spring Authorization Server | 불필요. OAuth2 인가 서버 구축용이며 이 프로젝트는 JWT 소비자다. |
| Casbin / OPA | 불필요. 자체 permission 테이블로 충분한 복잡도다. |
| `spring-security-acl` | 불필요. ACL은 도메인 오브젝트 수준 퍼미션용이며 메뉴 접근 제어와 맞지 않는다. |
| `jjwt` (추가) | 이미 `0.12.6` 사용 중. 변경 없음. |

**신규 추가가 필요한 의존성은 없다.** 모든 구현은 현재 스택 내에서 가능하다.

---

## 패턴 결정 요약

| 결정 사항 | 선택 | 근거 |
|-----------|------|------|
| Method security 활성화 | `@EnableReactiveMethodSecurity` (이미 활성화) | 변경 없음 |
| Permission check 진입점 | Custom `@Component` bean (`@menuAuthz`) | Mono<Boolean> 반환, ADMIN 바이패스 내장 |
| 단순 join 쿼리 | `@Query` on `R2dbcRepository` | 간단한 케이스에서 보일러플레이트 최소화 |
| 복잡한 다중 join | `DatabaseClient.sql()` + `.bind()` | R2DBC 공식 권장 저수준 API |
| SecurityConfig path rules | 현행 유지 | 기존 코드 브레이킹 체인지 없음 |
| SpEL 복합 표현식 | **금지** | issue #15209 타입 변환 버그 회피 |

---

## Sources

- Spring Security 6.4.x Reactive Method Security: https://docs.spring.io/spring-security/reference/6.5/reactive/authorization/method.html
- Spring Data R2DBC @Query / DatabaseClient: https://github.com/spring-projects/spring-data-relational
- Spring Framework R2DBC DatabaseClient: https://docs.spring.io/spring-framework/reference/data-access/r2dbc.html
- Spring Security BOM 버전 (3.4.5): https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-dependencies/3.4.5/spring-boot-dependencies-3.4.5.pom
- Spring Security issue #15209 (Mono<Boolean> + hasAuthority): https://github.com/spring-projects/spring-security/issues/15209
