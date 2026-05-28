# Phase 2: 권한 서비스 + 핵심 API - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 8 (신규 생성 5 + 수정 2 + 신규 테스트 2)
**Analogs found:** 8 / 8

---

## File Classification

| 신규/수정 파일 | Role | Data Flow | Closest Analog | Match Quality |
|----------------|------|-----------|----------------|---------------|
| `menu/application/service/MenuPermissionService.java` | service | CRUD + event-driven (병합) | `account/application/service/AuthService.java` | role-match (Reactive flatMap 체인) |
| `menu/controller/MenuController.java` | controller | request-response | `account/controller/AccountController.java` | exact |
| `menu/application/dto/MyMenuResponse.java` | DTO record | — | `account/application/dto/TokenResponse.java` + `AccountResponse.java` | exact |
| `global/security/MenuAuthorizationBean.java` | security bean | request-response | `global/security/jwt/JwtAuthenticationFilter.java` | role-match (같은 패키지 레이어, Authentication 주입) |
| `global/exception/ErrorCode.java` (수정) | config/enum | — | self (기존 파일에 MENU_NNN 추가) | self |
| `menu/domain/repository/MenuRepository.java` (수정) | repository | CRUD | `menu/domain/repository/UserRoleRepository.java` | exact |
| `menu/application/service/MenuPermissionServiceTest.java` | test (unit) | — | `account/application/service/AuthServiceTest.java` | exact |
| `menu/controller/MenuControllerIT.java` | test (integration) | — | `account/controller/AccountControllerIT.java` | exact |

---

## Pattern Assignments

### `menu/application/service/MenuPermissionService.java` (service, CRUD + 병합)

**Analog:** `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java`

**Imports pattern** (lines 1–15):
```java
package com.example.bootstrap.menu.application.service;

import com.example.bootstrap.menu.application.dto.MyMenuResponse;
import com.example.bootstrap.menu.domain.model.Menu;
import com.example.bootstrap.menu.domain.model.RoleMenuPermission;
import com.example.bootstrap.menu.domain.model.UserMenuPermission;
import com.example.bootstrap.menu.domain.repository.MenuRepository;
import com.example.bootstrap.menu.domain.repository.RoleMenuPermissionRepository;
import com.example.bootstrap.menu.domain.repository.UserMenuPermissionRepository;
import com.example.bootstrap.menu.domain.repository.UserRoleRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
```

**생성자 주입 패턴** (AuthService.java lines 42–53):
```java
// 수동 getter/setter 엔티티, Lombok 금지, final 파라미터
public MenuPermissionService(
        final UserRoleRepository userRoleRepository,
        final RoleMenuPermissionRepository roleMenuPermissionRepository,
        final UserMenuPermissionRepository userMenuPermissionRepository,
        final MenuRepository menuRepository) {
    this.userRoleRepository = userRoleRepository;
    this.roleMenuPermissionRepository = roleMenuPermissionRepository;
    this.userMenuPermissionRepository = userMenuPermissionRepository;
    this.menuRepository = menuRepository;
}
```

**Reactive flatMap 체인 핵심 패턴** (AuthService.java lines 62–71):
```java
// switchIfEmpty + flatMap 체인 패턴 (에러 처리)
return repository.findByEmail(email)
        .switchIfEmpty(Mono.error(new BusinessException(ErrorCode.AUTH_004)))
        .flatMap(account -> { ... });

// MenuPermissionService에서의 적용:
// roleIds collectList() → flatMap → Mono.zip() → flatMap(mergeAndFetch)
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
        .flatMap(tuple -> { ... });
```

**ADMIN bypass 분기 패턴** (RESEARCH.md Pattern 2 + JwtAuthenticationFilter.java lines 61–65):
```java
// getAuthority()는 "ROLE_ADMIN" 반환 — "ADMIN" 아님
boolean isAdmin = authentication.getAuthorities().stream()
    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

// 서비스 진입 시 isAdmin 파라미터로 분기
public Mono<List<MyMenuResponse>> getMyMenus(final Long userId, final boolean isAdmin) {
    if (isAdmin) {
        return menuRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
            .map(m -> new MyMenuResponse(m.getId(), m.getCode(), m.getName(), true, true))
            .collectList();
    }
    // ... USER 경로
}
```

**Boolean 필드 getter 패턴** (RoleMenuPermission.java lines 97–106, UserMenuPermission.java 동일):
```java
// Boolean 박싱 타입은 반드시 get 접두사 — is 접두사 사용 금지 (Phase 1 Lesson)
public Boolean getCanRead() { return canRead; }
public Boolean getCanWrite() { return canWrite; }

// 사용 시
Boolean.TRUE.equals(p.getCanRead())   // null-safe 비교
Boolean.TRUE.equals(p.getCanWrite())
```

**Menu 엔티티 isActive getter** (Menu.java line 113):
```java
// Menu 엔티티의 isActive 필드는 Boolean 타입 — getter 이름 주의
public Boolean isActive() { return isActive; }
// 사용 시: Boolean.TRUE.equals(menu.isActive())
```

---

### `menu/controller/MenuController.java` (controller, request-response)

**Analog:** `api/src/main/java/com/example/bootstrap/account/controller/AccountController.java`

**Imports + 클래스 선언 패턴** (AccountController.java lines 1–32):
```java
package com.example.bootstrap.menu.controller;

import com.example.bootstrap.menu.application.dto.MyMenuResponse;
import com.example.bootstrap.menu.application.service.MenuPermissionService;
import com.example.bootstrap.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import java.util.List;

@RestController
@RequestMapping("/api/menus")
public class MenuController {

    private final MenuPermissionService menuPermissionService;

    public MenuController(final MenuPermissionService menuPermissionService) {
        this.menuPermissionService = menuPermissionService;
    }
```

**Authentication 주입 + userId 추출 패턴** (AccountController.java lines 54–61):
```java
// Authentication은 메서드 파라미터로 주입 — @AuthenticationPrincipal 사용 안 함
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
```

**ApiResponse 래핑 패턴** (AccountController.java lines 58–61):
```java
// ResponseEntity.ok() + ApiResponse.success(message, data) 고정 패턴
.map(response -> ResponseEntity.ok(
    ApiResponse.success("메시지.", response)));
```

---

### `menu/application/dto/MyMenuResponse.java` (DTO record)

**Analog:** `api/src/main/java/com/example/bootstrap/account/application/dto/TokenResponse.java` (단순 record), `AccountResponse.java` (from() 팩토리 패턴)

**TokenResponse 패턴** (lines 1–10):
```java
// 단순 record — 필드 5개, 팩토리 메서드 불필요
package com.example.bootstrap.menu.application.dto;

/**
 * 메뉴 접근 권한 응답 DTO.
 *
 * @param menuId   메뉴 PK
 * @param code     메뉴 고유 코드
 * @param name     메뉴 표시 이름
 * @param canRead  읽기 권한 여부
 * @param canWrite 쓰기 권한 여부
 */
public record MyMenuResponse(Long menuId, String code, String name,
                              boolean canRead, boolean canWrite) {
}
```

**주의:** `canRead`, `canWrite`는 `boolean` primitive (not `Boolean` 박싱) — record accessor는 `canRead()`, `canWrite()`로 자동 생성되어 Jackson 직렬화 키가 `canRead`, `canWrite`로 정확하게 나옴.

---

### `global/security/MenuAuthorizationBean.java` (security bean, request-response)

**Analog:** `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java` (같은 패키지 레이어, Authentication 주입 방식 공유)

**패키지 위치 확인** (JwtAuthenticationFilter.java line 1):
```java
// global/security/ 패키지 — jwt/ 서브패키지가 아닌 바로 아래
package com.example.bootstrap.global.security;
```

**생성자 주입 + @Component 패턴** (JwtAuthenticationFilter.java lines 37–42):
```java
@Component("menuAuthorizationBean")  // SpEL 참조명: @menuAuthorizationBean
public class MenuAuthorizationBean {

    private final MenuPermissionService menuPermissionService;

    public MenuAuthorizationBean(final MenuPermissionService menuPermissionService) {
        this.menuPermissionService = menuPermissionService;
    }
```

**Authentication에서 userId 추출 패턴** (JwtAuthenticationFilter.java lines 61–65):
```java
// principal은 Long으로 세팅됨 (JwtAuthenticationFilter line 63)
Long userId = Long.parseLong(claims.getSubject());
// UsernamePasswordAuthenticationToken(userId, null, authorities)

// MenuAuthorizationBean에서 동일하게:
Long userId = (Long) authentication.getPrincipal();
```

**Mono<Boolean> 반환 메서드 패턴** (RESEARCH.md Pattern 3):
```java
public Mono<Boolean> canRead(final Authentication authentication, final String menuCode) {
    Long userId = (Long) authentication.getPrincipal();
    return menuPermissionService.canRead(userId, menuCode);
}

public Mono<Boolean> canWrite(final Authentication authentication, final String menuCode) {
    Long userId = (Long) authentication.getPrincipal();
    return menuPermissionService.canWrite(userId, menuCode);
}
```

---

### `global/exception/ErrorCode.java` (수정 — MENU 도메인 추가)

**Analog:** self (기존 파일, 동일 패턴으로 섹션 추가)

**추가 위치 및 패턴** (ErrorCode.java lines 46–52 참고):
```java
// Batch 도메인 블록 아래에 Menu 도메인 블록 추가
// ── Menu 도메인 ──────────────────────────────────────────────────────────
/** 존재하지 않는 메뉴입니다. */
MENU_001(HttpStatus.NOT_FOUND, "MENU_001"),
/** 메뉴 접근 권한이 없습니다. */
MENU_002(HttpStatus.FORBIDDEN, "MENU_002"),
```

**ErrorCode 생성자 패턴** (ErrorCode.java lines 68–70):
```java
// (HttpStatus, String) 2-arg 생성자만 존재
ErrorCode(final HttpStatus httpStatus, final String code) {
    this.httpStatus = httpStatus;
    this.code = code;
}
```

---

### `menu/domain/repository/MenuRepository.java` (수정 — 메서드 추가)

**Analog:** `api/src/main/java/com/example/bootstrap/menu/domain/repository/UserRoleRepository.java`

**기존 MenuRepository** (lines 1–23):
```java
// ReactiveCrudRepository 확장 — findAllById(Iterable<Long>): Flux<Menu> 기본 제공
@Repository
public interface MenuRepository extends ReactiveCrudRepository<Menu, Long> {
    Mono<Menu> findByCode(String code);
    // 추가할 메서드:
    Flux<Menu> findByIsActiveTrueOrderByDisplayOrderAsc();
}
```

**Spring Data 파생 쿼리 패턴** (UserRoleRepository.java lines 22–30):
```java
// Javadoc + 파라미터 없는 파생 쿼리 패턴
import reactor.core.publisher.Flux;

/**
 * 활성화된 메뉴를 표시 순서 오름차순으로 조회합니다.
 *
 * @return is_active=true인 메뉴 목록 (display_order ASC)
 */
Flux<Menu> findByIsActiveTrueOrderByDisplayOrderAsc();
```

**주의:** Spring Data 파생 쿼리 이름 `findByIsActiveTrueOrderByDisplayOrderAsc`는 ASSUMED 수준 (RESEARCH.md A3). 컴파일 실패 시 대안: `findAll()` + `.filter(m -> Boolean.TRUE.equals(m.isActive())).sort(Comparator.comparingInt(Menu::getDisplayOrder))`.

---

### `menu/application/service/MenuPermissionServiceTest.java` (unit test)

**Analog:** `api/src/test/java/com/example/bootstrap/account/application/service/AuthServiceTest.java`

**클래스 구조 패턴** (AuthServiceTest.java lines 33–55):
```java
@ExtendWith(MockitoExtension.class)  // Spring context 없음
class MenuPermissionServiceTest {

    @Mock private UserRoleRepository userRoleRepository;
    @Mock private RoleMenuPermissionRepository roleMenuPermissionRepository;
    @Mock private UserMenuPermissionRepository userMenuPermissionRepository;
    @Mock private MenuRepository menuRepository;

    private MenuPermissionService menuPermissionService;

    @BeforeEach
    void setUp() {
        menuPermissionService = new MenuPermissionService(
                userRoleRepository, roleMenuPermissionRepository,
                userMenuPermissionRepository, menuRepository);
    }
```

**StepVerifier 단언 패턴** (AuthServiceTest.java lines 73–79):
```java
StepVerifier.create(menuPermissionService.getMyMenus(userId, false))
    .assertNext(list -> {
        assertThat(list).hasSize(1);
        assertThat(list.get(0).canRead()).isTrue();
    })
    .verifyComplete();
```

**에러 단언 패턴** (AuthServiceTest.java lines 86–93):
```java
StepVerifier.create(menuPermissionService.getMyMenus(userId, false))
    .expectErrorSatisfies(e -> {
        assertThat(e).isInstanceOf(BusinessException.class);
        assertThat(((BusinessException) e).getErrorCode()).isEqualTo(ErrorCode.MENU_001);
    })
    .verify();
```

**테스트 메서드 명명 패턴** (AuthServiceTest.java 전체):
```
methodUnderTest_scenario_expectation
예: getMyMenus_withAdminRole_returnsAllActiveMenus
    getMyMenus_withEmptyRoles_returnsEmptyList
    getMyMenus_withUserOverride_overridesPrevailsOverRolePermission
    canRead_whenMenuCodeNotFound_returnsFalse
```

**헬퍼 빌더 패턴** (AuthServiceTest.java lines 248–266):
```java
// 엔티티 수동 생성 (Lombok 금지)
private static Menu buildMenu(Long id, String code, String name, int displayOrder) {
    Menu m = new Menu();
    m.setId(id);
    m.setCode(code);
    m.setName(name);
    m.setDisplayOrder(displayOrder);
    m.setActive(true);
    return m;
}

private static RoleMenuPermission buildRolePerm(Long menuId, boolean canRead, boolean canWrite) {
    RoleMenuPermission p = new RoleMenuPermission();
    p.setMenuId(menuId);
    p.setCanRead(canRead);
    p.setCanWrite(canWrite);
    return p;
}
```

---

### `menu/controller/MenuControllerIT.java` (integration test)

**Analog:** `api/src/test/java/com/example/bootstrap/account/controller/AccountControllerIT.java`

**클래스 어노테이션 패턴** (AccountControllerIT.java lines 23–28):
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@ActiveProfiles("local")
@Import(TestcontainersConfig.class)
@DisplayName("MenuController 통합 테스트")
class MenuControllerIT {

    @Autowired
    private WebTestClient webTestClient;

    private String accessToken;        // USER 토큰
    private String adminAccessToken;   // ADMIN 토큰 (ADMIN bypass 검증용)
```

**@BeforeEach 토큰 획득 패턴** (AccountControllerIT.java lines 37–57):
```java
// register → login → accessToken 추출 순서 고정
@BeforeEach
void setUp() {
    // USER 계정 등록 + 토큰 획득
    webTestClient.post().uri("/api/v1/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(registerBody)
            .exchange()
            .expectStatus().isCreated();

    webTestClient.post().uri("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(loginBody)
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.data.accessToken").value(token -> this.accessToken = (String) token);
}
```

**WebTestClient 검증 패턴** (AccountControllerIT.java lines 62–72):
```java
// GET /api/menus/my 검증
webTestClient.get().uri("/api/menus/my")
    .header("Authorization", "Bearer " + accessToken)
    .exchange()
    .expectStatus().isOk()
    .expectBody()
    .jsonPath("$.code").isEqualTo("SUCCESS")
    .jsonPath("$.data").isArray()
    .jsonPath("$.data[0].menuId").isNotEmpty()
    .jsonPath("$.data[0].canRead").isEqualTo(true);

// 미인증 401 검증
webTestClient.get().uri("/api/menus/my")
    .exchange()
    .expectStatus().isUnauthorized();
```

---

## Shared Patterns

### Authentication 주입 및 userId/role 추출
**Source:** `api/src/main/java/com/example/bootstrap/account/controller/AccountController.java` lines 56–57  
**적용 대상:** `MenuController`, `MenuAuthorizationBean`
```java
Long userId = (Long) authentication.getPrincipal();
boolean isAdmin = authentication.getAuthorities().stream()
    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
```

### ApiResponse envelope
**Source:** `api/src/main/java/com/example/bootstrap/global/response/ApiResponse.java` lines 63–65  
**적용 대상:** `MenuController`
```java
// data가 있는 성공 응답
ApiResponse.success("접근 가능한 메뉴 목록을 조회했습니다.", menus)
// code: "SUCCESS", message: "...", data: [...], errors: null
```

### 생성자 주입 전용 (Lombok 금지)
**Source:** `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java` lines 42–53  
**적용 대상:** `MenuPermissionService`, `MenuController`, `MenuAuthorizationBean`
```java
// final 필드 + 모든 의존성을 생성자 파라미터로 받음
// @Autowired, @RequiredArgsConstructor 사용 금지
public MenuPermissionService(final UserRoleRepository userRoleRepository, ...) {
    this.userRoleRepository = userRoleRepository;
    ...
}
```

### Reactive switchIfEmpty + 에러 처리
**Source:** `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java` lines 63–64  
**적용 대상:** `MenuPermissionService.canRead()`, `MenuPermissionService.canWrite()`
```java
return menuRepository.findByCode(menuCode)
    .switchIfEmpty(Mono.error(new BusinessException(ErrorCode.MENU_001)));
// 또는 menuCode가 존재하지 않으면 false 반환:
.defaultIfEmpty(false)
```

### Mono.zip() 빈 리스트 안전 패턴
**Source:** RESEARCH.md Pattern 1 (CONTEXT.md D-09 결정)  
**적용 대상:** `MenuPermissionService.getMyMenus()` USER 경로
```java
// zip 인자 중 하나가 Mono.empty()이면 zip 전체가 empty — 반드시 Mono.just(emptyList) 사용
Mono<List<RoleMenuPermission>> rolePermsMono = roleIds.isEmpty()
    ? Mono.just(Collections.emptyList())
    : roleMenuPermissionRepository.findByRoleIdIn(roleIds).collectList();
```

---

## No Analog Found

신규 파일 모두 기존 코드에서 직접 대응하는 analog가 존재한다. 완전히 새로운 패턴은 없음.

| 파일 | 비고 |
|------|------|
| (없음) | 모든 파일에 analog 존재 |

단, `Mono.zip()` 사용 자체는 프로젝트 내 선례 없음 — RESEARCH.md Pattern 1 (Reactor 표준 API 기반)을 참조.

---

## 핵심 안전 규칙 요약 (Pitfall Guard)

| 규칙 | 근거 |
|------|------|
| `Boolean` 필드 getter는 `getCanRead()` — `isCanRead()` 금지 | Phase 1 Lesson: Jackson이 `isCanRead` 키로 직렬화하여 DTO 필드명 오염 |
| `Mono.zip()` 인자에 `Mono.empty()` 사용 금지 → `Mono.just(emptyList)` | D-09, RESEARCH.md Pitfall 2 |
| `findAll()` + 필터 금지 → `findAllById(menuIds)` | D-12 |
| ADMIN 판정은 `authentication.getAuthorities()` 에서만 — DB 재조회 금지 | D-17 |
| `findByRoleIdIn(emptyList)` 직접 호출 금지 → 서비스에서 명시적 분기 | D-09, RESEARCH.md Pitfall 1 |
| `MyMenuResponse` record의 `canRead`, `canWrite`는 `boolean` primitive | Jackson record accessor명 = `canRead()`, `canWrite()` → 직렬화 키 정확 |

---

## Metadata

**Analog search scope:** `api/src/main/java/com/example/bootstrap/` (account, global, menu 도메인)  
**Files scanned:** 18  
**Pattern extraction date:** 2026-05-28
