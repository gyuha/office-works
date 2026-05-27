# Phase 1: DB 스키마 + 도메인 모델 - Research

**작성일:** 2026-05-27
**도메인:** Flyway SQL 마이그레이션 + Spring Data R2DBC 엔티티/리포지토리
**신뢰도:** HIGH

---

<user_constraints>
## User Constraints (CONTEXT.md 기준)

### 잠긴 결정 (Locked Decisions)

**D-01:** `@Column` 어노테이션 명시 불필요. `R2dbcConfig`에 NamingStrategy 설정이 없음에도 기존 `Account` 엔티티가 `@Column` 없이 정상 동작 중임을 확인 — Spring Data R2DBC 기본 `DefaultNamingStrategy`가 camelCase↔snake_case 변환을 자동 처리한다.

**D-02:** 5개 엔티티 모두 기존 `Account` 엔티티 패턴 그대로 따른다 (`@Table`, `@Id`, `@CreatedDate`, 수동 getter/setter, Lombok 없음).

**D-03:** `user_roles`, `role_menu_permissions`, `user_menu_permissions` 3개 테이블 모두 **서로게이트 PK** 방식 채택. DB에 `id BIGSERIAL PRIMARY KEY` 추가, 복합 유니크 제약으로 중복 방지. R2DBC `@PrimaryKeyClass` 복합 PK는 사용하지 않는다.

**D-04:** REQUIREMENTS.md의 "복합 PK" 원안 대신 서로게이트 PK를 선택한 이유: Phase 2 `MenuPermissionService`의 리포지토리 조회만 필요하고 INSERT는 SQL로 직접 처리 — R2DBC 복합 PK의 `isNew()` 구현 부담 대비 실익 없음.

**D-05:** V3 마이그레이션부터 **`TIMESTAMPTZ`** 사용. Java 엔티티 필드 타입은 `OffsetDateTime`.

**D-06:** 기존 V1/V2는 `TIMESTAMP`(timezone 없음) — 혼용 발생. R2DBC의 `TIMESTAMPTZ` ↔ `OffsetDateTime` 코덱 설정 필요 여부 확인 과제 (→ 아래 Research에서 해결됨).

**D-07:** V1/V2 파일은 절대 수정하지 않는다 (Flyway 원칙).

**D-08:** 실제 서비스 메뉴 7개를 V3 마이그레이션에 INSERT. `sampleNavItems` 기준.

**D-09:** `code` 컬럼값은 UPPER_SNAKE_CASE 문자열 (예: `'DASHBOARD'`).

### Claude's Discretion

- 리포지토리 커스텀 쿼리 메서드명: Spring Data 명명 규칙 (`findByUserId`, `findByRoleId`, `findByMenuId` 등)
- 엔티티 패키지 위치: `com.example.bootstrap.menu.domain.model`

### 지연된 아이디어 (OUT OF SCOPE)

없음 — 논의가 Phase 1 스코프 내에서만 진행됨.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | 설명 | Research 지원 |
|----|------|---------------|
| SCH-01 | `menus` 테이블 생성 (id, code, name, display_order, is_active) | V1 스타일 참조, BIGSERIAL PK 패턴 확인 |
| SCH-02 | `roles` 테이블 생성 (id, name, description, created_at) | TIMESTAMPTZ 적용, V1 COMMENT 패턴 |
| SCH-03 | `user_roles` 테이블 생성 (서로게이트 PK + UNIQUE(user_id, role_id)) | D-03 서로게이트 PK 결정 확인 |
| SCH-04 | `role_menu_permissions` 테이블 생성 (서로게이트 PK + can_read, can_write) | camelCase↔snake_case 자동 매핑 확인 |
| SCH-05 | `user_menu_permissions` 테이블 생성 (서로게이트 PK + can_read, can_write) | 동일 패턴 |
| SCH-06 | 초기 샘플 메뉴 7개 INSERT | navigation.ts `sampleNavItems` 직접 확인 |
| DOM-01 | `Menu` R2DBC 엔티티 + `MenuRepository` | Account.java 패턴 복사, ReactiveCrudRepository 확인 |
| DOM-02 | `Role` R2DBC 엔티티 + `RoleRepository` | 동일 패턴 |
| DOM-03 | `UserRole` R2DBC 엔티티 + `UserRoleRepository` | 서로게이트 PK + `findByUserId` 쿼리 메서드 |
| DOM-04 | `RoleMenuPermission` R2DBC 엔티티 + `RoleMenuPermissionRepository` | `findByRoleId` 쿼리 메서드 |
| DOM-05 | `UserMenuPermission` R2DBC 엔티티 + `UserMenuPermissionRepository` | `findByUserId` 쿼리 메서드 |

</phase_requirements>

---

## 요약

이 페이즈는 새로운 라이브러리를 설치하지 않는다. 모든 의존성(`spring-data-r2dbc`, `r2dbc-postgresql`, `flyway-core`)은 이미 `build.gradle`에 존재한다. 작업은 순수하게 (1) V3 Flyway SQL 파일 작성, (2) Java 엔티티 5개 + 리포지토리 5개 작성이다.

**핵심 결론 3가지:**
1. `TIMESTAMPTZ` ↔ `OffsetDateTime` 변환은 `r2dbc-postgresql` 드라이버가 기본 제공하므로 `R2dbcCustomConversions` 빈 추가가 불필요하다. [VERIFIED: github.com/pgjdbc/r2dbc-postgresql]
2. camelCase↔snake_case NamingStrategy는 Spring Data R2DBC 기본값이므로 `@Column` 어노테이션이 불필요하다. [VERIFIED: docs.spring.io/spring-data/relational]
3. `@EnableR2dbcRepositories(basePackages = "com.example.bootstrap")`가 이미 전체 패키지를 스캔하므로 `menu` 패키지 추가 시 별도 설정 변경 없다. [VERIFIED: R2dbcConfig.java 직접 확인]

**Primary recommendation:** V1 SQL 스타일을 그대로 따르고, `Account.java` 엔티티를 1:1 복사 패턴으로 5개 엔티티를 작성한다.

---

## 아키텍처 책임 맵 (Architectural Responsibility Map)

| Capability | Primary Tier | Secondary Tier | 근거 |
|------------|-------------|----------------|------|
| DB 스키마 생성 | Database / Storage (Flyway) | — | SQL DDL은 Flyway 마이그레이션 파일이 전담 |
| 엔티티 매핑 | API / Backend (Spring Data R2DBC) | — | ORM 계층이 테이블↔객체 매핑 담당 |
| 리포지토리 조회 인터페이스 | API / Backend (Repository) | — | Service 레이어가 Phase 2에서 사용 |
| 초기 데이터 시드 | Database / Storage (Flyway) | — | INSERT SQL을 마이그레이션에 포함 |

---

## Standard Stack

### Core (이미 설치됨 — 신규 의존성 없음)

| 라이브러리 | 버전 | 역할 | 근거 |
|-----------|------|------|------|
| Spring Boot | 3.4.5 | 프레임워크 | `gradle.properties` 직접 확인 [VERIFIED: gradle.properties] |
| Spring Data R2DBC | (Boot 관리) | Reactive DB 접근, 엔티티/리포지토리 | `spring-boot-starter-data-r2dbc` [VERIFIED: build.gradle] |
| r2dbc-postgresql | (Boot 관리) | PostgreSQL R2DBC 드라이버 | `org.postgresql:r2dbc-postgresql` [VERIFIED: build.gradle] |
| Flyway Core | (Boot 관리) | SQL 마이그레이션 | `flyway-core` + `flyway-database-postgresql` [VERIFIED: build.gradle] |
| Java | 21 | 언어 | `gradle.properties` [VERIFIED: gradle.properties] |

**신규 의존성 설치 불필요** — Phase 1의 모든 작업은 기존 스택으로 충분하다.

---

## Package Legitimacy Audit

> **이 페이즈는 신규 패키지를 설치하지 않는다.** 기존 `build.gradle` 의존성만 사용한다.

해당 없음.

---

## Architecture Patterns

### 시스템 아키텍처 흐름

Flyway가 JDBC DataSource를 통해 PostgreSQL에 V3 SQL을 실행하고, Spring Data R2DBC는 R2DBC 커넥션을 통해 같은 DB에서 엔티티를 Reactive 방식으로 읽는다.

```
앱 시작
  → Flyway (JDBC)
      → V1__init.sql (이미 실행됨)
      → V2__batch_schema.sql (이미 실행됨)
      → V3__menu_rbac.sql (신규)
            CREATE TABLE menus, roles, user_roles,
                         role_menu_permissions, user_menu_permissions
            INSERT INTO menus (7개 초기 데이터)

런타임 (Reactive)
  → Service (Phase 2)
      → MenuRepository.findAll() → Flux<Menu>
      → UserRoleRepository.findByUserId(userId) → Flux<UserRole>
      → RoleMenuPermissionRepository.findByRoleId(roleId) → Flux<RoleMenuPermission>
      → UserMenuPermissionRepository.findByUserId(userId) → Flux<UserMenuPermission>
```

### 권장 패키지 구조

```
api/src/main/java/com/example/bootstrap/menu/
└── domain/
    ├── model/
    │   ├── Menu.java
    │   ├── Role.java
    │   ├── UserRole.java
    │   ├── RoleMenuPermission.java
    │   └── UserMenuPermission.java
    └── repository/
        ├── MenuRepository.java
        ├── RoleRepository.java
        ├── UserRoleRepository.java
        ├── RoleMenuPermissionRepository.java
        └── UserMenuPermissionRepository.java

api/src/main/resources/db/migration/
└── V3__menu_rbac.sql    (DDL + 초기 데이터 INSERT)
```

> `application`, `controller`, `infrastructure` 하위 패키지는 Phase 2~3에서 추가된다. Phase 1은 `domain`만 생성한다.

### Pattern 1: R2DBC 엔티티 (Account.java 복사 패턴)

**기준 파일:** `api/src/main/java/com/example/bootstrap/account/domain/model/Account.java`

```java
// Source: Account.java 직접 확인 [VERIFIED: codebase]
@Table("menus")
public class Menu {

    @Id
    private Long id;

    private String code;        // DB: code VARCHAR(50)

    private String name;        // DB: name VARCHAR(100)

    private Integer displayOrder; // DB: display_order INTEGER — snake_case 자동 매핑

    private Boolean isActive;   // DB: is_active BOOLEAN — snake_case 자동 매핑

    @CreatedDate
    private OffsetDateTime createdAt;  // DB: created_at TIMESTAMPTZ

    // 기본 생성자 필수 (Spring Data R2DBC 내부 사용)
    public Menu() {}

    // getter/setter 수동 작성 (Lombok @Data 사용 금지 — CONVENTIONS.md)
    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    // ... (나머지 필드 동일 패턴)
}
```

**중요:** `Account.java`는 `LocalDateTime`을 사용하지만 V3부터는 `OffsetDateTime` 사용 (D-05 결정).

### Pattern 2: R2DBC 리포지토리

**기준 파일:** `api/src/main/java/com/example/bootstrap/account/domain/repository/AccountRepository.java`

```java
// Source: AccountRepository.java 직접 확인 [VERIFIED: codebase]
@Repository
public interface MenuRepository extends ReactiveCrudRepository<Menu, Long> {
    // findAll()은 ReactiveCrudRepository가 기본 제공 → Flux<Menu>
}

@Repository
public interface UserRoleRepository extends ReactiveCrudRepository<UserRole, Long> {
    Flux<UserRole> findByUserId(Long userId);
    Flux<UserRole> findByRoleId(Long roleId);
}

@Repository
public interface RoleMenuPermissionRepository extends ReactiveCrudRepository<RoleMenuPermission, Long> {
    Flux<RoleMenuPermission> findByRoleId(Long roleId);
}

@Repository
public interface UserMenuPermissionRepository extends ReactiveCrudRepository<UserMenuPermission, Long> {
    Flux<UserMenuPermission> findByUserId(Long userId);
}
```

`findByXxx` 메서드는 Spring Data가 camelCase → snake_case 컬럼명으로 자동 쿼리를 생성한다.

### Pattern 3: Flyway V3 SQL 스타일

**기준 파일:** `V1__init.sql` 직접 확인 [VERIFIED: codebase]

```sql
-- =============================================================================
-- V3__menu_rbac.sql — 메뉴 RBAC 스키마
-- =============================================================================

CREATE TABLE menus (
    id            BIGSERIAL       PRIMARY KEY,
    code          VARCHAR(50)     NOT NULL,
    name          VARCHAR(100)    NOT NULL,
    display_order INTEGER         NOT NULL DEFAULT 0,
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_menus_code UNIQUE (code)
);

COMMENT ON TABLE  menus              IS '메뉴 목록';
COMMENT ON COLUMN menus.code         IS '메뉴 코드 (UPPER_SNAKE_CASE, API-프론트 매핑 키)';
-- ...

-- 초기 메뉴 데이터 (sampleNavItems 기준)
INSERT INTO menus (display_order, code, name, is_active) VALUES
    (1, 'DASHBOARD',   '대시보드',    TRUE),
    (2, 'USERS',       '사용자',      TRUE),
    (3, 'TASKS',       '작업',        TRUE),
    (4, 'APPS',        '앱',          TRUE),
    (5, 'CHATS',       '채팅',        TRUE),
    (6, 'SETTINGS',    '설정',        TRUE),
    (7, 'HELP_CENTER', '도움말 센터', TRUE);
```

**V1에서 복사한 스타일 규칙:**
- `BIGSERIAL PRIMARY KEY`
- `CONSTRAINT` 명칭: `uq_{table}_{column}`, `fk_{table}_{ref_table}`, `chk_{table}_{field}`
- `CREATE INDEX idx_{table}_{column}` 패턴
- `COMMENT ON TABLE/COLUMN` 한국어 설명

### Anti-Patterns to Avoid

- **`@Column` 어노테이션 남발:** Spring Data R2DBC DefaultNamingStrategy가 이미 camelCase→snake_case를 처리한다. 기존 `Account.java`가 증명한다.
- **`@PrimaryKeyClass` 복합 PK:** D-03 결정에 따라 서로게이트 PK를 사용한다. 복합 PK는 `isNew()` 구현 필요 + Spring Data R2DBC에서 버그가 잦다.
- **`LocalDateTime` 사용:** V3부터는 `OffsetDateTime` 사용. `Account.java`의 `LocalDateTime`을 그대로 복사하지 말 것.
- **Lombok `@Data`/`@Getter`/`@Setter` 엔티티 적용:** CONVENTIONS.md에서 엔티티는 수동 getter/setter 필수.
- **V1/V2 파일 수정:** Flyway는 적용된 마이그레이션의 체크섬을 검증하므로 수정 시 시작 실패.

---

## Don't Hand-Roll

| 문제 | 직접 구현 금지 | 사용할 것 | 이유 |
|------|--------------|-----------|------|
| camelCase↔snake_case 컬럼 매핑 | 직접 `@Column` 명시 | Spring Data R2DBC DefaultNamingStrategy | 기존 Account 엔티티가 동작 증명 |
| TIMESTAMPTZ↔OffsetDateTime 변환 | 커스텀 Converter 빈 | r2dbc-postgresql 드라이버 기본 지원 | 공식 README 타입 매핑 테이블 확인 |
| 복합 PK 관리 | `@PrimaryKeyClass` | 서로게이트 `BIGSERIAL id` + UNIQUE 제약 | D-03 결정, R2DBC 복합 PK 복잡도 회피 |
| 리포지토리 쿼리 | `@Query` SQL 직접 작성 | Spring Data 쿼리 메서드 명명 (`findByUserId`) | ReactiveCrudRepository + 파생 쿼리로 충분 |
| 엔티티 리스너 | 수동 timestamp 세팅 | `@CreatedDate` + `@EnableR2dbcAuditing` | R2dbcConfig에 이미 `@EnableR2dbcAuditing` 활성화 |

**핵심 인사이트:** 이 페이즈의 모든 복잡성은 이미 프레임워크가 해결했다. 코드의 95%는 `Account.java`/`AccountRepository.java` 패턴의 반복이다.

---

## Common Pitfalls

### Pitfall 1: TIMESTAMPTZ + OffsetDateTime — R2dbcCustomConversions 필요 여부

**기존 우려:** CONTEXT.md D-06에서 "추가 R2dbcCustomConversions Bean이 필요할 수 있음"으로 표시됨.

**Research 결론:** 불필요하다.

r2dbc-postgresql 공식 README의 타입 매핑 테이블에서 `timestamp [with time zone]` → `OffsetDateTime` (볼드체 = 기본 타입)으로 명시되어 있다. Spring Data R2DBC는 JSR-310 타입을 "Passthru"로 드라이버에 위임하므로 별도 변환 설정 없이 동작한다. [VERIFIED: github.com/pgjdbc/r2dbc-postgresql]

**Why it happens:** 과거 버전(r2dbc-postgresql 0.8.x 이전)에는 Converter 없이 안 되는 경우가 있었으나, Spring Boot 3.x와 함께 사용하는 현재 버전에서는 해결되었다.

**Warning sign:** 만약 실제로 `OffsetDateTime` 역직렬화 오류가 나면 오류 메시지에 `Codec for ... not found`가 포함된다. 그 경우에만 `R2dbcCustomConversions` 빈 추가를 검토한다.

---

### Pitfall 2: `is_active` 컬럼 — Boolean 필드 getter 명명

**무엇이 잘못될 수 있는가:** Java `boolean isActive` 필드는 getter가 `isIsActive()` (이중 is)가 될 수 있다.

**Root cause:** `boolean` primitive + `is` prefix → Lombok이나 IDE가 `isIsActive()`를 생성.

**방지 방법:** `Boolean isActive` (박싱 타입)로 선언하면 getter가 `getIsActive()` → 명시적으로 `isActive()` getter 수동 작성.

**권장 패턴:**
```java
private Boolean isActive;   // 박싱 타입 사용

public Boolean isActive() { return isActive; }     // 또는 getIsActive()
public void setIsActive(final Boolean isActive) { this.isActive = isActive; }
```

> 실제로 V1 `users` 테이블의 `email_verified` 컬럼은 `emailVerified boolean` primitive로 선언되어 있고 `isEmailVerified()`로 getter가 작성되어 있다. 이 패턴을 그대로 따른다.

---

### Pitfall 3: Spring Data 파생 쿼리의 boolean 필드

**무엇이 잘못될 수 있는가:** `findByIsActiveTrue()` 같은 파생 쿼리에서 컬럼명 매핑 오류.

**방지 방법:** Phase 1은 이런 파생 쿼리가 없다. `findAll()`, `findByUserId()` 등 단순 조회만 필요하다.

---

### Pitfall 4: Flyway 체크섬 오류

**무엇이 잘못될 수 있는가:** V3 파일 작성 후 수정하면 다음 실행 시 체크섬 불일치로 앱 시작 실패.

**방지 방법:** V3 파일을 DB에 적용하기 전에 내용을 최종 확정한다. 이미 적용된 파일은 수정하지 않는다 (V1/V2와 동일 원칙).

**Warning sign:** `FlywayException: Validate failed: Migration checksum mismatch for migration version 3`

---

### Pitfall 5: `@LastModifiedDate` 누락

**무엇이 잘못될 수 있는가:** `menus`, `roles` 등 수정 가능한 엔티티에 `updated_at` 컬럼이 있는데 `@LastModifiedDate` 없으면 Auditing이 채우지 않는다.

**방지 방법:** `created_at`만 있는 테이블(연결 테이블 `user_roles` 등)은 `@CreatedDate`만, `updated_at`도 있는 테이블은 `@LastModifiedDate`도 추가한다.

**Phase 1 결론:** `menus`와 `roles`는 `created_at`만 포함하는 것으로 스키마를 단순하게 유지한다 (읽기 전용 마스터 데이터). `user_roles`, `role_menu_permissions`, `user_menu_permissions`는 `created_at`만.

---

## Code Examples

### 전체 엔티티 구조 결정

각 테이블별 컬럼 설계:

```
menus
  id            BIGSERIAL PK
  code          VARCHAR(50) UNIQUE NOT NULL
  name          VARCHAR(100) NOT NULL
  display_order INTEGER NOT NULL DEFAULT 0
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

roles
  id            BIGSERIAL PK
  name          VARCHAR(100) UNIQUE NOT NULL
  description   TEXT NULL
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

user_roles
  id            BIGSERIAL PK
  user_id       BIGINT NOT NULL → FK users(id) ON DELETE CASCADE
  role_id       BIGINT NOT NULL → FK roles(id) ON DELETE CASCADE
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  UNIQUE(user_id, role_id)

role_menu_permissions
  id            BIGSERIAL PK
  role_id       BIGINT NOT NULL → FK roles(id) ON DELETE CASCADE
  menu_id       BIGINT NOT NULL → FK menus(id) ON DELETE CASCADE
  can_read      BOOLEAN NOT NULL DEFAULT FALSE
  can_write     BOOLEAN NOT NULL DEFAULT FALSE
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  UNIQUE(role_id, menu_id)

user_menu_permissions
  id            BIGSERIAL PK
  user_id       BIGINT NOT NULL → FK users(id) ON DELETE CASCADE
  menu_id       BIGINT NOT NULL → FK menus(id) ON DELETE CASCADE
  can_read      BOOLEAN NOT NULL DEFAULT FALSE
  can_write     BOOLEAN NOT NULL DEFAULT FALSE
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  UNIQUE(user_id, menu_id)
```

### Java 엔티티 임포트 목록

```java
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import java.time.OffsetDateTime;   // V3: TIMESTAMPTZ 매핑 (Account의 LocalDateTime과 다름)
```

`@LastModifiedDate`는 V3 테이블에 `updated_at` 컬럼이 없으므로 불필요.

### 리포지토리 쿼리 메서드 설계

```java
// Phase 2에서 필요한 조회 메서드들
MenuRepository:
  Flux<Menu> findAll()                                // 전체 메뉴 목록
  Mono<Menu> findByCode(String code)                 // 코드로 단건 조회

RoleRepository:
  Flux<Role> findAll()                               // 전체 역할 목록

UserRoleRepository:
  Flux<UserRole> findByUserId(Long userId)           // 사용자의 역할 목록
  Flux<UserRole> findByRoleId(Long roleId)           // 역할별 사용자 목록

RoleMenuPermissionRepository:
  Flux<RoleMenuPermission> findByRoleId(Long roleId) // 역할의 메뉴 권한 목록
  Flux<RoleMenuPermission> findByRoleIdIn(Collection<Long> roleIds)  // Phase 2 병렬 조회

UserMenuPermissionRepository:
  Flux<UserMenuPermission> findByUserId(Long userId) // 사용자의 메뉴 오버라이드 목록
```

`findByRoleIdIn` 은 Phase 2 서비스에서 필요하지만, Phase 1 스코프에서는 선언만 해도 된다.

---

## State of the Art

| 구버전 접근 | 현재 접근 | 변경 버전 | 영향 |
|------------|----------|----------|------|
| R2DBC 복합 PK (`@PrimaryKeyClass`) | 서로게이트 BIGSERIAL PK | Spring Data R2DBC 1.x부터 지원은 되나 복잡 | D-03에서 서로게이트 PK 채택 |
| `LocalDateTime` (timezone 없음) | `OffsetDateTime` (TIMESTAMPTZ) | Spring Boot 3.x 권장 변경 | V3 엔티티만 적용, V1/V2 건드리지 않음 |
| `@Column` 명시적 매핑 | DefaultNamingStrategy 자동 변환 | Spring Data Relational 3.x | `@Column` 없이 동작 확인됨 |

**Deprecated/outdated:**
- R2DBC 복합 PK: 기술적으로 가능하지만 이 프로젝트에서 실익 없음으로 D-03에서 배제됨.

---

## Assumptions Log

| # | 주장 | 섹션 | 오류 시 리스크 |
|---|------|------|--------------|
| A1 | `roles` 테이블에 `updated_at` 컬럼 없이 `created_at`만 포함 | Code Examples | 낮음 — CONTEXT.md에 스키마 명세 없음; 단순화 방향이 맞음 |
| A2 | `menus` 테이블에 `updated_at` 컬럼 없이 `created_at`만 포함 | Code Examples | 낮음 — 초기 데이터 READ-ONLY 마스터 테이블이므로 수정 불필요 |
| A3 | `findByRoleIdIn` 메서드가 Phase 2에서 필요 | Code Examples | 낮음 — Phase 2 스코프에서 추가해도 무방 |

---

## Open Questions

1. **`roles` 초기 데이터 INSERT 필요 여부**
   - 알고 있는 것: CONTEXT.md에 `menus` 초기 데이터 7개 INSERT는 명시됨 (D-08)
   - 불명확한 것: `roles` 테이블에도 기본 역할(`USER_ROLE`, `ADMIN_ROLE` 등) INSERT가 필요한지
   - 권고: Phase 1 스코프에서는 `roles` 초기 데이터 없음. Phase 2 서비스 구현 시 필요하면 V4 마이그레이션 추가.

2. **`menus.description` 컬럼 존재 여부**
   - 알고 있는 것: REQUIREMENTS.md SCH-01은 `id, code, name, display_order, is_active` 5개 컬럼만 명시
   - 불명확한 것: 향후 메뉴 설명 추가가 예상되는지
   - 권고: REQUIREMENTS.md 명세 그대로 5개 컬럼으로 구현. 확장은 V4+.

---

## Environment Availability

| 의존성 | 필요한 이유 | 사용 가능 | 버전 | Fallback |
|--------|-----------|---------|------|----------|
| PostgreSQL | Flyway 마이그레이션 타겟 | ✓ (로컬 Docker) | 16-alpine (Testcontainers) | — |
| Java 21 JDK | 컴파일 | ✓ | 21 (`gradle.properties`) | — |
| Gradle Wrapper | 빌드 | ✓ | 9.5.1 | — |

신규 설치 불필요.

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`

### 적용 가능한 ASVS 카테고리

| ASVS 카테고리 | 해당 여부 | 표준 제어 |
|---------------|---------|----------|
| V2 Authentication | 아니오 | Phase 1은 인증 없음 |
| V3 Session Management | 아니오 | Phase 1은 세션 없음 |
| V4 Access Control | 아니오 | Phase 1은 API 없음 (Phase 3에서 적용) |
| V5 Input Validation | **예** | SQL 인젝션 — Flyway 정적 SQL, R2DBC 파라미터 바인딩 |
| V6 Cryptography | 아니오 | 암호화 없음 |

### Phase 1 특유 위협 패턴

| 패턴 | STRIDE | 표준 완화 |
|------|--------|----------|
| SQL 인젝션 (초기 데이터 INSERT) | Tampering | Flyway SQL은 정적 문자열 — 파라미터 없음, 안전 |
| 민감 컬럼 노출 | Information Disclosure | `menus`, `roles` 테이블은 비민감 데이터 (코드, 이름) |
| FK 무결성 우회 | Tampering | `ON DELETE CASCADE` + UNIQUE 제약으로 데이터 무결성 보장 |

**Phase 1 보안 결론:** DB 스키마와 도메인 모델 단계는 직접적인 보안 위협이 낮다. 보안 통제(AuthZ, API 보호)는 Phase 2~3에서 적용된다.

---

## Sources

### Primary (HIGH confidence)
- `api/src/main/java/com/example/bootstrap/account/domain/model/Account.java` — 엔티티 패턴 기준
- `api/src/main/java/com/example/bootstrap/global/config/R2dbcConfig.java` — NamingStrategy 미설정 확인
- `api/src/main/resources/db/migration/V1__init.sql` — SQL 스타일 기준
- `api/build.gradle` — 의존성 확인
- `api/gradle.properties` — 버전 확인
- [github.com/pgjdbc/r2dbc-postgresql README](https://github.com/pgjdbc/r2dbc-postgresql) — TIMESTAMPTZ↔OffsetDateTime 기본 지원 확인
- [docs.spring.io/spring-data/relational/reference/r2dbc/mapping.html](https://docs.spring.io/spring-data/relational/reference/r2dbc/mapping.html) — DefaultNamingStrategy snake_case 자동 변환 확인

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONVENTIONS.md` — Checkstyle/SpotBugs 규칙, 엔티티 패턴
- `.planning/codebase/TESTING.md` — 테스트 인프라 (FlywayMigrationIT 패턴)
- `web/src/sample/layout/navigation.ts` — 초기 메뉴 7개 코드/이름 원본

---

## Metadata

**신뢰도 분류:**
- Standard Stack: HIGH — build.gradle 직접 확인
- Architecture: HIGH — Account.java/R2dbcConfig.java 직접 확인, 공식 문서 교차 검증
- Pitfalls: HIGH — 공식 r2dbc-postgresql 문서 + 기존 코드 패턴으로 TIMESTAMPTZ 의문 해결

**Research 날짜:** 2026-05-27
**유효 기간:** 60일 (Spring Data R2DBC 3.x는 안정 API)
