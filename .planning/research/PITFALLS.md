# RBAC 도메인 함정 (Reactive Spring Boot)

**프로젝트:** 메뉴별 접근 권한 관리 (RBAC)
**분석 대상:** Spring Boot 3.x WebFlux + R2DBC + Spring Security
**작성일:** 2026-05-27
**신뢰 수준:** HIGH (공식 문서 + 코드베이스 직접 확인)

---

## 치명적 함정 (Critical)

### 함정 1: `contextWrite` 방향 역전으로 SecurityContext 소실

**무엇이 잘못되는가:**
`JwtAuthenticationFilter`가 현재 `chain.filter(exchange).contextWrite(...)` 패턴을 사용하고 있다. 이 패턴은 **downstream**(필터 이후 구독자 방향)에는 컨텍스트가 보이지 않고, upstream(발행자 방향)에서만 보인다. WebFlux에서 `contextWrite`는 구독 시점에 Reactor Context를 주입하므로, `chain.filter(exchange)`가 반환하는 Mono를 구독할 때 올바르게 주입된다. 이 현재 패턴은 실제로 동작하지만, **서비스 레이어에서 `ReactiveSecurityContextHolder.getContext()`를 직접 호출하는 코드**를 추가할 때 함정이 발생한다.

구체적으로: `@PreAuthorize` 어노테이션은 Spring Security가 자동으로 처리하므로 안전하다. 그러나 서비스 메서드 내부에서 다음처럼 직접 컨텍스트를 꺼내는 코드를 작성할 경우:

```java
// 위험한 패턴: 새 Mono 스트림을 시작하면 컨텍스트가 없다
Mono<Permission> check = ReactiveSecurityContextHolder.getContext()
    .map(ctx -> ctx.getAuthentication())
    .flatMap(auth -> permissionRepo.findBy(auth.getPrincipal()));
```

이 Mono를 기존 요청 체인 밖에서 구독(별도 Scheduler, CompletableFuture 등)하면 컨텍스트가 사라진다.

**왜 발생하는가:**
Reactor Context는 구독 체인을 따라 전파된다. 새로운 Mono/Flux 체인을 시작하거나 `subscribeOn(Schedulers.boundedElastic())` 등으로 스레드를 전환하면 기존 Context가 끊긴다.

**결과:**
- 권한 검사 코드가 `Authentication`을 꺼내지 못해 `EmptyMono`를 반환
- `switchIfEmpty`를 잘못 작성하면 빈 응답을 "권한 없음"으로 처리하지 않고 **권한 있음으로 fallthrough**할 수 있음
- `@PreAuthorize`를 쓰지 않고 직접 구현한 권한 체크가 항상 통과하는 보안 구멍

**예방 전략:**
- 권한 검사는 `@PreAuthorize` 어노테이션으로 일원화. 직접 `ReactiveSecurityContextHolder.getContext()` 호출을 서비스 레이어에서 최소화
- 불가피하게 서비스에서 인증 정보를 꺼내야 한다면, 컨트롤러에서 `@AuthenticationPrincipal Long userId`로 주입받아 파라미터로 전달
- 새 Mono 체인을 시작해야 한다면 반드시 `.contextWrite(ReactiveSecurityContextHolder.withAuthentication(auth))` 로 컨텍스트를 이어붙임

**탐지 신호:**
- 서비스 메서드에서 `ReactiveSecurityContextHolder.getContext()`가 `empty Mono`를 반환
- 테스트에서 `SecurityMockServerConfigurers.mockUser()`를 붙이지 않으면 권한 체크가 통과

**담당 단계:** 권한 서비스 구현 단계 (PermissionService 작성 시)

---

### 함정 2: `ROLE_` 접두어 이중 적용

**무엇이 잘못되는가:**
현재 `JwtAuthenticationFilter`가 다음처럼 authority를 생성한다:

```java
new SimpleGrantedAuthority("ROLE_" + role)  // role = "ADMIN" → "ROLE_ADMIN"
```

`SecurityConfig`의 `.hasRole("ADMIN")`은 내부적으로 `"ROLE_ADMIN"`을 확인하므로 현재는 맞다. 그런데 새로 추가하는 `@PreAuthorize` 표현식이나 `authorizeExchange`에서 실수로 `hasAuthority("ROLE_ADMIN")` 대신 `hasAuthority("ADMIN")`을 쓰거나, 반대로 `hasRole("ROLE_ADMIN")`처럼 접두어를 중복(`ROLE_ROLE_ADMIN`)하면 권한 체크가 항상 실패한다.

**왜 발생하는가:**
- `hasRole("X")` → 내부적으로 `"ROLE_X"`와 비교
- `hasAuthority("X")` → `"X"` 그대로 비교
- 혼용하면 무엇이 실제로 저장된 authority인지 추적 불가

**결과:**
- ADMIN 사용자가 `ADMIN 전용 API`에 접근 불가 (false negative)
- 또는 `hasAuthority("ADMIN")`을 쓰면 ROLE_ADMIN으로 저장된 토큰과 매칭 실패 → 전체 ADMIN bypass가 동작 안 함

**예방 전략:**
- 프로젝트 내에서 **`hasRole()` 단독 사용**으로 통일. `hasAuthority()`는 사용하지 않음
- JWT claims에 저장되는 role 값은 `"ADMIN"`, `"USER"` (접두어 없음) 유지 — 현재 상태 그대로
- `@PreAuthorize` 표현식 작성 규칙을 문서화: `hasRole('ADMIN')`, `hasRole('USER')` 형식만 허용

**탐지 신호:**
- `curl -H "Authorization: Bearer <admin_token>" /api/v1/admin/...` → 403 반환
- 필터에서 authority가 `"ROLE_ADMIN"`인데 표현식에서 `"ADMIN"`을 찾고 있음

**담당 단계:** SecurityConfig 수정 단계

---

### 함정 3: ADMIN bypass를 서비스 레이어에서 직접 구현할 때 race condition

**무엇이 잘못되는가:**
ADMIN 바이패스를 다음처럼 구현할 경우:

```java
// 위험: 두 번의 DB 조회가 atomic하지 않음
return getAuthenticatedUser()
    .flatMap(user -> {
        if ("ADMIN".equals(user.getRole())) {
            return permissionRepo.findAllMenus();  // 조회 A
        }
        return permissionRepo.findPermissionsFor(user.getId());  // 조회 B
    });
```

이 자체는 race condition이 없다. 그러나 `getAuthenticatedUser()`가 **DB에서 users.role을 재조회**할 경우, JWT 토큰의 role 클레임과 DB의 현재 role이 일치하지 않는 시간차가 발생한다. 예: 관리자가 사용자 role을 ADMIN에서 USER로 변경했지만 기존 JWT가 아직 유효한 경우, 또는 반대로 USER를 ADMIN으로 승격했으나 토큰에는 USER로 남아있는 경우.

**왜 발생하는가:**
JWT 클레임의 role과 DB `users.role`이 두 가지 진실의 원천(source of truth)이 된다.

**결과:**
- role 변경 후 기존 토큰이 만료될 때까지 권한 체크 결과가 일관되지 않음
- ADMIN bypass가 "DB 재확인" 방식이면, ADMIN으로 방금 승격된 사용자가 여전히 권한 체크를 받음
- JWT 기반 bypass이면, ADMIN에서 강등된 사용자가 토큰 만료 전까지 계속 bypass

**예방 전략:**
- ADMIN 판정의 단일 source of truth를 **JWT 클레임의 role**으로 고정. DB 재조회 금지
- 이유: 이미 `JwtAuthenticationFilter`가 `Authentication` 객체에 role을 주입해두었으므로, 서비스에서 `auth.getAuthorities()`로 꺼내면 DB 조회 없이 O(1) 판정 가능
- `@PreAuthorize("hasRole('ADMIN')")`이 이 패턴의 올바른 구현 — Spring Security가 이미 주입된 authority를 확인

**탐지 신호:**
- PermissionService 내부에서 `accountRepository.findById(userId)` 를 호출해 role을 재확인하는 코드
- "role 변경 후 즉시 반영이 안 된다"는 버그 리포트

**담당 단계:** PermissionService 구현 단계

---

## 보통 함정 (Moderate)

### 함정 4: 권한 조회 N+1 — 사용자마다 별도 SELECT 발생

**무엇이 잘못되는가:**
`GET /api/menus/my` 구현 시 다음 같은 순차 쿼리 체인을 만들기 쉽다:

```java
// N+1 패턴: 역할 목록 조회 후, 각 역할별로 별도 permission 조회
userRoleRepo.findByUserId(userId)          // SELECT 1: user_roles
    .flatMap(userRole ->
        roleMenuPermRepo.findByRoleId(userRole.getRoleId())  // SELECT N: 역할 수만큼
    )
```

R2DBC는 JPA의 `@EntityGraph`나 fetch join이 없다. `flatMap`으로 각 role마다 별도 SELECT를 발행하면 역할이 많을수록 쿼리 수가 선형으로 증가한다.

**왜 발생하는가:**
Spring Data R2DBC는 관계형 lazy loading을 지원하지 않는다. 개발자가 JPA 습관대로 체인을 구성하면 자연스럽게 N+1이 된다.

**결과:**
- 사용자당 (역할 수 + 1)개의 DB 쿼리 발생
- 메뉴가 많고 역할이 많은 사용자 → 응답 지연 급증
- Connection pool 고갈 가능성

**예방 전략:**
- `DatabaseClient`로 직접 JOIN 쿼리 작성:

```sql
-- 단일 쿼리로 역할 기반 권한 전부 조회
SELECT rmp.menu_id, rmp.can_read, rmp.can_write
FROM user_roles ur
JOIN role_menu_permissions rmp ON ur.role_id = rmp.role_id
WHERE ur.user_id = :userId
```

- `user_menu_permissions` (개인 오버라이드) 역시 별도 단일 쿼리로 조회 후 애플리케이션 레이어에서 merge
- 또는 단일 쿼리로 두 테이블을 LEFT JOIN:

```sql
SELECT m.id, m.code,
       COALESCE(ump.can_read, bool_or(rmp.can_read)) AS effective_read,
       COALESCE(ump.can_write, bool_or(rmp.can_write)) AS effective_write
FROM menus m
LEFT JOIN user_roles ur ON ur.user_id = :userId
LEFT JOIN role_menu_permissions rmp ON rmp.role_id = ur.role_id AND rmp.menu_id = m.id
LEFT JOIN user_menu_permissions ump ON ump.user_id = :userId AND ump.menu_id = m.id
WHERE m.is_active = true
GROUP BY m.id, ump.can_read, ump.can_write
```

**탐지 신호:**
- 로그에서 단일 API 호출당 SELECT 쿼리가 3개 이상
- `r2dbc.queries` 메트릭이 동시 사용자 수에 비례해 급증

**담당 단계:** PermissionRepository / MenuService 구현 단계

---

### 함정 5: user_menu_permissions와 role_menu_permissions 우선순위 미정의로 인한 논리 충돌

**무엇이 잘못되는가:**
두 테이블이 동시에 존재할 때 어느 쪽이 이기는지 명확한 규칙 없이 구현하면, 동일 메뉴에 대해:
- `role_menu_permissions`: `can_read = true`
- `user_menu_permissions`: `can_read = false` (개인 블락)

일 때 애플리케이션이 `OR` 연산으로 처리하면 블락 의도가 무시된다. 반대로 `AND` 연산이면 개인 허용 오버라이드가 동작하지 않는다.

**왜 발생하는가:**
`user_menu_permissions`를 "오버라이드"라고 PROJECT.md에 명시했지만, 오버라이드의 의미(허용 오버라이드만? 블락도 가능?)를 구현 단계에서 해석에 맡기면 팀원마다 다르게 구현한다.

**결과:**
- 블락 의도의 `user_menu_permissions` 레코드가 실제로 블락을 수행하지 않음
- 또는 역할에서 허용했지만 개인 레코드가 없으면 허용이 안 됨 (개인 레코드가 반드시 있어야 동작)

**예방 전략:**
- 구현 전 우선순위 규칙을 문서화하고 SQL로 표현:
  - **권고**: `user_menu_permissions`가 존재하면 그것이 절대적 진실 (COALESCE 방식). 없으면 역할 기반 결과 사용
  - NULL은 "오버라이드 없음" 의미. `false`는 "명시적 차단" 의미
- 이 규칙을 DB 쿼리에서 `COALESCE(ump.can_read, role_based_result)`로 표현

**탐지 신호:**
- "역할에서 권한을 줬는데 특정 사용자만 접근이 안 된다" 또는 그 반대 버그 리포트
- 권한 체크 로직에 `if (userPerm != null) ... else if (rolePerm != null)` 분기가 중첩

**담당 단계:** PermissionService 구현 + V3 마이그레이션 설계 단계

---

### 함정 6: Flyway V3 파일명 충돌 또는 V1/V2 체크섬 오염

**무엇이 잘못되는가:**
두 가지 독립적인 위험이 있다.

**위험 A — V3 파일명 중복:**
로컬 개발 중 팀원 두 명이 동시에 `V3__rbac_schema.sql`과 `V3__menu_schema.sql`을 만들면, 먼저 머지된 것만 적용되고 나머지는 체크섬 불일치로 `FlywayException`을 던진다.

**위험 B — V1/V2 실수 수정:**
"주석만 바꿨으니 괜찮겠지"라는 생각으로 V1이나 V2 파일을 편집하면, Flyway가 체크섬 불일치를 감지해 애플리케이션 시작 자체가 실패한다. CI/CD 파이프라인 전체가 멈춘다.

**왜 발생하는가:**
- 로컬 개발 환경에서 DB를 자주 초기화하면 Flyway 체크섬 검증을 경험하지 못함
- 기존 마이그레이션 파일이 "불변"이라는 인식 부재

**결과:**
- 프로덕션 배포 시 애플리케이션 기동 실패
- `flyway repair`를 실행하지 않으면 복구 불가

**예방 전략:**
- V3 파일명은 `V3__rbac_schema.sql` 단일 파일로 RBAC 관련 DDL 전체를 담음 (분리 금지)
- V1, V2 파일은 읽기 전용 취급. Git pre-commit hook으로 변경 시 경고
- 로컬 환경에서도 `spring.flyway.clean-disabled=true` (기본값) 유지

**탐지 신호:**
- 앱 기동 시 `FlywayException: Validate failed: Migration checksum mismatch`
- `git log --oneline -- api/src/main/resources/db/migration/V1__init.sql`에 최근 커밋 존재

**담당 단계:** V3 마이그레이션 작성 단계

---

### 함정 7: `@PreAuthorize` 내부 메서드 호출 시 프록시 우회

**무엇이 잘못되는가:**
같은 클래스 내의 메서드에서 `@PreAuthorize`가 붙은 다른 메서드를 직접 호출하면 Spring AOP 프록시가 우회되어 어노테이션이 완전히 무시된다.

```java
// MenuService.java
public Mono<List<MenuDto>> getAllMenus() {
    return getMyMenus();  // @PreAuthorize가 적용되지 않음!
}

@PreAuthorize("hasRole('ADMIN')")
public Mono<List<MenuDto>> getMyMenus() { ... }
```

**왜 발생하는가:**
Spring Security의 메서드 보안은 Spring AOP 기반이다. 내부 호출은 프록시를 거치지 않고 실제 객체에 직접 접근한다.

**결과:**
- ADMIN 전용 메서드가 누구에게나 호출 가능
- 테스트에서는 컨트롤러를 통해 호출하므로 통과 → 실제 서비스에서 우회 경로 존재

**예방 전략:**
- `@PreAuthorize`는 반드시 **컨트롤러에서 직접 호출되는 서비스 메서드** 또는 **컨트롤러 메서드 자체**에 적용
- 같은 서비스 내 메서드 체인 간에는 `@PreAuthorize` 의존 금지. 권한 체크를 상위 레이어(컨트롤러)에서 수행

**탐지 신호:**
- 권한이 없는 사용자가 내부 메서드 경유로 ADMIN 기능에 접근 성공
- 코드에서 `this.adminMethod()` 형태의 자기 참조 호출에 `@PreAuthorize`가 붙어 있음

**담당 단계:** 컨트롤러 + 서비스 구현 단계

---

## 경미한 함정 (Minor)

### 함정 8: `menus.is_active` 필터를 권한 조회 쿼리에서 누락

**무엇이 잘못되는가:**
비활성화된 메뉴(`is_active = false`)가 권한 조회 결과에 포함되어 프론트엔드에 노출된다.

**예방 전략:**
모든 메뉴 목록 쿼리에 `WHERE m.is_active = true` 조건을 기본으로 포함. ADMIN 전용 전체 목록 API에서만 필터를 해제.

**담당 단계:** MenuRepository 쿼리 작성 단계

---

### 함정 9: R2DBC 도메인 모델에서 `@Table`/`@Column` 명시 누락으로 인한 컬럼 매핑 실패

**무엇이 잘못되는가:**
기존 `Account.java`처럼 수동 getter/setter를 사용하는 스타일에서 `role_menu_permissions`처럼 스네이크케이스 컬럼을 camelCase 필드로 매핑할 때, R2DBC가 자동 변환을 수행하지 못해 `null`이 반환된다.

현재 프로젝트의 `R2dbcConfig` 설정에 naming convention이 명시되어 있는지 확인 필요.

**예방 전략:**
- `R2dbcConfig`에서 `NamingStrategy`를 `DefaultNamingStrategy`로 명시하거나
- 엔티티 필드에 `@Column("can_read")` 처럼 명시적으로 표기
- 새 도메인 모델 작성 시 기존 `Account.java` 스타일을 동일하게 따름

**탐지 신호:**
- 권한 객체가 `canRead = null`, `canWrite = null`로 역직렬화됨
- 단위 테스트는 통과하지만 통합 테스트에서 실패

**담당 단계:** 도메인 모델 (Menu, Role, RoleMenuPermission, UserMenuPermission) 구현 단계

---

## 단계별 경고 요약

| 단계 주제 | 가장 위험한 함정 | 완화 방법 |
|-----------|-----------------|-----------|
| V3 마이그레이션 작성 | V1/V2 체크섬 오염, V3 파일명 충돌 | 단일 파일, V1/V2 절대 수정 금지 |
| 도메인 모델 구현 | R2DBC 컬럼 매핑 누락 | `@Column` 명시 또는 NamingStrategy 검증 |
| PermissionService 구현 | SecurityContext 소실, ADMIN bypass DB 재조회 | `@PreAuthorize` 일원화, JWT authority 신뢰 |
| 권한 쿼리 (PermissionRepository) | N+1 쿼리, 우선순위 충돌 | JOIN 단일 쿼리, COALESCE 우선순위 규칙 |
| SecurityConfig 수정 | `ROLE_` 접두어 이중 적용 | `hasRole()` 통일, `hasAuthority()` 미사용 |
| 컨트롤러/서비스 구현 | `@PreAuthorize` 내부 호출 우회 | 컨트롤러 레벨 어노테이션 적용 |

---

## 출처

- Spring Security 6.5 공식 문서 — [Reactive Method Security](https://docs.spring.io/spring-security/reference/6.5/reactive/authorization/method.html) [HIGH]
- Spring Security GitHub — [Issue #8124: ReactiveSecurityContextHolder resolves to empty](https://github.com/spring-projects/spring-security/issues/8124) [HIGH]
- Spring Security GitHub — [Issue #5034: CompletableFuture empties ReactiveSecurityContextHolder](https://github.com/spring-projects/spring-security/issues/5034) [HIGH]
- Spring Blog — [Context Propagation with Project Reactor 3](https://spring.io/blog/2023/03/30/context-propagation-with-project-reactor-3-unified-bridging-between-reactive/) [HIGH]
- Neil White — [Joins with Spring Data R2DBC](https://neilwhite.ca/joins-with-spring-data-r2dbc/) [MEDIUM]
- 코드베이스 직접 분석: `JwtAuthenticationFilter.java`, `SecurityConfig.java`, `Account.java`, `V1__init.sql` [HIGH]
