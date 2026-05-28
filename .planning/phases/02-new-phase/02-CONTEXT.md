# Phase 2: 권한 서비스 + 핵심 API - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

`MenuPermissionService`(권한 병합 서비스)와 `MenuAuthorizationBean`을 구현하고,
인증된 사용자가 자신의 접근 가능한 메뉴 목록을 받는 `GET /api/menus/my` 엔드포인트를 제공한다.

**포함:** DOM-06(MenuPermissionService), DOM-07(MenuAuthorizationBean), API-01(GET /api/menus/my), SEC-01(ADMIN bypass)
**제외:** GET /api/menus(Phase 3), SecurityConfig 경로 등록(Phase 3), @PreAuthorize 실제 적용(Phase 3), Redis 캐싱(v2)

</domain>

<decisions>
## Implementation Decisions

### 권한 병합 규칙
- **D-01:** `user_menu_permissions`의 값이 역할 권한을 **덮어씀 (양방향 오버라이드)**. canRead=false로 오버라이드하면 역할에서 true여도 최종 false. 개인별 제한 가능.
- **D-02:** `user_menu_permissions` 행이 없는 메뉴는 역할 권한을 그대로 사용. 행 없음 = 오버라이드 없음.
- **D-03:** 역할 권한도 없고 개인 오버라이드도 없는 메뉴는 **응답에서 제외**. 프론트엔드는 접근 가능한 것만 받음. canRead=false인 메뉴는 목록에 포함되지 않음.
- **D-04:** 여러 역할의 권한은 **OR 집계 (additive)**. 역할 A(canRead=true, canWrite=false) + 역할 B(canRead=false, canWrite=true) → 최종 canRead=true, canWrite=true. 가장 관대한 권한 적용.

### 응답 DTO 형태 (GET /api/menus/my)
- **D-05:** `is_active=false` 메뉴는 **응답에서 제외**. 권한이 있어도 비활성 메뉴는 반환하지 않음. 서버가 필터링.
- **D-06:** 응답 목록은 **`display_order` 오름차순** 정렬.
- **D-07:** 응답 DTO 필드는 ROADMAP.md 명시 **5개만**: `menuId, code, name, canRead, canWrite`. displayOrder 등 추가 필드 없음.
- **D-08:** ADMIN 사용자는 DB 권한 테이블 조회 없이 **`is_active=true` 전체 메뉴**를 canRead=true, canWrite=true로 반환. 비활성 메뉴는 ADMIN도 제외.

### 빈 roleIds 처리 (역할 미할당 사용자)
- **D-09:** `UserRoleRepository.findByUserId()`가 빈 Flux를 반환하면(역할 미할당) **서비스 레이어에서 명시적 분기** — `findByRoleIdIn()` 호출을 건너뛰고 즉시 빈 역할 권한 맵 반환. R2DBC의 `IN (emptyList)` 동작에 의존하지 않음.
- **D-10:** `UserMenuPermissionRepository.findByUserId()`는 역할 유무와 무관하게 **항상 실행**. 역할 미할당 사용자도 개인 오버라이드만으로 접근 가능.
- **D-11:** roleIds 분기 후 역할 권한 조회(`findByRoleIdIn()`)와 개인 오버라이드 조회(`findByUserId()`)는 **`Mono.zip()` 병렬 실행**.
- **D-12:** 병합 후 접근 가능한 menuId 목록으로 메뉴 정보를 가져올 때 **`findAllById(menuIds)`** 사용. `findAll()` 후 필터링 방식 금지.

### MenuAuthorizationBean 설계
- **D-13:** Phase 2에서는 `MenuAuthorizationBean` **Bean 구현만**. `@PreAuthorize` 실제 적용은 Phase 3.
- **D-14:** Bean이 제공하는 메서드는 **`canRead(Authentication, String menuCode)`** + **`canWrite(Authentication, String menuCode)`** 2개. 단일 `canAccess()` 메서드 방식 사용 안 함.
- **D-15:** `MenuAuthorizationBean` 패키지 위치는 **`global/security/`** — `JwtAuthenticationFilter`, `JwtBlacklistService`와 동일 패키지.
- **D-16:** `MenuAuthorizationBean`은 `MenuPermissionService`에 추가할 **단건 조회 메서드 `canRead(userId, menuCode): Mono<Boolean>`** + **`canWrite(userId, menuCode): Mono<Boolean>`**를 호출. 목록 조회 후 필터링 방식 사용 안 함.

### Phase 1에서 이어받는 결정 (재확인)
- **D-17 (Phase 1 carry-forward):** ADMIN bypass는 JWT `authorities` 클레임으로만 판정 (`hasRole('ADMIN')` 확인). DB `users.role` 재조회 금지.
- **D-18 (Phase 1 carry-forward):** `@PreAuthorize` SpEL 복합 표현식 금지. 단일 `MenuAuthorizationBean` 메서드 호출로만 구성.
- **D-19 (Phase 1 carry-forward):** 서비스 패키지: `com.example.bootstrap.menu.application.service.MenuPermissionService`.

### Claude's Discretion
- `MenuPermissionService` 내부 병합 알고리즘 구현 세부 사항 (Map<Long, MenuPermission> 구조 등) — 결정된 규칙(OR 집계, 오버라이드 우선)을 충족하는 방향으로 자유롭게 구현.
- 응답 DTO Java record 이름 — `MenuAccessResponse` 또는 `MyMenuResponse` 등 기존 DTO 명명 패턴에 맞게 선택.
- 에러 코드 (`MENU_001` 등) 값 — 기존 `ErrorCode` enum 패턴(`DOMAIN_NNN`) 따라 추가.
- `MenuController` URL path 설계 — `/api/menus/my` (ROADMAP.md 명시).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항 및 성공 기준
- `.planning/ROADMAP.md` — Phase 2 Goal, Requirements (DOM-06, DOM-07, API-01, SEC-01), Success Criteria 5개
- `.planning/REQUIREMENTS.md` — DOM-06(MenuPermissionService 상세), DOM-07(MenuAuthorizationBean 상세), API-01, SEC-01
- `.planning/PROJECT.md` — 제약사항: ADMIN bypass 방식, WebFlux+R2DBC Reactive 필수, @PreAuthorize SpEL 복합 표현식 금지

### Phase 1 결정 (이어받는 컨텍스트)
- `.planning/phases/01-new-phase/01-CONTEXT.md` — D-01~D-09: 엔티티 패턴, 서로게이트 PK, TIMESTAMPTZ, 패키지 구조

### 기존 서비스 패턴 참조
- `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java` — Reactive 서비스 구현 패턴 (생성자 주입, `switchIfEmpty`, `flatMap`, `Schedulers` 격리)
- `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java` — userId 추출 방식: `authentication.getPrincipal()` → Long. ADMIN 판정: `authentication.getAuthorities()` → `ROLE_ADMIN` 확인

### 보안 설정
- `api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java` — `@EnableReactiveMethodSecurity` 활성화 확인, `anyExchange().authenticated()` 현재 설정

### 기존 리포지토리 (Phase 1 구현물)
- `api/src/main/java/com/example/bootstrap/menu/domain/repository/UserRoleRepository.java` — `findByUserId(Long)` 제공
- `api/src/main/java/com/example/bootstrap/menu/domain/repository/RoleMenuPermissionRepository.java` — `findByRoleIdIn(Collection<Long>)` 제공
- `api/src/main/java/com/example/bootstrap/menu/domain/repository/UserMenuPermissionRepository.java` — `findByUserId(Long)` 제공
- `api/src/main/java/com/example/bootstrap/menu/domain/repository/MenuRepository.java` — `findAllById()` (ReactiveCrudRepository 기본 제공)

### 응답 Envelope 패턴
- `api/src/main/java/com/example/bootstrap/global/response/ApiResponse.java` — 모든 API 응답 envelope (success/error 팩토리)
- `api/src/main/java/com/example/bootstrap/global/exception/ErrorCode.java` — 에러 코드 enum (MENU_NNN 추가 위치)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UserRoleRepository.findByUserId(Long)` — 이미 구현됨. userId로 역할 목록 조회.
- `RoleMenuPermissionRepository.findByRoleIdIn(Collection<Long>)` — 이미 구현됨. 복수 역할ID로 메뉴 권한 일괄 조회. 빈 컬렉션 분기는 서비스에서 처리.
- `UserMenuPermissionRepository.findByUserId(Long)` — 이미 구현됨. 개인 오버라이드 조회.
- `MenuRepository` (ReactiveCrudRepository 확장) — `findAllById(Iterable<Long>)` 기본 제공.
- `AuthService` — `Mono.zip()` + `flatMap()` 병렬 조회 패턴 참조.
- `ApiResponse<T>` — 컨트롤러 응답 래핑 정적 팩토리.

### Established Patterns
- **userId 추출:** `authentication.getPrincipal()` → `(Long) principal`. `JwtAuthenticationFilter`가 이미 Long으로 세팅.
- **ADMIN 판정:** `authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))` — DB 재조회 없이 SecurityContext에서만.
- **Reactive 에러 처리:** `switchIfEmpty(Mono.error(new BusinessException(ErrorCode.XXX)))` 패턴.
- **생성자 주입 전용:** `@Autowired` 필드 주입 금지. Lombok 금지.
- **DTO:** Java record 사용.
- **패키지 구조:** `menu/controller → menu/application/service + menu/application/dto → menu/domain → global/security`

### Integration Points
- `MenuAuthorizationBean`은 `global/security/` 패키지에 위치 — `SecurityConfig`와 동일 레이어. `MenuPermissionService`를 의존.
- `MenuController`는 `menu/controller/` 패키지, `SecurityConfig`의 `anyExchange().authenticated()` 규칙 적용됨 (별도 경로 등록 불필요 — Phase 3에서 명시적 추가 예정).
- `@EnableReactiveMethodSecurity` 활성화 상태 — Phase 3에서 `@PreAuthorize` 즉시 사용 가능.

</code_context>

<specifics>
## Specific Ideas

- **병합 알고리즘 흐름:**
  1. `UserRoleRepository.findByUserId(userId)` → roleIds 수집
  2. roleIds 빈 체크 → 비어 있으면 역할 권한 맵 = 빈 맵 (findByRoleIdIn 호출 스킵)
  3. `Mono.zip(findByRoleIdIn(roleIds).collectList(), findByUserId(userId).collectList())` 병렬
  4. 역할 권한 OR 집계 → `Map<Long menuId, {canRead, canWrite}>`
  5. 개인 오버라이드 COALESCE 적용 → user_menu_permissions 행이 있으면 덮어씀 (양방향)
  6. 접근 가능(canRead OR canWrite가 하나라도 true)한 menuId 목록 추출
  7. `MenuRepository.findAllById(menuIds)` → is_active=true 필터 + display_order 정렬
  8. `MyMenuResponse` 리스트 반환

- **ADMIN 흐름 분기:**
  - SecurityContext에서 `ROLE_ADMIN` 확인 → `MenuRepository.findAll()` (또는 `findByIsActiveTrue()`) → 전체 canRead=true, canWrite=true로 매핑

- **`MenuPermissionService` 단건 조회 메서드:**
  - `canRead(Long userId, String menuCode): Mono<Boolean>` — 위 병합 결과에서 해당 menuCode 존재 여부 + canRead 확인
  - `canWrite(Long userId, String menuCode): Mono<Boolean>` — 동일, canWrite 확인

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 Phase 2 스코프 내에서만 진행됨.

</deferred>

---

*Phase: 2-권한 서비스 + 핵심 API*
*Context gathered: 2026-05-28*
