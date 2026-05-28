# Phase 2: 권한 서비스 + 핵심 API - Research

**Researched:** 2026-05-28
**Domain:** Spring WebFlux + Spring Security Reactive + R2DBC 권한 병합
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**권한 병합 규칙**
- D-01: `user_menu_permissions` 행이 존재하면 역할 권한을 덮어씀 (양방향 오버라이드). canRead=false 오버라이드 가능.
- D-02: `user_menu_permissions` 행이 없는 메뉴는 역할 권한 그대로 적용.
- D-03: 역할 권한도 오버라이드도 없는 메뉴는 응답에서 제외. canRead=false인 메뉴 포함하지 않음.
- D-04: 여러 역할의 권한은 OR 집계(additive). 가장 관대한 권한 적용.

**응답 DTO**
- D-05: `is_active=false` 메뉴는 응답에서 제외 (ADMIN도 동일).
- D-06: `display_order` 오름차순 정렬.
- D-07: 응답 DTO 필드 5개만 — `menuId, code, name, canRead, canWrite`.
- D-08: ADMIN은 DB 권한 테이블 조회 없이 `is_active=true` 전체 메뉴를 canRead=true, canWrite=true로 반환.

**빈 roleIds 처리**
- D-09: 역할 미할당 시 서비스 레이어 명시적 분기 — `findByRoleIdIn()` 호출 스킵.
- D-10: `UserMenuPermissionRepository.findByUserId()`는 역할 유무 무관 항상 실행.
- D-11: roleIds 분기 후 역할 권한 조회와 개인 오버라이드 조회는 `Mono.zip()` 병렬 실행.
- D-12: `findAllById(menuIds)` 사용. `findAll()` 후 필터링 방식 금지.

**MenuAuthorizationBean 설계**
- D-13: Phase 2에서는 Bean 구현만. `@PreAuthorize` 적용은 Phase 3.
- D-14: `canRead(Authentication, String menuCode)` + `canWrite(Authentication, String menuCode)` 2개 메서드.
- D-15: `global/security/` 패키지 위치.
- D-16: `MenuPermissionService`의 단건 조회 메서드 `canRead(Long userId, String menuCode)` / `canWrite(Long userId, String menuCode)` 호출.

**Phase 1 carry-forward**
- D-17: ADMIN bypass는 JWT `authorities` 클레임으로만 (`ROLE_ADMIN` 확인). DB 재조회 금지.
- D-18: `@PreAuthorize` SpEL 복합 표현식 금지.
- D-19: 서비스 패키지 `com.example.bootstrap.menu.application.service.MenuPermissionService`.

### Claude's Discretion
- `MenuPermissionService` 내부 병합 알고리즘 구현 세부 사항 (Map<Long, MenuPermission> 구조 등)
- 응답 DTO Java record 이름 — `MyMenuResponse` 등 기존 명명 패턴에 맞게 선택
- 에러 코드 (`MENU_001` 등) 값
- `MenuController` URL path — `/api/menus/my` (ROADMAP.md 명시)

### Deferred Ideas (OUT OF SCOPE)
- 없음 — 논의가 Phase 2 스코프 내에서만 진행됨.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOM-06 | `MenuPermissionService` — ADMIN 바이패스 + 역할 권한 집계(additive) + 사용자 오버라이드(COALESCE) 병합 로직 (`Mono.zip()` 병렬 쿼리) | 기존 AuthService의 flatMap 체인 패턴 + Reactor `Mono.zip()` API 확인 |
| DOM-07 | `MenuAuthorizationBean` — `@PreAuthorize` SpEL에서 호출할 수 있는 `Mono<Boolean>` 반환 빈 | `@EnableReactiveMethodSecurity` 활성화 확인, `global/security/` 패키지 패턴 |
| API-01 | `GET /api/menus/my` — 인증된 사용자가 접근 가능한 메뉴 목록 반환 (menuId, code, name, canRead, canWrite) | AccountController의 `Authentication` 주입 패턴, `ApiResponse<T>` envelope |
| SEC-01 | ADMIN 역할 사용자는 DB 권한 테이블 조회 없이 모든 메뉴를 canRead=true, canWrite=true로 반환 | JwtAuthenticationFilter의 `ROLE_ADMIN` authority 주입 방식 확인 |
</phase_requirements>

---

## Summary

Phase 2는 Phase 1에서 구축한 5개 테이블/엔티티/리포지토리 위에 권한 병합 서비스(`MenuPermissionService`), 인증 Bean(`MenuAuthorizationBean`), 컨트롤러(`MenuController`)를 추가한다. 신규 코드는 3개 파일(서비스, Bean, 컨트롤러)과 2개 DTO record, `ErrorCode` enum 확장으로 구성된다.

기존 코드베이스에서 직접 재사용 가능한 패턴이 전부 존재한다. `AuthService`의 flatMap/switchIfEmpty 패턴, `AccountController`의 `Authentication` 주입 + `ApiResponse<T>` 래핑 패턴, `JwtAuthenticationFilter`의 `ROLE_ADMIN` 권한 확인 방식이 그것이다. `Mono.zip()`은 프로젝트 내 선례가 없으나 Reactor 표준 API이므로 패턴 레퍼런스만으로 구현 가능하다.

**Primary recommendation:** 기존 `AuthService` 패턴을 서비스 구조의 기준으로 삼고, `AccountController`를 컨트롤러 구조의 기준으로 삼는다. `Mono.zip()`은 Tuple2 조합자로 역할 권한 조회 + 개인 오버라이드 조회를 병렬 실행한다.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ADMIN 판정 | API / Backend (SecurityContext) | — | JWT claims는 요청 컨텍스트에 존재. DB 재조회 금지(D-17). |
| 역할 권한 OR 집계 | API / Backend (Service) | — | 순수 비즈니스 로직 — DB 조회 결과를 인메모리에서 집계 |
| 개인 오버라이드 병합 | API / Backend (Service) | — | 동일 서비스 레이어. 역할 권한 Map 위에 덮어씀 |
| 메뉴 is_active 필터링 | API / Backend (Service) | — | `findAllById()` 결과에서 서비스가 필터링 |
| display_order 정렬 | API / Backend (Service) | — | Comparator로 서비스에서 처리. DB ORDER BY 대신 인메모리 |
| `@PreAuthorize` 진입점 | API / Backend (Bean) | — | `MenuAuthorizationBean`이 SecurityContext에서 userId 추출 |
| HTTP 401 반환 | Frontend Server / Security Filter | — | `SecurityConfig.anyExchange().authenticated()` + `HttpStatusServerEntryPoint` 이미 존재 |

---

## Standard Stack

### Core (신규 추가 없음 — Phase 1 의존성이 전부)

Phase 2는 새 외부 의존성 없음. 기존 스택만 사용한다.

| 라이브러리 | 이미 존재 | 용도 |
|-----------|-----------|------|
| spring-boot-starter-webflux | Yes | `@RestController`, `Mono<ResponseEntity<T>>` |
| spring-boot-starter-security | Yes | `@EnableReactiveMethodSecurity`, `Authentication` |
| spring-boot-starter-data-r2dbc | Yes | `ReactiveCrudRepository`, `Flux`, `Mono` |
| io.projectreactor:reactor-core | Yes (transitive) | `Mono.zip()`, `flatMap`, `collectList()` |

**Phase 2에서 install할 외부 패키지: 없음.**

---

## Package Legitimacy Audit

> 신규 외부 패키지 없음. 이 섹션은 해당 없음.

---

## Architecture Patterns

### System Architecture Diagram

인증된 HTTP 요청이 `GET /api/menus/my`에 도달하면 다음 경로를 따른다.

```
HTTP 요청 (Bearer JWT)
  → JwtAuthenticationFilter (userId + ROLE 추출 → SecurityContext)
  → SecurityConfig (anyExchange().authenticated() — 미인증 시 401)
  → MenuController.getMyMenus(Authentication)
      → userId = (Long) authentication.getPrincipal()
      → ADMIN 판정: authorities에 ROLE_ADMIN 포함 여부
          ↓ ADMIN
          MenuRepository.findAllActiveOrderByDisplayOrder()
          → 전체 메뉴 canRead=true, canWrite=true 매핑
          ↓ USER
          UserRoleRepository.findByUserId(userId) → roleIds 수집
              ↓ roleIds 비어 있으면
              rolePermissionMap = 빈 Map
              ↓ roleIds 있으면
              Mono.zip(
                findByRoleIdIn(roleIds).collectList(),  // 역할 권한
                findByUserId(userId).collectList()       // 개인 오버라이드
              )
              → OR 집계 → 오버라이드 병합 → 접근 가능 menuId 추출
          → MenuRepository.findAllById(menuIds)
          → is_active=true 필터 + display_order 정렬
  → ApiResponse.success("접근 가능한 메뉴 목록을 조회했습니다.", List<MyMenuResponse>)
  → ResponseEntity.ok(...)
```

### Recommended Project Structure

```
menu/
├── controller/
│   └── MenuController.java           # GET /api/menus/my
├── application/
│   ├── dto/
│   │   └── MyMenuResponse.java       # record: menuId, code, name, canRead, canWrite
│   └── service/
│       └── MenuPermissionService.java # 병합 서비스 (getMyMenus + canRead + canWrite)
└── domain/
    └── (기존 Phase 1 엔티티/리포지토리 — 변경 없음)

global/
└── security/
    ├── jwt/
    │   ├── JwtAuthenticationFilter.java  (기존 — 변경 없음)
    │   └── ...
    └── MenuAuthorizationBean.java         # 신규 — canRead/canWrite(Authentication, menuCode)

global/
└── exception/
    └── ErrorCode.java                # MENU_001 추가
```

### Pattern 1: Mono.zip() 병렬 조회

Phase 1 결과물 기준 구체적 코드 패턴. Reactor `Mono.zip()`은 두 `Mono`를 동시에 구독하고 둘 다 완료되면 `Tuple2`로 결합한다.

```java
// Source: [CITED: projectreactor.io/docs/core/release/api/] + [ASSUMED] 코드 구조
// roleIds가 비어 있지 않은 경우의 병렬 조회
Mono<List<RoleMenuPermission>> rolePerms = 
    roleMenuPermissionRepository.findByRoleIdIn(roleIds).collectList();
Mono<List<UserMenuPermission>> userPerms = 
    userMenuPermissionRepository.findByUserId(userId).collectList();

return Mono.zip(rolePerms, userPerms)
    .map(tuple -> mergePermissions(tuple.getT1(), tuple.getT2()));
```

**주의:** `Mono.zip()`의 인자가 모두 완료되어야 결합이 발생한다. 한쪽이 `Mono.empty()`이면 전체가 비어 버린다. 빈 리스트를 반환해야 하므로 반드시 `Mono.just(emptyList)`를 사용해야 한다.

```java
// D-09: roleIds가 비어 있는 경우 — findByRoleIdIn 호출 자체를 스킵
Mono<List<RoleMenuPermission>> rolePerms = roleIds.isEmpty()
    ? Mono.just(Collections.emptyList())
    : roleMenuPermissionRepository.findByRoleIdIn(roleIds).collectList();
```

### Pattern 2: userId / ROLE_ADMIN 추출 (기존 코드 기반)

`JwtAuthenticationFilter`가 이미 `principal = Long userId`, `authorities = [ROLE_USER] or [ROLE_ADMIN]`으로 설정한다.

```java
// Source: [VERIFIED: api/src/main/java/.../AccountController.java 57~58행]
Long userId = (Long) authentication.getPrincipal();

// Source: [VERIFIED: api/src/main/java/.../JwtAuthenticationFilter.java 63~65행]
// 필터가 "ROLE_" + role 문자열로 authority 등록 — claims.get("role") 값이 "ADMIN"이면 "ROLE_ADMIN"
boolean isAdmin = authentication.getAuthorities().stream()
    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
```

### Pattern 3: MenuAuthorizationBean — Mono<Boolean> 반환

`@EnableReactiveMethodSecurity`가 활성화된 상태에서 SpEL `@PreAuthorize("@menuAuthorizationBean.canRead(authentication, #menuCode)")`를 지원하려면 Bean 메서드가 `Mono<Boolean>`을 반환해야 한다. [ASSUMED] Spring Security Reactive 메서드 보안이 `Mono<Boolean>` 반환을 직접 지원한다는 사실은 공식 문서 기반이나 현재 세션에서 Context7으로 재확인하지 않았다.

```java
// Source: [ASSUMED] Spring Security Reactive docs 기반 구조
@Component("menuAuthorizationBean")
public class MenuAuthorizationBean {

    private final MenuPermissionService menuPermissionService;

    public MenuAuthorizationBean(final MenuPermissionService menuPermissionService) {
        this.menuPermissionService = menuPermissionService;
    }

    public Mono<Boolean> canRead(final Authentication authentication, final String menuCode) {
        Long userId = (Long) authentication.getPrincipal();
        return menuPermissionService.canRead(userId, menuCode);
    }

    public Mono<Boolean> canWrite(final Authentication authentication, final String menuCode) {
        Long userId = (Long) authentication.getPrincipal();
        return menuPermissionService.canWrite(userId, menuCode);
    }
}
```

**Phase 2에서는 `@PreAuthorize` 어노테이션을 실제로 어디에도 적용하지 않는다** — Bean만 구현한다. `@PreAuthorize` 적용은 Phase 3 스코프.

### Pattern 4: MenuController 구조

```java
// Source: [VERIFIED: api/src/main/java/.../AccountController.java 전체]
@RestController
@RequestMapping("/api/menus")
public class MenuController {

    private final MenuPermissionService menuPermissionService;

    public MenuController(final MenuPermissionService menuPermissionService) {
        this.menuPermissionService = menuPermissionService;
    }

    @GetMapping("/my")
    public Mono<ResponseEntity<ApiResponse<List<MyMenuResponse>>>> getMyMenus(
            final Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean isAdmin = authentication.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return menuPermissionService.getMyMenus(userId, isAdmin)
            .map(menus -> ResponseEntity.ok(
                ApiResponse.success("접근 가능한 메뉴 목록을 조회했습니다.", menus)));
    }
}
```

**`GET /api/menus/my`는 이미 `SecurityConfig.anyExchange().authenticated()` 규칙 적용을 받는다** — 별도 SecurityConfig 수정 불필요. 미인증 요청은 자동으로 401을 받는다 (Success Criteria 5번 무료 달성).

### Pattern 5: findAllById() — ReactiveCrudRepository 기본 제공

```java
// Source: [VERIFIED: Spring Data Reactive 공식 API — ReactiveCrudRepository 인터페이스]
// MenuRepository extends ReactiveCrudRepository<Menu, Long>
// findAllById(Iterable<Long>) 메서드는 별도 선언 없이 사용 가능
// 반환 타입: Flux<Menu>
menuRepository.findAllById(menuIds)  // menuIds: List<Long>
    .filter(menu -> Boolean.TRUE.equals(menu.isActive()))
    .sort(Comparator.comparingInt(Menu::getDisplayOrder))
    .map(menu -> new MyMenuResponse(menu.getId(), menu.getCode(), menu.getName(), true, true))
    .collectList()
```

**주의:** `findAllById()`는 `Flux<Menu>`를 반환한다. `Mono.zip()`과 결합하려면 `.collectList()`로 `Mono<List<Menu>>`로 변환한다.

### Pattern 6: 권한 병합 알고리즘 스케치

```java
// Source: [ASSUMED] 결정 D-01~D-04 기반 구현 패턴
private Map<Long, boolean[]> buildRolePermissionMap(List<RoleMenuPermission> rolePerms) {
    // OR 집계: {menuId → [canRead, canWrite]}
    Map<Long, boolean[]> map = new HashMap<>();
    for (RoleMenuPermission p : rolePerms) {
        map.merge(p.getMenuId(),
            new boolean[]{Boolean.TRUE.equals(p.getCanRead()), Boolean.TRUE.equals(p.getCanWrite())},
            (existing, incoming) -> new boolean[]{
                existing[0] || incoming[0],
                existing[1] || incoming[1]
            });
    }
    return map;
}

private Map<Long, boolean[]> applyUserOverrides(
        Map<Long, boolean[]> roleMap, List<UserMenuPermission> userPerms) {
    // 양방향 오버라이드: userPerm 행이 있으면 덮어씀
    for (UserMenuPermission p : userPerms) {
        roleMap.put(p.getMenuId(),
            new boolean[]{Boolean.TRUE.equals(p.getCanRead()), Boolean.TRUE.equals(p.getCanWrite())});
    }
    return roleMap;
}
```

### Anti-Patterns to Avoid

- **`findAll()` 후 필터링:** `MenuRepository.findAll()` 전체를 가져온 뒤 권한 있는 것만 필터링하는 방식 금지 (D-12). `findAllById(menuIds)`로 필요한 것만 가져온다.
- **`isCanRead()` / `isCanWrite()` getter:** Boolean 필드에 `is` 접두사 getter 사용 금지. Jackson이 `isCanRead` 키로 직렬화하여 응답 필드명이 오염된다. `getCanRead()` 패턴을 사용한다 (Phase 1 Lesson P1).
- **`findByRoleIdIn(emptyList)` 직접 호출:** R2DBC의 `IN (빈 리스트)` 동작이 구현마다 다를 수 있다. 반드시 서비스에서 명시적 분기로 빈 리스트 케이스를 처리한다 (D-09).
- **`Mono.zip()` 인자에 `Mono.empty()` 사용:** `Mono.zip()`은 인자 중 하나라도 empty이면 전체가 empty가 된다. 빈 결과는 반드시 `Mono.just(Collections.emptyList())`로 감싼다.
- **DB SecurityContext 재조회:** ADMIN 판정을 위해 DB에서 `users.role`을 재조회하는 패턴 금지 (D-17). JWT `authorities`에서만 판단한다.

---

## Don't Hand-Roll

| 문제 | 직접 만들지 말 것 | 사용할 것 | 이유 |
|-----|----------------|-----------|------|
| IN 절 다건 조회 | SQL 직접 작성 | `findByRoleIdIn(Collection<Long>)` (Phase 1 구현됨) | Spring Data 파생 쿼리 자동 처리 |
| ID 목록 엔티티 조회 | 반복 단건 조회 | `ReactiveCrudRepository.findAllById()` | 배치 조회 — 단건 반복보다 효율적 |
| SecurityContext에서 userId 추출 | 토큰 직접 파싱 | `(Long) authentication.getPrincipal()` | JwtAuthenticationFilter가 이미 세팅 |
| 401 응답 | 직접 코드 작성 | `SecurityConfig.anyExchange().authenticated()` + `HttpStatusServerEntryPoint` (이미 존재) | 인프라 레이어에서 자동 처리 |

---

## Runtime State Inventory

> Phase 2는 신규 서비스/컨트롤러 추가 페이즈이며 DB 마이그레이션 없음. 런타임 상태 인벤토리 불필요.

없음 — Phase 2는 Flyway 마이그레이션을 추가하지 않는다. 기존 V3 마이그레이션이 이미 모든 테이블을 생성했다.

---

## Common Pitfalls

### Pitfall 1: Boolean 필드 getter 명명 오류
**What goes wrong:** `Boolean canRead` 필드에 `isCanRead()` getter를 생성하면 Jackson이 JSON 키를 `isCanRead`로 직렬화 — 응답 DTO의 `canRead` 필드명과 불일치.
**Why it happens:** Java Bean 규약에서 `boolean` primitive는 `is` 접두사가 표준이지만, `Boolean` 박싱 타입에도 동일하게 적용하면 Jackson이 `is` 접두사를 키로 포함한다.
**How to avoid:** Boolean 필드 getter는 반드시 `getCanRead()`, `getCanWrite()` 형식 사용. Phase 1 Lesson에서 이미 발견된 패턴.
**Warning signs:** 응답 JSON에 `canRead` 대신 `isCanRead` 키가 나타남.

### Pitfall 2: Mono.zip() + Mono.empty() 조합
**What goes wrong:** `roleIds`가 비어 있어서 `findByRoleIdIn(emptyList).collectList()`가 `Mono.empty()`를 반환하면 `Mono.zip()`이 전체 empty를 반환하여 역할 없는 사용자에게 500 대신 결과 없음 처리가 발생.
**Why it happens:** Reactor `Mono.zip()`은 인자 중 하나가 empty이면 조합 불가로 전체를 empty로 처리한다.
**How to avoid:** D-09 — roleIds가 비어 있으면 `Mono.just(Collections.emptyList())`를 zip 인자로 사용하거나, `findByRoleIdIn` 호출 자체를 건너뜀.
**Warning signs:** 역할 없는 사용자 호출 시 빈 배열 대신 응답이 아예 없거나 타임아웃.

### Pitfall 3: FlywayMigrationIT count assertion
**What goes wrong:** Phase 2에서 Flyway 마이그레이션을 추가하지 않더라도, `FlywayMigrationIT.flyway_ShouldHaveExactlyThreeMigrations()`가 이미 `hasSize(3)` 단언이다. Phase 2 이후 Phase 3에서 V4 마이그레이션을 추가하면 이 테스트가 실패한다.
**Why it happens:** Phase 1 Lesson에서 확인된 패턴 — 마이그레이션 추가 시 count assertion을 수동으로 업데이트해야 한다.
**How to avoid:** Phase 2에서 마이그레이션 없으므로 FlywayMigrationIT 수정 없음. 플래너는 Phase 2 태스크에 이 항목을 포함하지 않는다.
**Warning signs:** 없음 (Phase 2 해당 없음).

### Pitfall 4: MenuRepository에 findByIsActiveTrue() 미선언
**What goes wrong:** ADMIN 경로에서 `is_active=true` 전체 메뉴를 조회할 때 `findAll()` 후 Java 필터로 처리하면 비효율. 그러나 `findByIsActiveTrue()`는 현재 `MenuRepository`에 선언되어 있지 않다.
**Why it happens:** Phase 1에서 ADMIN 경로를 고려하지 않고 `findByCode()`만 선언했다.
**How to avoid:** Phase 2에서 `MenuRepository`에 `findByIsActiveTrueOrderByDisplayOrder()` 또는 `findByIsActiveTrue()` 메서드를 추가한다. 아니면 `findAll()` + Java 스트림 필터 + 정렬로 처리 (is_active=true인 메뉴 7개 수준에서는 실용적으로 무방).
**Warning signs:** ADMIN 응답에 비활성 메뉴가 포함됨 (D-08 위반).

### Pitfall 5: getAuthority() vs getRole() 혼용
**What goes wrong:** `ROLE_ADMIN`을 확인할 때 `authentication.getAuthorities()`가 아니라 `authentication.getPrincipal()`의 다른 속성을 사용하려 시도하는 경우.
**Why it happens:** JwtAuthenticationFilter가 `"ROLE_" + role`로 authority를 설정한다 (line 65). `claims.get("role")`은 `"ADMIN"` (prefix 없음)이지만, `getAuthority()`는 `"ROLE_ADMIN"`을 반환한다.
**How to avoid:** 항상 `authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))` 패턴 사용.
**Warning signs:** ADMIN 사용자에게도 일반 USER 경로가 실행됨.

---

## Code Examples

### getUserIdAndAdminFlag (컨트롤러 패턴)
```java
// Source: [VERIFIED: api/.../AccountController.java 57행]
Long userId = (Long) authentication.getPrincipal();
boolean isAdmin = authentication.getAuthorities().stream()
    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
```

### ADMIN 경로 — 전체 활성 메뉴 반환
```java
// Source: [ASSUMED] D-08 구현 패턴
// MenuRepository에 findByIsActiveTrueOrderByDisplayOrderAsc() 추가 필요
menuRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
    .map(menu -> new MyMenuResponse(
        menu.getId(), menu.getCode(), menu.getName(), true, true))
    .collectList();
```

### USER 경로 전체 플로우
```java
// Source: [ASSUMED] D-09~D-12 기반 구현 패턴
public Mono<List<MyMenuResponse>> getMyMenus(Long userId, boolean isAdmin) {
    if (isAdmin) {
        return menuRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
            .map(m -> new MyMenuResponse(m.getId(), m.getCode(), m.getName(), true, true))
            .collectList();
    }

    return userRoleRepository.findByUserId(userId)
        .map(UserRole::getRoleId)
        .collectList()
        .flatMap(roleIds -> {
            Mono<List<RoleMenuPermission>> rolePermsMono = roleIds.isEmpty()
                ? Mono.just(Collections.emptyList())
                : roleMenuPermissionRepository.findByRoleIdIn(roleIds).collectList();

            Mono<List<UserMenuPermission>> userPermsMono =
                userMenuPermissionRepository.findByUserId(userId).collectList();

            return Mono.zip(rolePermsMono, userPermsMono);
        })
        .flatMap(tuple -> {
            Map<Long, boolean[]> permMap = buildRolePermissionMap(tuple.getT1());
            permMap = applyUserOverrides(permMap, tuple.getT2());

            List<Long> accessibleMenuIds = permMap.entrySet().stream()
                .filter(e -> e.getValue()[0] || e.getValue()[1])
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

            if (accessibleMenuIds.isEmpty()) {
                return Mono.just(Collections.<MyMenuResponse>emptyList());
            }

            return menuRepository.findAllById(accessibleMenuIds)
                .filter(menu -> Boolean.TRUE.equals(menu.isActive()))
                .sort(Comparator.comparingInt(Menu::getDisplayOrder))
                .map(menu -> new MyMenuResponse(
                    menu.getId(), menu.getCode(), menu.getName(),
                    permMap.get(menu.getId())[0],
                    permMap.get(menu.getId())[1]))
                .collectList();
        });
}
```

### canRead/canWrite 단건 조회 (MenuAuthorizationBean용)
```java
// Source: [ASSUMED] D-16 기반 패턴
public Mono<Boolean> canRead(Long userId, String menuCode) {
    return menuRepository.findByCode(menuCode)
        .flatMap(menu -> getMyMenus(userId, false)
            .map(menus -> menus.stream()
                .filter(m -> m.menuId().equals(menu.getId()))
                .findFirst()
                .map(MyMenuResponse::canRead)
                .orElse(false)))
        .defaultIfEmpty(false);
}
```

**Note:** 단건 조회는 전체 목록을 가져온 후 필터링하는 방식이다. Phase 2 스코프에서는 성능 이슈가 없으나, v2 Redis 캐싱 추가 시 자연스럽게 최적화된다.

---

## State of the Art

| 이전 방식 | 현재 방식 | 변경 시점 | 영향 |
|----------|----------|---------|------|
| R2DBC 복합 PK (`@PrimaryKeyClass`) | 서로게이트 BIGSERIAL PK (Phase 1 D-03) | Phase 1 결정 | UserRole 등 연결 엔티티가 단순해짐 |
| Boolean 필드 `isXxx()` getter | `getXxx()` getter (Phase 1 Lesson) | Phase 1 수정 | Jackson 직렬화 키 오염 방지 |

**Deprecated/outdated:**
- `findAll()` 후 필터링: Phase 2에서 명시적으로 금지 (D-12). `findAllById()`가 표준.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `MenuAuthorizationBean`에서 `Mono<Boolean>` 반환이 `@EnableReactiveMethodSecurity`와 함께 작동 | Architecture Patterns Pattern 3 | Phase 3에서 `@PreAuthorize` 적용 불가. 그러나 Phase 2에서는 Bean만 구현하므로 즉시 영향 없음 |
| A2 | `Mono.zip()`에서 Tuple2로 `getT1()/getT2()` 접근 방식 | Code Examples | Reactor API 변경 시 컴파일 에러. 트레이닝 데이터 기반이나 Reactor는 매우 안정적 |
| A3 | `findByIsActiveTrueOrderByDisplayOrderAsc()` Spring Data 파생 쿼리 이름이 올바름 | Architecture Patterns Pattern 4 | 컴파일 타임에 Spring Data가 해석 실패하면 `UnsatisfiedDependencyException`. 대안: `findAll()` + Java 필터 |
| A4 | `ReactiveCrudRepository.findAllById(List<Long>)`가 Flux<Menu>를 반환하고 IN 쿼리로 동작 | Code Examples | 단건 반복 조회 또는 예상치 못한 동작. 실제로는 Spring Data 표준이므로 위험 낮음 |

**이 Assumptions Log의 A1을 제외한 나머지는 모두 Spring Data / Reactor 표준 API 기반이며 위험 수준은 낮음.**

---

## Open Questions

1. **MenuRepository에 `findByIsActiveTrueOrderByDisplayOrderAsc()` 추가 vs `findAll()` + Java 필터**
   - What we know: Spring Data 파생 쿼리 방식이 DB 필터로 효율적. Java 필터는 7개 메뉴 수준에서 실용적.
   - What's unclear: 플랜에서 어느 방식을 선택할지.
   - Recommendation: Spring Data 파생 쿼리 방식(`findByIsActiveTrueOrderByDisplayOrderAsc()`) 추가. MenuRepository는 Phase 1 파일이므로 Phase 2에서 이 메서드를 추가하는 태스크가 필요.

2. **FlywayMigrationIT 수정 여부**
   - What we know: Phase 2는 Flyway 마이그레이션 없음. `flyway_ShouldHaveExactlyThreeMigrations()` 이미 `hasSize(3)` — 변경 불필요.
   - What's unclear: 없음. Phase 2는 FlywayMigrationIT 수정 없음 확정.
   - Recommendation: 플랜에 FlywayMigrationIT 수정 태스크 포함하지 않는다.

---

## Environment Availability

> Phase 2는 신규 외부 도구/서비스 의존성 없음. Phase 1과 동일한 환경 (PostgreSQL, Redis, Docker)을 재사용.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | R2DBC / 통합 테스트 | ✓ (Testcontainers) | 16-alpine | — |
| Redis | 통합 테스트 | ✓ (Testcontainers) | 7-alpine | — |
| Docker | Testcontainers | ✓ | — | — |

---

## Validation Architecture

> `workflow.nyquist_validation = false` — 이 섹션 생략.

---

## Security Domain

> `security_enforcement: true` (config.json) + `security_asvs_level: 1`

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes — `GET /api/menus/my` 인증 필요 | `JwtAuthenticationFilter` + `SecurityConfig.anyExchange().authenticated()` (이미 존재) |
| V3 Session Management | No | Stateless JWT — 세션 없음 |
| V4 Access Control | Yes — ADMIN bypass, 역할별 메뉴 제어 | `MenuPermissionService` 병합 로직 |
| V5 Input Validation | No | GET 요청, 경로 변수/쿼리 파라미터 없음 |
| V6 Cryptography | No | 신규 암호화 없음 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT 조작으로 ADMIN 우회 | Spoofing | `JwtTokenProvider.parseClaims()` 서명 검증 (이미 존재) |
| userId 직접 전달 (헤더 인젝션) | Elevation of Privilege | SecurityContext에서만 userId 추출 — 요청 파라미터에서 받지 않음 |
| 권한 없는 메뉴 목록 노출 | Information Disclosure | canRead OR canWrite가 하나도 없는 메뉴는 응답에서 제외 (D-03) |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: api/src/main/java/.../JwtAuthenticationFilter.java] — userId 추출 방식, ROLE_ADMIN 설정 방식
- [VERIFIED: api/src/main/java/.../AccountController.java] — `Authentication` 주입, `(Long) getPrincipal()`, `ApiResponse<T>` 래핑
- [VERIFIED: api/src/main/java/.../SecurityConfig.java] — `@EnableReactiveMethodSecurity` 활성화, `anyExchange().authenticated()`
- [VERIFIED: api/src/main/java/.../ErrorCode.java] — `DOMAIN_NNN` 에러 코드 패턴
- [VERIFIED: api/src/main/java/menu/domain/repository/*] — Phase 1 리포지토리 메서드 시그니처 전체
- [VERIFIED: api/src/main/java/menu/domain/model/*] — `getCanRead()`/`getCanWrite()` getter 이름 (Phase 1 수정 완료 확인)
- [VERIFIED: api/build.gradle] — JaCoCo 제외 패턴 (`**/domain/model/**`, `**/config/**`)
- [VERIFIED: .planning/lessons/01-2026-05-27.md] — Boolean getter 패턴, FlywayMigrationIT count assertion 교훈

### Secondary (MEDIUM confidence)
- [ASSUMED] `Mono.zip()` + `Tuple2.getT1()/getT2()` API — Reactor 3.x 표준, 훈련 데이터 기반
- [ASSUMED] Spring Data 파생 쿼리 `findByIsActiveTrueOrderByDisplayOrderAsc` 이름 자동 해석

### Tertiary (LOW confidence)
- [ASSUMED] `@EnableReactiveMethodSecurity` + `Mono<Boolean>` 반환 `@PreAuthorize` SpEL 동작 — Phase 2에서는 실제 적용 없으므로 즉각적 위험 없음

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 신규 의존성 없음, 기존 코드 직접 확인
- Architecture: HIGH — Phase 1 코드베이스에서 패턴 전부 검증됨
- Pitfalls: HIGH — Phase 1 Lesson에서 실제 발생한 오류 기반
- MenuAuthorizationBean Mono<Boolean> 동작: LOW — Phase 2 실행에 즉각 영향 없음 (Phase 3에서 검증됨)

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (Spring Security / Reactor 안정적 — 30일)
