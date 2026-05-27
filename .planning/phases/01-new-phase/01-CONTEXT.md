# Phase 1: DB 스키마 + 도메인 모델 - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Flyway V3 마이그레이션으로 RBAC 5개 테이블 생성 + 초기 메뉴 데이터 INSERT,
그에 대응하는 R2DBC 엔티티 5개 + 리포지토리 5개를 Java 도메인 레이어에 구현한다.

**포함:** menus, roles, user_roles, role_menu_permissions, user_menu_permissions 테이블 / Menu, Role, UserRole, RoleMenuPermission, UserMenuPermission 엔티티 및 리포지토리
**제외:** 권한 병합 서비스 로직, API 엔드포인트, SecurityConfig 변경 (Phase 2~3)

</domain>

<decisions>
## Implementation Decisions

### R2DBC NamingStrategy / @Column 명시 여부
- **D-01:** `@Column` 어노테이션 명시 불필요. `R2dbcConfig`에 NamingStrategy 설정이 없음에도 기존 `Account` 엔티티(`emailVerified`, `profileImageUrl`, `createdAt` 등)가 `@Column` 없이 정상 동작 중임을 확인 — Spring Data R2DBC 기본 `DefaultNamingStrategy`가 camelCase↔snake_case 변환을 자동 처리한다.
- **D-02:** 5개 엔티티 모두 기존 `Account` 엔티티 패턴 그대로 따른다 (`@Table`, `@Id`, `@CreatedDate`, 수동 getter/setter, Lombok 없음).

### 복합 PK 엔티티 설계
- **D-03:** `user_roles`, `role_menu_permissions`, `user_menu_permissions` 3개 테이블 모두 **서로게이트 PK** 방식 채택. DB에 `id BIGSERIAL PRIMARY KEY` 추가, 복합 유니크 제약(`UNIQUE(user_id, role_id)` 등)으로 중복 방지. R2DBC `@PrimaryKeyClass` 복합 PK는 사용하지 않는다.
- **D-04 [informational]:** REQUIREMENTS.md의 "복합 PK" 원안 대신 서로게이트 PK를 선택한 이유: Phase 2 `MenuPermissionService`의 리포지토리 조회(`findBy...`)만 필요하고 INSERT는 SQL로 직접 처리 — R2DBC 복합 PK의 `isNew()` 구현 부담 대비 실익 없음.

### 타임스탬프 타입
- **D-05:** V3 마이그레이션부터 **`TIMESTAMPTZ`** 사용. Java 엔티티 필드 타입은 `OffsetDateTime`.
- **D-06 [informational]:** 기존 V1/V2는 `TIMESTAMP`(timezone 없음) — 혼용 발생. Research 결과: r2dbc-postgresql은 `TIMESTAMPTZ` ↔ `OffsetDateTime` 기본 매핑 지원, `R2dbcCustomConversions` Bean 추가 불필요.
- **D-07:** V1/V2 파일은 절대 수정하지 않는다 (Flyway 원칙).

### 초기 샘플 메뉴 데이터 (SCH-06)
- **D-08:** 실제 서비스 메뉴 7개를 V3 마이그레이션에 INSERT. 항목은 `web/src/sample/layout/navigation.ts`의 `sampleNavItems` 기준:

  | display_order | code | name | is_active |
  |---|---|---|---|
  | 1 | DASHBOARD | 대시보드 | true |
  | 2 | USERS | 사용자 | true |
  | 3 | TASKS | 작업 | true |
  | 4 | APPS | 앱 | true |
  | 5 | CHATS | 채팅 | true |
  | 6 | SETTINGS | 설정 | true |
  | 7 | HELP_CENTER | 도움말 센터 | true |

- **D-09:** `code` 컬럼값은 UPPER_SNAKE_CASE 문자열 (예: `'DASHBOARD'`). 이후 API에서 프론트엔드와 매핑하는 키로 사용된다.

### Claude's Discretion
- 리포지토리 커스텀 쿼리 메서드명: Spring Data 명명 규칙 (`findByUserId`, `findByRoleId`, `findByMenuId` 등) — 별도 지시 없음, 기존 패턴 따름.
- 엔티티 패키지 위치: `com.example.bootstrap.menu.domain.model` (새 `menu` 도메인 패키지) — 기존 도메인 분리 패턴 따름.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 엔티티 패턴 참조
- `api/src/main/java/com/example/bootstrap/account/domain/model/Account.java` — R2DBC 엔티티 작성 기준 패턴 (`@Table`, `@Id`, `@CreatedDate`, `@LastModifiedDate`, 수동 getter/setter)
- `api/src/main/java/com/example/bootstrap/global/config/R2dbcConfig.java` — NamingStrategy 미설정 확인, `@EnableR2dbcAuditing` 위치

### DB 마이그레이션 참조
- `api/src/main/resources/db/migration/V1__init.sql` — 기존 테이블 스타일, 코멘트 패턴, 인덱스 작성 방식
- `api/src/main/resources/db/migration/V2__batch_schema.sql` — V3 파일명 결정 기준 (다음 번호 = V3)

### 요구사항
- `.planning/REQUIREMENTS.md` — SCH-01~06, DOM-01~05 요구사항 전체
- `.planning/ROADMAP.md` — Phase 1 Success Criteria (5개 기준)
- `.planning/PROJECT.md` — 제약사항: V1/V2 수정 금지, WebFlux+R2DBC Reactive 필수, ADMIN bypass 방식

### 실제 메뉴 구조
- `web/src/sample/layout/navigation.ts` — `sampleNavItems` 배열: 실제 7개 메뉴 코드/이름 원본
- `web/src/sample/i18n/locales/ko/sample.json` — 한국어 메뉴 이름 원본

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Account.java` 엔티티: `@Table`, `@Id`, `@CreatedDate`, `@LastModifiedDate`, 수동 getter/setter 패턴 — 5개 새 엔티티 모두 이 패턴 복사
- `AccountRepository.java`: `ReactiveCrudRepository<Account, Long>` 확장 패턴 — 5개 리포지토리 동일하게 `ReactiveCrudRepository<Entity, Long>` 확장

### Established Patterns
- **NamingStrategy:** `R2dbcConfig`에 명시적 설정 없음 → 기본 snake_case 자동 변환 동작 확인됨. `user_id` → `userId`, `is_active` → `isActive`, `can_read` → `canRead` 모두 자동 매핑.
- **Auditing:** `@EnableR2dbcAuditing` 활성화됨 → `@CreatedDate`/`@LastModifiedDate` 자동 채움 동작.
- **Flyway:** V1, V2 존재 → 신규 파일은 반드시 `V3__` 접두사. V1/V2 절대 수정 금지.
- **타임스탬프 혼용:** V1/V2는 `TIMESTAMP`, V3는 `TIMESTAMPTZ` — R2DBC 코덱 설정 확인 필요 (Researcher 과제).

### Integration Points
- 신규 `menu` 도메인 패키지: `com.example.bootstrap.menu.{controller|application|domain|infrastructure}` 구조로 생성 (기존 `account`, `ai`, `batch` 도메인과 동일 레이어 패턴)
- `@EnableR2dbcRepositories(basePackages = "com.example.bootstrap")` 이미 전체 패키지 스캔 중 → 별도 설정 추가 불필요
- Phase 2에서 `MenuPermissionService`가 이 리포지토리들을 `findByUserId()`, `findByRoleId()` 등으로 조회할 예정

</code_context>

<specifics>
## Specific Ideas

- 초기 메뉴 INSERT: `web/src/sample/layout/navigation.ts`의 `sampleNavItems` 순서/이름 그대로 반영. `code`는 UPPER_SNAKE_CASE 변환 (`helpCenter` → `HELP_CENTER`).
- 서로게이트 PK + UNIQUE 제약 패턴: `UNIQUE(user_id, role_id)`, `UNIQUE(role_id, menu_id)`, `UNIQUE(user_id, menu_id)` 각각 적용.

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 Phase 1 스코프 내에서만 진행됨.

</deferred>

---

*Phase: 1-DB 스키마 + 도메인 모델*
*Context gathered: 2026-05-27*
