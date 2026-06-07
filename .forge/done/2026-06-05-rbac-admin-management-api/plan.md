<!-- forge-slug: rbac-admin-management-api -->
<!-- task: 1 -->
<!-- priority: high -->
# RBAC 관리 API — 역할 CRUD · 사용자-역할 부여 · 역할별 메뉴 권한 설정 (ADMIN 전용)

## Goal / Non-goals
- **Goal**: RBAC 읽기 측(`/api/menus`, `/api/menus/my`)이 소비하는 데이터를 ADMIN이 실제로 구성할 수 있게 하는 백엔드 관리 API를 추가한다. 현재 권한을 설정할 수단이 없어 일반 사용자의 `/api/menus/my`는 항상 빈 배열 — RBAC 읽기 측이 사실상 죽은 코드인 상태를 살린다.
- **Non-goals**:
  - 이중 권한 체계 정리(`users.role` → RBAC 마이그레이션, ADMIN 판정 전환) — 별개 작업.
  - `@PreAuthorize` ADMIN 게이트는 기존대로 레거시 JWT `users.role` claim에 의존. 건드리지 않는다.
  - ④ 개인 메뉴 권한 오버라이드(`user_menu_permissions`) 관리 API — 후속 백로그.
  - ⑤ 메뉴(`menus`) CRUD — 메뉴는 V3 시드 데이터로 고정. 범위 밖.
  - 프론트엔드 연동(mock 인증 교체, RBAC UI) — 별개 작업.
  - 기존 `MenuController`의 `/api/menus` 경로 일탈(v1 누락) 수정 — 범위 밖, 그대로 둔다.

## Source of truth
- **Glossary terms**: `레거시 권한(users.role)`, `RBAC 역할(roles)`, `역할별 메뉴 권한`, `유효 메뉴 권한` in `.forge/CONTEXT.md`
- **Related ADRs**: `.forge/adr/0001-reactive-transactional-operator.md`
- **Definition of Done**: ADMIN 토큰으로 ① 역할을 생성/조회/수정/삭제하고 ② 사용자에게 역할 집합을 부여하고 ③ 역할별 메뉴 권한을 설정한 뒤, 해당 사용자의 `/api/menus/my`가 설정한 권한을 반영해 반환한다. 통합 테스트(IT)로 이 end-to-end 흐름이 검증되고 `./gradlew check`(JaCoCo 60% 포함)가 통과한다.

## 핵심 설계 결정 (그릴링 합의)
- **경로 네임스페이스**: `/api/v1/admin/...` (batch admin `/api/v1/admin/batch` 선례 + v1 관례). 전 엔드포인트 `@PreAuthorize("hasRole('ADMIN')")`.
- **갱신 시맨틱**: ②③ 모두 **전체 집합 PUT 교체**(통째로 받아 delete-then-insert). UNIQUE 제약(`uq_user_roles_user_role`, `uq_role_menu_permissions_role_menu`) 충돌을 교체로 회피.
- **트랜잭션**: delete-then-insert 원자성을 위해 주입한 `ReactiveTransactionManager`(Spring Boot 자동 구성됨)로 `TransactionalOperator`를 만들어 명시적으로 감싼다. `@Transactional`은 batch의 `PlatformTransactionManager`(`batchTransactionManager`)와의 한정자 모호성 때문에 쓰지 않는다.
- **역할 삭제**: `user_roles`에 부여된 사용자가 있으면 **차단**(409 + `ROLE_003`). FK `ON DELETE CASCADE`에 의존한 silent 삭제 금지. 삭제 전 명시적 회수 강제.
- **에러 코드**: 신규 `ROLE_001`(없음/404), `ROLE_002`(이름 중복/409), `ROLE_003`(사용 중 삭제 불가/409). 사용자 없음은 기존 `ACCOUNT_002`, 메뉴 없음은 `MENU_001` 재사용. `ErrorCode` enum에 ROLE 도메인 블록 추가 + i18n 메시지 키.
- **참조 무결성 사전 검증**: ②에서 userId(`AccountRepository.existsById`)·roleId 존재 검증, ③에서 roleId·menuId 존재 검증 후 write. FK 위반 DB 예외에 의존하지 않고 적절한 에러 코드로 변환.
- **관례 준수**: DTO는 Java record + 검증 애너테이션, 생성자 주입, `ApiResponse<T>` 래퍼, 리액티브 에러 처리(`switchIfEmpty(Mono.error(...))`). 엔티티는 수동 getter/setter(이미 존재).

## Work slices
- [ ] **S1. ROLE 에러 코드 + i18n 메시지 추가** — `ErrorCode` enum에 `ROLE_001/002/003` 추가, 메시지 properties에 한국어 키 추가. 완료 기준: enum과 메시지 번들에 세 코드가 존재하고 빌드 컴파일 통과.
- [ ] **S2. 역할 CRUD API (①)** — `POST/GET/GET{id}/PUT{id}/DELETE{id} /api/v1/admin/roles`. 생성/수정 시 이름 공백·중복 검증(`ROLE_002`), 조회 없음 `ROLE_001`, 삭제 시 `user_roles` 사용 여부 확인 후 사용 중이면 `ROLE_003` 차단. 완료 기준: ADMIN 토큰으로 5개 엔드포인트가 동작하고 중복 이름·없는 ID·사용 중 삭제가 각각 올바른 에러 코드를 반환(단위 + IT). (depends: S1)
- [ ] **S3. 사용자-역할 부여 API (②)** — `PUT /api/v1/admin/users/{userId}/roles` body `{roleIds:[...]}` 전체 집합 교체, `GET`으로 현재 역할 조회. userId·roleIds 존재 검증, `TransactionalOperator`로 delete-then-insert 원자화. 완료 기준: 역할 집합 PUT 후 GET이 동일 집합 반환, 없는 user/role은 `ACCOUNT_002`/`ROLE_001`, 트랜잭션 중간 실패 시 기존 배정 보존(IT). (depends: S1)
- [ ] **S4. 역할별 메뉴 권한 설정 API (③)** — `PUT /api/v1/admin/roles/{roleId}/menu-permissions` body `[{menuId,canRead,canWrite}]` 전체 집합 교체, `GET`으로 조회. roleId·menuId 존재 검증, `TransactionalOperator`로 원자화. 완료 기준: 권한 집합 PUT 후 GET 일치, 없는 role/menu는 `ROLE_001`/`MENU_001`(IT). (depends: S1)
- [ ] **S5. End-to-end 통합 테스트 + 커버리지** — ADMIN으로 역할 생성 → 사용자에 부여 → 메뉴 권한 설정 → 그 사용자 토큰으로 `/api/menus/my`가 설정 권한 반영 확인하는 IT. 완료 기준: E2E IT 통과 + `./gradlew check`(JaCoCo 60%) 통과. (depends: S2, S3, S4)
