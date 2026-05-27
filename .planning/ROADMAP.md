# 로드맵: 메뉴별 접근 권한 관리 (RBAC)

## 개요

기존 Spring Boot WebFlux 서버에 메뉴 단위 RBAC을 추가하는 3단계 작업. DB 스키마와 도메인 모델을 먼저 확립하고(Phase 1), Core Value인 "내 접근 가능 메뉴 목록 API"와 권한 병합 서비스를 구현한 후(Phase 2), ADMIN 전용 관리 API와 SecurityConfig 통합으로 마무리한다(Phase 3).

## Phases

**Phase 번호 규칙:**

- 정수 페이즈 (1, 2, 3): 계획된 마일스톤 작업
- 소수 페이즈 (2.1, 2.2): 긴급 삽입 (INSERTED 표기)

- [ ] **Phase 1: DB 스키마 + 도메인 모델** - Flyway V3 마이그레이션 5개 테이블 + R2DBC 엔티티/리포지토리 5개
- [ ] **Phase 2: 권한 서비스 + 핵심 API** - ADMIN 바이패스·역할·오버라이드 병합 서비스 + GET /api/menus/my
- [ ] **Phase 3: ADMIN API + Security 통합** - GET /api/menus (ADMIN 전용) + SecurityConfig 경로 등록 + 403 처리

## Phase Details

### Phase 1: DB 스키마 + 도메인 모델

**Goal**: 메뉴 RBAC을 위한 DB 스키마와 Java 도메인 레이어가 존재한다
**Depends on**: 없음 (첫 번째 페이즈)
**Requirements**: SCH-01, SCH-02, SCH-03, SCH-04, SCH-05, SCH-06, DOM-01, DOM-02, DOM-03, DOM-04, DOM-05
**Success Criteria** (what must be TRUE):

  1. Flyway가 V3 마이그레이션을 실행하면 menus, roles, user_roles, role_menu_permissions, user_menu_permissions 테이블이 생성된다
  2. 초기 샘플 메뉴 데이터가 menus 테이블에 INSERT된다
  3. 각 테이블에 대응하는 R2DBC 엔티티(Menu, Role, UserRole, RoleMenuPermission, UserMenuPermission)가 컴파일된다
  4. 각 리포지토리를 통해 Reactive 방식으로 (Mono/Flux) 기본 조회가 실행된다
  5. 기존 V1/V2 마이그레이션 파일은 변경되지 않는다

**Plans**: 2 plansPlans:

- [ ] 01-01-PLAN.md — Flyway V3 마이그레이션 SQL (5개 테이블 DDL + 초기 메뉴 INSERT)
- [ ] 01-02-PLAN.md — R2DBC 엔티티 5개 + 리포지토리 5개 (menu 도메인 레이어)

### Phase 2: 권한 서비스 + 핵심 API

**Goal**: 인증된 사용자가 자신의 접근 가능한 메뉴 목록을 API로 받을 수 있다
**Depends on**: Phase 1
**Requirements**: DOM-06, DOM-07, API-01, SEC-01
**Success Criteria** (what must be TRUE):

  1. GET /api/menus/my 호출 시 menuId, code, name, canRead, canWrite 필드를 포함한 목록을 반환한다
  2. users.role = 'ADMIN'인 사용자는 DB 권한 테이블 조회 없이 모든 메뉴를 canRead=true, canWrite=true로 받는다
  3. 일반 USER는 역할 권한(role_menu_permissions)과 개인 오버라이드(user_menu_permissions)가 병합된 결과를 받는다
  4. 역할 미할당 사용자가 GET /api/menus/my를 호출하면 빈 배열([])을 반환한다 (500 아님)
  5. 미인증 요청은 401을 반환한다

**Plans**: TBD

### Phase 3: ADMIN API + Security 통합

**Goal**: ADMIN 전용 전체 메뉴 조회 API가 동작하고, 모든 /api/menus/** 경로에 인증이 적용된다
**Depends on**: Phase 2
**Requirements**: API-02, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):

  1. ADMIN 토큰으로 GET /api/menus를 호출하면 전체 메뉴 목록을 반환한다
  2. USER 토큰으로 GET /api/menus를 호출하면 403 Forbidden을 반환한다
  3. 미인증 요청으로 /api/menus/** 에 접근하면 401을 반환한다
  4. JwtAuthenticationFilter는 변경되지 않는다

**Plans**: TBD

## Progress

**실행 순서:** 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DB 스키마 + 도메인 모델 | 0/2 | Not started | - |
| 2. 권한 서비스 + 핵심 API | 0/TBD | Not started | - |
| 3. ADMIN API + Security 통합 | 0/TBD | Not started | - |
