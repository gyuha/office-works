# Requirements — 메뉴별 접근 권한 관리 (RBAC)

## v1 Requirements

### Schema (DB 스키마)

- [ ] **SCH-01**: Flyway V3 마이그레이션 파일에 `menus` 테이블 생성 (id, code, name, display_order, is_active)
- [ ] **SCH-02**: Flyway V3 마이그레이션 파일에 `roles` 테이블 생성 (id, name, description, created_at)
- [ ] **SCH-03**: Flyway V3 마이그레이션 파일에 `user_roles` 테이블 생성 (user_id FK, role_id FK, 복합 PK)
- [ ] **SCH-04**: Flyway V3 마이그레이션 파일에 `role_menu_permissions` 테이블 생성 (role_id FK, menu_id FK, can_read, can_write)
- [ ] **SCH-05**: Flyway V3 마이그레이션 파일에 `user_menu_permissions` 테이블 생성 (user_id FK, menu_id FK, can_read, can_write)
- [ ] **SCH-06**: 초기 샘플 메뉴 데이터 SQL INSERT 포함

### Domain (Java 도메인 모델)

- [ ] **DOM-01**: `Menu` R2DBC 엔티티 + `MenuRepository` (메뉴 전체 조회)
- [ ] **DOM-02**: `Role` R2DBC 엔티티 + `RoleRepository` (사용자 역할 조회)
- [ ] **DOM-03**: `UserRole` R2DBC 엔티티 + `UserRoleRepository` (사용자-역할 매핑 조회)
- [ ] **DOM-04**: `RoleMenuPermission` R2DBC 엔티티 + `RoleMenuPermissionRepository` (역할별 메뉴 권한 조회)
- [ ] **DOM-05**: `UserMenuPermission` R2DBC 엔티티 + `UserMenuPermissionRepository` (개인 오버라이드 조회)
- [ ] **DOM-06**: `MenuPermissionService` — ADMIN 바이패스 + 역할 권한 집계(additive) + 사용자 오버라이드(COALESCE) 병합 로직 (`Mono.zip()` 병렬 쿼리)
- [ ] **DOM-07**: `MenuAuthorizationBean` — `@PreAuthorize` SpEL에서 호출할 수 있는 `Mono<Boolean>` 반환 빈

### API (엔드포인트)

- [ ] **API-01**: `GET /api/menus/my` — 인증된 사용자가 접근 가능한 메뉴 목록 반환 (menuId, code, name, canRead, canWrite 포함)
- [ ] **API-02**: `GET /api/menus` — 전체 메뉴 목록 반환 (ADMIN 전용, 비권한자 403)

### Security (권한 체크 통합)

- [ ] **SEC-01**: `ADMIN` 역할(`users.role = 'ADMIN'`) 보유 시 `GET /api/menus/my`에서 모든 메뉴를 canRead=true, canWrite=true로 반환
- [ ] **SEC-02**: `GET /api/menus` 엔드포인트에 `@PreAuthorize("hasRole('ADMIN')")` 적용
- [ ] **SEC-03**: SecurityConfig에 `/api/menus/**` 경로 인증 요구 등록
- [ ] **SEC-04**: 권한 없는 메뉴 요청 시 403 Forbidden 응답

---

## v2 Requirements (다음 마일스톤)

- Redis 캐싱 (`menu-perms:{userId}`) + 권한 변경 시 캐시 무효화
- 메뉴 권한 감사 로그

---

## Out of Scope

- **메뉴 트리/계층 구조** — flat 구조로 충분. 필요 시 parent_id 컬럼 추가로 확장 가능
- **메뉴 CRUD 관리 API** — 초기 메뉴는 SQL INSERT로 직접 삽입
- **관리자 UI 페이지** — 백엔드 API만
- **역할 계층/상속** — 추가 복잡도 대비 현재 요구사항에서 불필요
- **deny 규칙** — additive 모델로 충분. deny는 별도 우선순위 로직 필요

---

## Traceability

| REQ-ID | Phase |
|--------|-------|
| SCH-01 ~ SCH-06 | Phase 1 |
| DOM-01 ~ DOM-07 | Phase 1 |
| API-01 | Phase 2 |
| API-02 | Phase 3 |
| SEC-01 ~ SEC-02 | Phase 2 |
| SEC-03 ~ SEC-04 | Phase 3 |
