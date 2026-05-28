# 메뉴별 접근 권한 관리 (RBAC)

## What This Is

Spring Boot WebFlux 기반 API 서버에 메뉴별 접근 제어(RBAC)를 추가하는 작업입니다.
기존 `users.role(USER|ADMIN)` 구조를 유지하면서, 메뉴 단위로 역할/사용자별 READ/WRITE 권한을 부여할 수 있는 스키마와 API를 구축합니다.
ADMIN 역할은 권한 설정 여부와 무관하게 모든 메뉴에 항상 접근 가능합니다.

## Core Value

사용자가 접근 가능한 메뉴 목록을 API로 정확히 내려주는 것 — 이것이 올바르게 동작하지 않으면 나머지는 의미 없음.

## Requirements

### Validated

- ✓ JWT 기반 인증 (ACCESS + REFRESH Token Rotation) — 기존
- ✓ 소셜 로그인 (Google, Kakao OAuth2) — 기존
- ✓ users.role 이분법 (USER | ADMIN) — 기존

### Active

없음 — v1.0 요구사항 전체 완료.

### v1.0에서 Validated로 이동 (2026-05-29)

- ✓ menus 테이블: 메뉴 ID, 코드, 이름, 정렬 순서, 활성화 여부 — v1.0 Phase 1
- ✓ roles 테이블: 커스텀 역할 정의 — v1.0 Phase 1
- ✓ user_roles 테이블: 사용자-역할 다대다 매핑 — v1.0 Phase 1
- ✓ role_menu_permissions 테이블: 역할별 메뉴 READ/WRITE 권한 — v1.0 Phase 1
- ✓ user_menu_permissions 테이블: 사용자 개별 메뉴 READ/WRITE 오버라이드 — v1.0 Phase 1
- ✓ ADMIN은 모든 메뉴 접근 (권한 테이블 조회 불필요) — v1.0 Phase 2
- ✓ Flyway 마이그레이션 파일 (V3__) — v1.0 Phase 1
- ✓ R2DBC 도메인 모델 (Menu, Role, UserRole, RoleMenuPermission, UserMenuPermission) — v1.0 Phase 1
- ✓ 내 접근 가능 메뉴 목록 API (`GET /api/menus/my`) — v1.0 Phase 2
- ✓ 메뉴 전체 디렉토리 API (`GET /api/menus` — ADMIN 전용) — v1.0 Phase 3
- ✓ SecurityConfig에 메뉴 권한 체크 통합 + 403 AccessDeniedHandler — v1.0 Phase 3

### Out of Scope

- 메뉴 트리(계층) 구조 — 이번 범위는 flat 구조만. 필요 시 parent_id 컬럼 추가로 확장 가능
- 프론트엔드 UI 관리 페이지 — 백엔드 API만
- 메뉴 CRUD 관리 API (생성/수정/삭제) — 초기값은 SQL로 직접 삽입

## Context

- API: Spring Boot 3.x, WebFlux (Reactive), R2DBC, PostgreSQL, Flyway
- 현재 시큐리티: `JwtAuthenticationFilter` → `SecurityContext` 세팅, `SecurityConfig`에서 path 기반 role 체크
- `@EnableReactiveMethodSecurity` 활성화 상태 — 메서드 레벨 `@PreAuthorize` 사용 가능
- 기존 DB 마이그레이션: V1 (초기 스키마), V2 (Batch 스키마)
- 도메인 패키지 구조: `{domain}/controller → application/service → domain/model + repository → infrastructure`

## Constraints

- **Tech Stack**: WebFlux + R2DBC — 모든 DB 접근은 Reactive (`Mono`/`Flux`)로 구현
- **Compatibility**: 기존 `users.role` 컬럼 유지 — 레거시 코드 브레이킹 체인지 없음
- **ADMIN 예외**: `users.role = 'ADMIN'`이면 모든 메뉴 접근 허용 (권한 DB 조회 스킵)
- **Migration**: Flyway V3__ 으로 추가 (V1, V2 절대 수정 금지)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| users.role 유지 + roles 테이블 병행 | 기존 코드 브레이킹 없이 확장 | ✓ Good — V3 마이그레이션으로 병행 구현 |
| READ/WRITE 권한 분리 | 조회는 허용하되 수정은 제한하는 케이스 지원 | ✓ Good — canRead/canWrite 필드로 구현 |
| ADMIN 권한 테이블 바이패스 | 관리자는 설정 실수로 잠기면 안 됨 | ✓ Good — JWT authorities ROLE_ADMIN 클레임으로 판정 |
| user_menu_permissions 오버라이드 | 역할 기반 + 개인 예외 처리 동시 지원 | ✓ Good — COALESCE 방식으로 양방향 오버라이드 |
| @PreAuthorize WebFlux 예외 경로 | Spring Security WebFlux 동작 특성 | ✓ 확인 — ExceptionTranslationWebFilter가 아닌 ControllerAdvice로 전파 |
| Java record Boolean @JsonProperty | Jackson 직렬화 규칙 | ✓ 확인 — isActive() getter 패턴은 @JsonProperty 필수 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

## Current State (v1.0)

v1.0 — 메뉴별 접근 권한 관리 (RBAC) 완료.

- Spring Boot WebFlux + R2DBC + PostgreSQL
- 5개 RBAC 테이블 (Flyway V3), 5개 R2DBC 엔티티
- GET /api/menus/my — 개인 접근 가능 메뉴 (역할 OR 집계 + 개인 오버라이드)
- GET /api/menus — ADMIN 전용 전체 메뉴 (@PreAuthorize)
- ApiAccessDeniedHandler — 403 ApiResponse envelope 처리
- 단위 테스트 8개 + 통합 테스트 6개 (JaCoCo 60% 충족)

---
*Last updated: 2026-05-29 after v1.0 milestone*
