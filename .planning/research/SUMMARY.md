# Research Summary — 메뉴별 접근 권한 관리 (RBAC)

**Date:** 2026-05-27
**Overall Confidence:** HIGH

---

## 핵심 발견

### Stack

신규 의존성 0개. Spring Boot 3.4.5 BOM이 Spring Security 6.4.5, Spring Data R2DBC 3.4.5를 이미 관리한다.
`@EnableReactiveMethodSecurity`가 `SecurityConfig.java`에 이미 활성화되어 있고, `RedisCacheUtil`도 존재하므로 인프라 셋업 비용은 0에 가깝다.

**권장 패턴:**
- `@PreAuthorize("@menuAuthz.hasReadAccess(authentication, 'MENU_CODE')")` — 커스텀 Authorization Bean (`Mono<Boolean>` 반환)
- SpEL 복합 표현식 (`hasRole() && @bean.mono()`) **금지** — Spring Security issue #15209 우회 위해 단일 빈 메서드로 통합
- R2DBC 단순 JOIN: `@Query`(R2dbcRepository) / 다중 테이블 COALESCE: `DatabaseClient.sql().bind().map()`

### Features — Table Stakes (필수 10개)

1. ADMIN 바이패스 (JWT 클레임 authority로 판정, DB 재조회 금지)
2. Flyway V3 마이그레이션 (menus, roles, user_roles, role_menu_permissions, user_menu_permissions)
3. R2DBC 도메인 모델 5개
4. `GET /api/menus/my` — 내 접근 가능 메뉴 목록 (canRead, canWrite 포함)
5. `GET /api/menus` — 전체 메뉴 목록 (ADMIN 전용)
6. 권한 해석 우선순위: ADMIN → user_override → role 집계(additive) → 거부
7. 역할-메뉴 권한 테이블 (role_menu_permissions)
8. 사용자-역할 매핑 테이블 (user_roles)
9. 사용자 오버라이드 테이블 (user_menu_permissions)
10. 403 Forbidden 응답

**Differentiators (Phase 4 이후):**
- Redis 캐싱 (`menu-perms:{userId}`) — 이미 `RedisCacheUtil` 존재로 통합 비용 낮음
- 권한 변경 시 캐시 무효화

**Anti-features (v1 명시적 제외):**
- 메뉴 트리/계층 구조
- 메뉴 CRUD 관리 API
- 관리자 UI
- 역할 계층 (상속)
- 감사 로그
- deny 규칙

### Architecture

**3계층 분산 권한 체크:**
1. `SecurityConfig` → 경로 레벨 인증/ADMIN role (기존 패턴 유지)
2. `@PreAuthorize` → ADMIN 전용 API 하나 (`GET /api/menus`)
3. `MenuPermissionService` → ADMIN 바이패스 + 역할/오버라이드 병합

**신규 도메인 패키지:** `menu/` (account에 넣지 않음 — 책임 분리)
```
menu/
  controller/MenuController.java
  application/service/MenuPermissionService.java
  application/dto/MenuPermissionResponse.java
  domain/model/Menu.java, Role.java, UserRole.java, RoleMenuPermission.java, UserMenuPermission.java
  domain/repository/Menu*Repository.java
```

**`JwtAuthenticationFilter` 변경 없음** — 필터에 메뉴 권한 로딩 금지 (모든 요청에 DB 조회 유발)

**권한 병합:** 서비스 레이어 Java 코드 (`Mono.zip()` 병렬 쿼리)

### 치명적 함정 5개

| 함정 | 예방 |
|------|------|
| SecurityContext 소실 (`ReactiveSecurityContextHolder` 직접 호출) | `@PreAuthorize` 일원화, 컨트롤러 `@AuthenticationPrincipal` 주입 |
| `ROLE_` 이중 접두어 (`hasRole('ROLE_ADMIN')`) | `hasRole('ADMIN')` 사용 — Spring이 자동 추가 |
| ADMIN bypass DB 재조회 (JWT 클레임 불일치 time-window) | JWT `authorities` 클레임으로만 판정 |
| N+1 쿼리 (R2DBC `flatMap` 중첩) | `DatabaseClient` + JOIN 단일 쿼리 |
| `@PreAuthorize` AOP 우회 (같은 클래스 내부 호출) | 컨트롤러 또는 컨트롤러가 직접 호출하는 서비스 메서드에만 적용 |

---

## 로드맵 시사점

**권장 4개 페이즈:**

| Phase | 내용 | 핵심 이유 |
|-------|------|-----------|
| 1 | Flyway V3 스키마 + R2DBC 도메인 모델 | 모든 것이 여기에 의존 |
| 2 | `GET /api/menus/my` + ADMIN 바이패스 + 권한 병합 서비스 | Core Value |
| 3 | `GET /api/menus` (ADMIN 전용) + SecurityConfig 업데이트 | Phase 2 완료 후 단순 추가 |
| 4 | Redis 캐싱 + 무효화 | 기능 정확성 검증 후 성능 최적화 |

---

## Phase-specific 추가 리서치 필요

- **Phase 1:** `R2dbcConfig`의 NamingStrategy(snake_case → camelCase) 설정 여부 확인 — 없으면 도메인 모델에 `@Column` 명시 필요
- **Phase 2:** 역할 미할당 사용자의 `IN (:roleIds)` 빈 리스트 동작 — 명시적 분기 검증 필요
- **Phase 4:** `RedisCacheUtil` 실제 API 확인 — 캐시 무효화 패턴 적용 전 래퍼 인터페이스 검토
