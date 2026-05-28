# Phase 3: ADMIN API + Security 통합 - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

ADMIN 전용 전체 메뉴 조회 API(`GET /api/menus`)를 구현하고, `/api/menus/**` 경로에 대한 SecurityConfig 인증 요구와 403 AccessDenied 처리를 통합한다.

**포함:** API-02(GET /api/menus ADMIN 전용), SEC-02(@PreAuthorize ADMIN 체크), SEC-03(SecurityConfig 경로 등록), SEC-04(403 Forbidden 응답 — AccessDeniedHandler)
**제외:** GET /api/menus/my(Phase 2), MenuPermissionService 로직(Phase 2), MenuAuthorizationBean(Phase 2), Redis 캐싱(v2)

</domain>

<decisions>
## Implementation Decisions

### A. GET /api/menus 응답 DTO
- **D-01:** Phase 2의 `MyMenuResponse`(또는 `MenuAccessResponse`)와 **별개의 `AdminMenuResponse` Java record** 사용. 두 DTO는 목적이 달라 공유하지 않는다.
- **D-02:** `AdminMenuResponse` 필드 5개: `menuId`, `code`, `name`, `displayOrder`, `isActive`. `canRead`/`canWrite` 포함 안 함 — ADMIN은 메뉴 관리 목적이므로 권한 필드 불필요.
- **D-03:** `AdminMenuResponse` 패키지 위치: `menu/application/dto/` — Phase 2 DTO와 동일 패키지.
- **D-04:** 응답 목록 정렬은 `display_order` 오름차순.

### B. 403 처리 방식
- **D-05:** 커스텀 `ServerAccessDeniedHandler`를 구현하여 `ApiResponse` envelope 형식으로 403 반환. Spring Security WebFlux의 `ServerAccessDeniedHandler` 인터페이스 구현.
- **D-06:** 에러 코드: `MENU_002(HttpStatus.FORBIDDEN, "MENU_002")` — 이미 `ErrorCode` enum에 존재 (확인됨). 별도 추가 불필요.
- **D-07:** `SecurityConfig.exceptionHandling()`에 `.accessDeniedHandler(customAccessDeniedHandler)` 추가. 기존 `.authenticationEntryPoint(new HttpStatusServerEntryPoint(HttpStatus.UNAUTHORIZED))`와 동일 `exceptionHandling` 블록에 병기.
- **D-08:** 403 응답 본문: `ApiResponse.error("MENU_002", "메뉴 접근 권한이 없습니다.")` — 메시지는 i18n 없이 하드코딩 또는 `MessageSource` 조회. i18n 메시지 키 `MENU_002`가 이미 있으면 조회, 없으면 하드코딩 허용.
- **D-09:** `AccessDeniedHandler` 클래스 위치: `global/security/` — `JwtAuthenticationFilter`, `JwtBlacklistService`와 동일 패키지. 클래스명: `MenuAccessDeniedHandler` (또는 `ApiAccessDeniedHandler` — 공용 목적이라면 도메인 무관한 이름 선택).

### C. SecurityConfig 경로 등록
- **D-10:** SecurityConfig `authorizeExchange`에 `/api/menus/**` 경로를 **명시적으로 추가**하여 인증 요구 등록 (SEC-03). 기존 `anyExchange().authenticated()` 만으로도 커버되지만, 명시적 등록으로 의도를 문서화한다.
- **D-11:** `GET /api/menus` ADMIN 전용 체크는 **`@PreAuthorize("hasRole('ADMIN')")`** 어노테이션으로 처리 (SEC-02). SecurityConfig에서 역할 체크를 중복 추가하지 않는다.
- **D-12:** SecurityConfig 등록 조합: SecurityConfig(`/api/menus/**` → authenticated) + Controller(`@PreAuthorize("hasRole('ADMIN')")` → 역할 체크). `@EnableReactiveMethodSecurity` 이미 활성화 상태 — 추가 설정 불필요.
- **D-13:** `JwtAuthenticationFilter`는 **변경하지 않는다** (Phase 3 성공 기준 4번).

### D. 통합 테스트 범위
- **D-14:** `MenuControllerIT.java`에 Phase 3 시나리오를 **추가**. 기존 Phase 2 테스트 케이스(GET /api/menus/my)는 그대로 유지.
- **D-15:** 추가할 테스트 케이스 3개:
  1. `getMenus_withAdminToken_returns200WithFields()` — ADMIN 200 + 응답 필드 검증 (`$.data[0].code`, `$.data[0].name`, `$.data[0].menuId`, `$.data[0].displayOrder`, `$.data[0].isActive`)
  2. `getMenus_withUserToken_returns403WithApiResponseEnvelope()` — USER 403 + envelope 검증 (`$.code = "MENU_002"`, `$.message` 존재)
  3. `getMenus_withoutToken_returns401()` — 미인증 401
- **D-16:** 403 응답 검증 시 `$.code`가 `"MENU_002"`인지 명시적으로 assert — `AccessDeniedHandler`가 올바른 envelope을 반환하는지 End-to-End 검증.
- **D-17:** 테스트 인프라(Testcontainers, `@BeforeEach` setUp, `registerUser()`, `login()`, JdbcTemplate ADMIN 승격)는 기존 `MenuControllerIT` 패턴 재사용.

### Phase 2에서 이어받는 결정 (재확인)
- **D-18 (Phase 2 carry-forward):** ADMIN bypass는 JWT `authorities` 클레임(`ROLE_ADMIN`)으로만 판정. DB `users.role` 재조회 금지.
- **D-19 (Phase 2 carry-forward):** `@PreAuthorize` SpEL 복합 표현식 금지. `hasRole('ADMIN')` 단순 표현식만 허용.
- **D-20 (Phase 2 carry-forward):** 모든 API 응답은 `ApiResponse<T>` envelope.

### Claude's Discretion
- `MenuAccessDeniedHandler`(또는 `ApiAccessDeniedHandler`) 클래스명 최종 결정 — `global/security/`에서 공용으로 쓰일 것을 고려해 `ApiAccessDeniedHandler`가 더 적합하면 선택 가능.
- `AdminMenuResponse` DTO에서 `displayOrder`, `isActive` 필드의 Java 타입 — `Integer`/`boolean` or `int`/`Boolean` 등 기존 엔티티 타입에 맞게 결정.
- `GET /api/menus` Controller 메서드 응답 타입: `Mono<ResponseEntity<ApiResponse<List<AdminMenuResponse>>>>` — 기존 Controller 패턴 따름.
- i18n 메시지 키 `MENU_002` 존재 여부 확인 후 없으면 하드코딩 허용.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항 및 성공 기준
- `.planning/ROADMAP.md` — Phase 3 Goal, Requirements (API-02, SEC-02, SEC-03, SEC-04), Success Criteria 4개
- `.planning/REQUIREMENTS.md` — API-02, SEC-02, SEC-03, SEC-04 요구사항 상세

### Phase 1/2 결정 (이어받는 컨텍스트)
- `.planning/phases/01-new-phase/01-CONTEXT.md` — D-01~D-09: 엔티티 패턴, 서로게이트 PK, 패키지 구조
- `.planning/phases/02-new-phase/02-CONTEXT.md` — D-01~D-19: 권한 병합 규칙, DTO 설계, MenuAuthorizationBean 패키지, ADMIN bypass 방식

### 보안 설정 (핵심 수정 대상)
- `api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java` — `exceptionHandling` 블록에 `accessDeniedHandler` 추가 위치, `authorizeExchange`에 `/api/menus/**` 추가 위치
- `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java` — **변경 금지** 참조용

### 기존 보안 패턴 참조
- `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtBlacklistService.java` — `global/security/` 패키지 위치 확인용 (AccessDeniedHandler 동일 패키지)

### 응답 Envelope 및 에러 코드
- `api/src/main/java/com/example/bootstrap/global/response/ApiResponse.java` — `ApiResponse.error(code, message)` 팩토리 메서드
- `api/src/main/java/com/example/bootstrap/global/exception/ErrorCode.java` — `MENU_002(HttpStatus.FORBIDDEN, "MENU_002")` 이미 존재 (추가 불필요)
- `api/src/main/java/com/example/bootstrap/global/exception/GlobalExceptionHandler.java` — i18n 메시지 조회 패턴 (`MessageSource.getMessage(code, null, fallback, locale)`)

### 기존 Controller 패턴 참조
- `api/src/main/java/com/example/bootstrap/account/controller/AccountController.java` — Reactive Controller 패턴 (`Mono<ResponseEntity<ApiResponse<T>>>`)
- `api/src/main/java/com/example/bootstrap/batch/controller/BatchController.java` — ADMIN 전용 `@PreAuthorize("hasRole('ADMIN')")` 적용 패턴

### 기존 도메인 리포지토리 (Phase 1 구현물)
- `api/src/main/java/com/example/bootstrap/menu/domain/repository/MenuRepository.java` — `findAll()` 또는 `findByIsActiveTrue()` 호출 후 전체 목록 반환

### 통합 테스트 기반
- `api/src/test/java/com/example/bootstrap/menu/controller/MenuControllerIT.java` — Phase 3 테스트 케이스를 이 파일에 추가. `@BeforeEach` setUp, `registerUser()`, `login()`, JdbcTemplate ADMIN 승격 패턴 재사용.
- `api/src/test/java/com/example/bootstrap/global/TestcontainersConfig.java` — Testcontainers 설정

### PROJECT.md
- `.planning/PROJECT.md` — 전체 제약사항 (Reactive 필수, Lombok 금지, 생성자 주입, envelope 강제)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ErrorCode.MENU_002(HttpStatus.FORBIDDEN, "MENU_002")` — 이미 존재. AccessDeniedHandler에서 직접 사용 가능.
- `ApiResponse.error(code, message)` — 403 응답 본문 생성에 사용.
- `MenuRepository` — Phase 1에서 구현된 `findAll()` 또는 `findByIsActiveTrue()` 활용 가능. ADMIN은 모든 메뉴 조회(is_active 여부 포함)가 필요할 수 있으나 DTO에 `isActive` 필드가 있으므로 `findAll()` 후 DTO 매핑.
- `SecurityConfig.exceptionHandling()` — 현재 `authenticationEntryPoint`만 설정 중. `accessDeniedHandler` 체이닝 추가 가능한 구조.
- `MenuControllerIT` — Phase 2 테스트 기반 파일. Phase 3 메서드 추가로 확장.

### Established Patterns
- **`@PreAuthorize` 사용 예:** `BatchController`에 `@PreAuthorize("hasRole('ADMIN')")` 적용 중. 동일 패턴 재사용.
- **SecurityConfig 구조:** `authorizeExchange` → 명시적 경로 먼저, `anyExchange().authenticated()` 마지막. `/api/menus/**` 는 `anyExchange()` 앞에 명시적으로 추가.
- **ServerAccessDeniedHandler:** Spring Security WebFlux 인터페이스. `handle(ServerWebExchange exchange)` → `Mono<Void>` 반환. 응답 본문 직렬화는 `ObjectMapper`로 JSON 직접 write.
- **생성자 주입 전용:** `@Autowired` 필드 주입 금지. AccessDeniedHandler도 동일하게 생성자 주입.
- **DTO는 Java record:** `AdminMenuResponse` record 형태로 작성.

### Integration Points
- `MenuController`에 `GET /api/menus` 메서드 추가 (`@PreAuthorize("hasRole('ADMIN')")` + `Mono<ResponseEntity<ApiResponse<List<AdminMenuResponse>>>>` 반환).
- `SecurityConfig`에 두 변경: (1) `authorizeExchange`에 `.pathMatchers("/api/menus/**").authenticated()` 추가, (2) `exceptionHandling`에 `.accessDeniedHandler(customHandler)` 추가.
- `AccessDeniedHandler`는 `global/security/` 패키지 신규 클래스 — `SecurityConfig`에서 Bean 주입 또는 `@Bean`으로 등록.

</code_context>

<specifics>
## Specific Ideas

- **AccessDeniedHandler 구현 스케치:**
  ```java
  // global/security/ApiAccessDeniedHandler.java
  @Component
  public class ApiAccessDeniedHandler implements ServerAccessDeniedHandler {
      private final ObjectMapper objectMapper;
      // 생성자 주입
      @Override
      public Mono<Void> handle(ServerWebExchange exchange, AccessDeniedException ex) {
          ServerHttpResponse response = exchange.getResponse();
          response.setStatusCode(HttpStatus.FORBIDDEN);
          response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
          ApiResponse<?> body = ApiResponse.error("MENU_002", "메뉴 접근 권한이 없습니다.");
          // objectMapper.writeValueAsBytes(body) → DataBuffer → response.writeWith()
      }
  }
  ```

- **SecurityConfig 변경 지점:**
  ```java
  .exceptionHandling(ex -> ex
      .authenticationEntryPoint(new HttpStatusServerEntryPoint(HttpStatus.UNAUTHORIZED))
      .accessDeniedHandler(apiAccessDeniedHandler))   // 추가
  .authorizeExchange(exchanges -> exchanges
      // ... 기존 경로들 ...
      .pathMatchers("/api/menus/**").authenticated()  // 추가 (SEC-03)
      .anyExchange().authenticated()
  )
  ```

- **통합 테스트 403 검증 핵심:**
  ```java
  webTestClient.get().uri("/api/menus")
      .header("Authorization", "Bearer " + userAccessToken)
      .exchange()
      .expectStatus().isForbidden()
      .expectBody()
      .jsonPath("$.code").isEqualTo("MENU_002");
  ```

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 Phase 3 스코프 내에서만 진행됨.

</deferred>

---

*Phase: 3-ADMIN API + Security 통합*
*Context gathered: 2026-05-29*
