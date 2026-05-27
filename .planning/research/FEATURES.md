# Feature Landscape

**Domain:** 메뉴 기반 RBAC (Spring Boot WebFlux)
**Researched:** 2026-05-27
**Confidence:** HIGH (Spring Security 공식 문서 검증 완료)

---

## Table Stakes

시스템이 동작한다고 말하려면 반드시 있어야 하는 것들. 하나라도 빠지면 RBAC이 아니다.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| ADMIN 바이패스 | 관리자가 권한 설정 실수로 잠기면 운영 불가 | Low | `users.role = 'ADMIN'` 조건 분기, DB 조회 스킵 |
| 역할-메뉴 권한 테이블 | 역할 단위로 메뉴 접근을 정의하는 것이 RBAC의 본질 | Medium | `role_menu_permissions(role_id, menu_id, can_read, can_write)` |
| 사용자-역할 매핑 | 사용자에게 역할을 부여해야 권한이 작동 | Low | `user_roles(user_id, role_id)` 다대다 |
| 사용자 개별 오버라이드 | 역할로 커버 안 되는 예외 케이스가 반드시 존재 | Medium | `user_menu_permissions`로 역할 권한을 덮어씀 |
| 내 접근 가능 메뉴 조회 API | 클라이언트가 메뉴를 렌더링하려면 이 API가 필수 | Medium | `GET /api/menus/my` — 핵심 가치 |
| 권한 없는 접근 시 403 반환 | 없으면 보안 구멍 | Low | Spring Security `AccessDeniedException` → `GlobalExceptionHandler` |
| 권한 해석 우선순위 확정 | user_override > role_permission 순서 미정의 시 버그 발생 | Low | user 개별 설정이 role 설정을 항상 덮어씀 |
| Flyway V3 마이그레이션 | 스키마 없이는 아무것도 없음 | Low | V1, V2 절대 수정 금지 |
| R2DBC 도메인 모델 | WebFlux 전 계층 Reactive 요구사항 | Medium | `Menu`, `Role`, `UserRole`, `RoleMenuPermission`, `UserMenuPermission` |
| ADMIN 전용 메뉴 목록 API | 관리자가 전체 메뉴+역할 구성을 봐야 관리 가능 | Low | `GET /api/menus` — ADMIN role 검사 |

---

## 권한 해석 알고리즘 (Table Stakes 상세)

권한 확인 로직은 반드시 이 순서를 따른다:

```
1. users.role = 'ADMIN' → 즉시 허용 (DB 조회 없음)
2. user_menu_permissions에 해당 사용자+메뉴 레코드 존재 → 그 값 사용 (override)
3. user_roles로 사용자의 역할 목록 조회 → role_menu_permissions에서 권한 집계
4. 어느 역할이든 can_read=true이면 READ 허용 (additive model)
5. 모두 없음 → 거부
```

이 순서가 코드와 문서에 명시되지 않으면 나중에 버그 원인을 찾는 데 시간을 낭비한다.

---

## Differentiators

없어도 시스템은 돌아가지만, 있으면 production 품질이 된다.

| Feature | Value Proposition | Complexity | Priority |
|---------|-------------------|------------|----------|
| Redis 권한 캐싱 | 매 요청마다 4-테이블 JOIN을 하면 p99 레이턴시 급등. `RedisCacheUtil`이 이미 존재하므로 통합 비용 낮음 | Medium | **High** — WebFlux 이벤트루프에서 DB round-trip 최소화 필수 |
| 캐시 무효화 | 권한 변경 시 캐시가 남아있으면 변경이 즉시 반영 안 됨 | Low | **High** — Redis 캐싱을 하면 세트로 필요 |
| 권한 변경 감사 로그 | 누가 언제 어떤 메뉴 권한을 바꿨는지 추적 | High | Medium — v1에서는 DB 레코드 자체가 감사 증거 |
| `GET /api/menus/my` 응답에 권한 수준 포함 | 프론트엔드가 READ/WRITE 여부에 따라 버튼 렌더링 결정 가능 | Low | **High** — 응답 구조 설계 시 처음부터 포함해야 나중에 안 깨짐 |
| 메뉴 활성화 플래그 필터링 | `menus.is_active = false` 메뉴는 내 목록에서 자동 제외 | Low | High — `menus` 테이블에 `is_active` 컬럼을 넣으면 자연스럽게 따라옴 |
| `@PreAuthorize` SpEL 커스텀 표현식 | 서비스 메서드 레벨에서 `@PreAuthorize("@menuPermissionService.canRead(authentication, 'MENU_CODE')")` 선언형 보안 | Medium | Medium — `@EnableReactiveMethodSecurity`가 이미 활성화되어 있어서 통합 비용 낮음 |

### Redis 캐싱 전략 (구체적)

```
캐시 키: "menu-perms:{userId}"
캐시 값: Map<menuId, {canRead, canWrite}>
TTL: 5분 (짧게 — 권한 변경 반영 지연 최소화)
무효화: user_menu_permissions 또는 user_roles 변경 시 해당 userId 키 삭제
```

기존 `RedisCacheUtil`(ReactiveRedisTemplate 래퍼)을 재사용. 새 캐시 인프라 불필요.

---

## Anti-Features

v1에서 의도적으로 **빌드하지 않을 것들**. 이것들을 넣으면 납기를 놓치거나 코드가 복잡해진다.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 메뉴 계층(트리) 구조 | parent_id + 재귀 쿼리 + 권한 상속 전파 로직이 복잡도를 3배 높임 | Flat 구조로 시작, `parent_id` 컬럼은 nullable로 예약만 해두고 쿼리에서 무시 |
| 메뉴 CRUD 관리 API | `POST /api/menus`, `PUT /api/menus/{id}` 등을 지금 만들면 유효성 검증·정렬 관리 등 부수적 작업 폭증 | 초기값 SQL INSERT, 변경은 DBA 직접 처리 |
| 권한 부여 UI / 관리 화면 | 프론트엔드 페이지 구현은 백엔드 API 안정화 후 별도 단계 | `GET /api/admin/roles`, `PUT /api/admin/roles/{id}/menus` 등 ADMIN API만 먼저 |
| 역할 계층(role hierarchy) | "슈퍼매니저는 매니저 권한 상속" 같은 구조는 권한 전파 버그의 온상 | 역할은 항상 flat. 필요하면 동일 사용자에게 여러 역할 부여 |
| 시간 기반 권한 (TTL permission) | "이 사용자는 내일까지만 WRITE 가능" 같은 기능은 만료 체크 + 스케줄러 + 알림까지 딸려옴 | 권한 변경은 수동 운영 |
| Permission 부정 표현 (deny 규칙) | `can_read = false`를 명시적 거부로 쓰면 해석 로직이 폭발적으로 복잡해짐 | NULL = 권한 없음, TRUE = 허용만으로 단순화. 레코드 없음 = 거부 |
| 다중 테넌트(multi-tenant) RBAC | 테넌트별 역할 격리는 스키마 변경 범위가 완전히 다름 | 단일 조직 기준으로 설계 |

---

## API 설계 패턴

### 권한 조회 엔드포인트

```
GET /api/menus/my
  → Authorization: Bearer {token}
  → Response: List<MenuPermissionResponse>
     {
       "menuId": 1,
       "menuCode": "DASHBOARD",
       "menuName": "대시보드",
       "sortOrder": 1,
       "canRead": true,
       "canWrite": false
     }

GET /api/menus
  → ADMIN 전용
  → Response: 전체 메뉴 목록 (권한 정보 없음, 메뉴 디렉토리)
```

`GET /api/menus/my`는 권한 없는 메뉴를 응답에서 아예 제외한다. WRITE 불가 메뉴도 READ가 있으면 포함한다. 프론트엔드는 `canWrite` 필드로 수정 버튼 렌더링을 결정한다.

### 권한 체크 통합 패턴 (Spring Security)

현재 아키텍처(`@EnableReactiveMethodSecurity` 활성화 상태)에서 두 가지 옵션이 있다:

**Option A — 서비스 레벨 SpEL (권장):**
```java
@PreAuthorize("@menuPermissionService.hasReadPermission(authentication, 'MENU_CODE')")
public Mono<SomeData> getSomeData(...) { ... }
```
- `menuPermissionService.hasReadPermission()`이 Redis 캐시 → DB fallback으로 권한 확인
- 선언형, 테스트 용이

**Option B — 서비스 내부 명시적 체크:**
```java
return menuPermissionService.checkReadPermission(userId, menuCode)
    .then(actualBusinessLogic());
```
- 더 명시적, 리액티브 체인에 자연스럽게 통합
- SpEL 표현식 없이도 동작

둘 중 하나를 선택하고 일관되게 쓸 것. 혼용 금지.

---

## Feature Dependencies

```
Flyway V3 스키마
  → R2DBC 도메인 모델 (Menu, Role, UserRole, RoleMenuPermission, UserMenuPermission)
    → MenuPermissionService (권한 집계 로직)
      → Redis 캐싱 (선택, 성능)
      → GET /api/menus/my (핵심 API)
      → GET /api/menus (ADMIN API)
      → @PreAuthorize 통합 (선택, 선언형 보안)

users.role ADMIN 체크
  → SecurityConfig 또는 MenuPermissionService 최상단 분기
```

---

## MVP Recommendation

v1에서 반드시 포함:
1. Flyway V3 스키마 (5개 테이블)
2. R2DBC 도메인 모델 + Repository
3. 권한 해석 알고리즘 (user override > role 집계 > 거부)
4. `GET /api/menus/my` — can_read/can_write 포함한 응답
5. `GET /api/menus` — ADMIN 전용 전체 목록
6. ADMIN 바이패스 (권한 DB 조회 스킵)
7. `GET /api/menus/my` 응답 Redis 캐싱 + 권한 변경 시 캐시 무효화

v1에서 제외 (명시적 결정):
- 메뉴 CRUD API: SQL 직접 삽입으로 충분
- 감사 로그: DB 레코드가 감사 증거 역할
- SpEL `@PreAuthorize` 통합: 서비스 레벨 명시적 체크로 시작
- 메뉴 트리: flat 구조로 시작

---

## Sources

- Spring Security 6.5 공식 문서 — ReactiveAuthorizationManager, `@PreAuthorize`, `@EnableReactiveMethodSecurity`: https://docs.spring.io/spring-security/reference/6.5/reactive/authorization/method.html
- RBAC 권한 해석 패턴 (additive model): https://learn.microsoft.com/en-us/azure/role-based-access-control/overview
- Redis 권한 캐싱 전략: https://oneuptime.com/blog/post/2026-01-21-redis-user-permissions/view
- RBAC 감사 로그 패턴: https://oneuptime.com/blog/post/2026-02-09-rbac-audit-logging-permissions/view
- RBAC 예외(override) 설계 원칙: https://www.osohq.com/learn/rbac-best-practices
