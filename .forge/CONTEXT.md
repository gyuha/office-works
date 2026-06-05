# 도메인 용어 사전 (CONTEXT)

> 프로젝트의 핵심 도메인 용어 정의. 구현 세부는 담지 않는다 — 용어의 의미만.

## 권한 체계의 두 가지 "역할(Role)"

이 시스템에는 "역할/권한"으로 불릴 수 있는 **서로 다른 두 개념**이 공존한다. 혼동하면 안 된다.

- **레거시 권한 (`users.role`)** — `USER` | `ADMIN` 단일 문자열. JWT claim에 실려 Spring Security의 `ROLE_ADMIN` authority로 변환되며, `@PreAuthorize("hasRole('ADMIN')")` 같은 **엔드포인트 접근 게이트**를 결정한다. ADMIN 판정의 source는 이것뿐이다(DB 재조회 없음).
- **RBAC 역할 (`roles` / `Role` 엔티티)** — 관리자가 자유롭게 정의하는 역할. **메뉴 접근 권한의 집합 단위**로만 작동하며, Spring Security authority에는 **영향을 주지 않는다**. 즉 `roles` 테이블에 "ADMIN"이라는 행을 만들어 사용자에게 부여해도 그 사용자가 `@PreAuthorize` ADMIN 게이트를 통과하지는 못한다.

→ "관리 API"의 ADMIN 게이트는 **레거시 권한**으로 작동하고, 그 API가 관리하는 대상은 **RBAC 역할/권한**이다. 둘을 합치는 것(이중 체계 정리)은 별개 작업이다.

## 메뉴 접근 권한 용어

- **역할별 메뉴 권한 (`role_menu_permissions`)** — 특정 RBAC 역할이 특정 메뉴에 대해 갖는 `canRead` / `canWrite`.
- **개인 메뉴 권한 오버라이드 (`user_menu_permissions`)** — 특정 사용자에게 직접 부여하는 메뉴 권한. 역할에서 파생된 권한 위에 덮어쓴다(개별 오버라이드).
- **유효 메뉴 권한** — 한 사용자의 (그가 가진 모든 RBAC 역할의 권한 합집합) ∪ (개인 오버라이드). `/api/menus/my`가 반환하는 값. ADMIN(레거시)이면 전체 활성 메뉴를 read/write 전부 true로 우회.
