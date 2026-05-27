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

- [ ] menus 테이블: 메뉴 ID, 코드, 이름, 정렬 순서, 활성화 여부
- [ ] roles 테이블: 커스텀 역할 정의 (USER/ADMIN 외 추가 역할)
- [ ] user_roles 테이블: 사용자-역할 다대다 매핑
- [ ] role_menu_permissions 테이블: 역할별 메뉴 READ/WRITE 권한
- [ ] user_menu_permissions 테이블: 사용자 개별 메뉴 READ/WRITE 오버라이드
- [ ] ADMIN은 모든 메뉴 접근 (권한 테이블 조회 불필요)
- [ ] Flyway 마이그레이션 파일 (V3__)
- [ ] R2DBC 도메인 모델 (Menu, Role, UserRole, RoleMenuPermission, UserMenuPermission)
- [ ] 내 접근 가능 메뉴 목록 API (`GET /api/menus/my`)
- [ ] 메뉴 전체 디렉토리 API (`GET /api/menus` — ADMIN 전용)
- [ ] SecurityConfig에 메뉴 권한 체크 통합

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
| users.role 유지 + roles 테이블 병행 | 기존 코드 브레이킹 없이 확장 | — Pending |
| READ/WRITE 권한 분리 | 조회는 허용하되 수정은 제한하는 케이스 지원 | — Pending |
| ADMIN 권한 테이블 바이패스 | 관리자는 설정 실수로 잠기면 안 됨 | — Pending |
| user_menu_permissions 오버라이드 | 역할 기반 + 개인 예외 처리 동시 지원 | — Pending |

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

---
*Last updated: 2026-05-27 after initialization*
