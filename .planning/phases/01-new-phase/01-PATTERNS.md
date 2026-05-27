# Phase 1: DB 스키마 + 도메인 모델 - 패턴 맵

**작성일:** 2026-05-28
**분류된 파일 수:** 12 (SQL 1 + 엔티티 5 + 리포지토리 5 + 설정 확인 1)
**아날로그 발견:** 12 / 12

---

## 파일 분류

| 신규/수정 파일 | 역할 | 데이터 흐름 | 가장 가까운 아날로그 | 매치 품질 |
|---|---|---|---|---|
| `api/src/main/resources/db/migration/V3__menu_rbac.sql` | migration | batch | `V1__init.sql` | exact |
| `api/src/main/java/com/example/bootstrap/menu/domain/model/Menu.java` | model | CRUD | `Account.java` | exact |
| `api/src/main/java/com/example/bootstrap/menu/domain/model/Role.java` | model | CRUD | `Account.java` | exact |
| `api/src/main/java/com/example/bootstrap/menu/domain/model/UserRole.java` | model | CRUD | `Account.java` | role-match |
| `api/src/main/java/com/example/bootstrap/menu/domain/model/RoleMenuPermission.java` | model | CRUD | `Account.java` | role-match |
| `api/src/main/java/com/example/bootstrap/menu/domain/model/UserMenuPermission.java` | model | CRUD | `Account.java` | role-match |
| `api/src/main/java/com/example/bootstrap/menu/domain/repository/MenuRepository.java` | repository | CRUD | `AccountRepository.java` | exact |
| `api/src/main/java/com/example/bootstrap/menu/domain/repository/RoleRepository.java` | repository | CRUD | `AccountRepository.java` | exact |
| `api/src/main/java/com/example/bootstrap/menu/domain/repository/UserRoleRepository.java` | repository | CRUD | `AccountRepository.java` | role-match |
| `api/src/main/java/com/example/bootstrap/menu/domain/repository/RoleMenuPermissionRepository.java` | repository | CRUD | `AccountRepository.java` | role-match |
| `api/src/main/java/com/example/bootstrap/menu/domain/repository/UserMenuPermissionRepository.java` | repository | CRUD | `AccountRepository.java` | role-match |
| `api/src/main/java/com/example/bootstrap/global/config/R2dbcConfig.java` | config | — | (현재 파일 확인만) | 수정 없음 |

---

## 패턴 할당

### `V3__menu_rbac.sql` (migration, batch)

**아날로그:** `api/src/main/resources/db/migration/V1__init.sql`

**파일 헤더 패턴** (V1 1~16행):
```sql
-- =============================================================================
-- V3__menu_rbac.sql — 메뉴 RBAC 스키마
--
-- 포함 테이블:
--   [Menu 도메인]
--   menus                        : 메뉴 목록 (코드/이름/순서/활성여부)
--   roles                        : 역할 목록
--   user_roles                   : 사용자-역할 연결 (서로게이트 PK)
--   role_menu_permissions        : 역할별 메뉴 권한
--   user_menu_permissions        : 사용자별 메뉴 오버라이드 권한
-- =============================================================================
```

**테이블 DDL 패턴** (V1 21~34행에서 추출):
```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. menus
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE menus (
    id            BIGSERIAL       PRIMARY KEY,
    code          VARCHAR(50)     NOT NULL,
    name          VARCHAR(100)    NOT NULL,
    display_order INTEGER         NOT NULL DEFAULT 0,
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_menus_code UNIQUE (code)
);
```

**COMMENT ON 패턴** (V1 36~45행에서 추출):
```sql
COMMENT ON TABLE  menus                IS '메뉴 목록';
COMMENT ON COLUMN menus.id             IS 'PK (auto-generated)';
COMMENT ON COLUMN menus.code           IS '메뉴 코드 (UPPER_SNAKE_CASE, API-프론트 매핑 키)';
COMMENT ON COLUMN menus.name           IS '메뉴 표시명';
COMMENT ON COLUMN menus.display_order  IS '표시 순서';
COMMENT ON COLUMN menus.is_active      IS '활성 여부';
COMMENT ON COLUMN menus.created_at     IS '생성일시';
```

**INDEX 패턴** (V1 47~48행에서 추출):
```sql
CREATE INDEX idx_menus_display_order ON menus (display_order);
```

**FK 제약 패턴** (V1 61~63행에서 추출):
```sql
CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
```

**제약명 명명 규칙** (V1 전체에서 추출):
- UNIQUE: `uq_{table}_{column}` (예: `uq_menus_code`, `uq_user_roles_user_role`)
- FK: `fk_{table}_{ref_table}` (예: `fk_user_roles_user`, `fk_user_roles_role`)
- CHECK: `chk_{table}_{field}` (예: V1의 `chk_users_role`)
- INDEX: `idx_{table}_{column}` (예: `idx_users_role`)

**초기 데이터 INSERT 패턴** — sampleNavItems (navigation.ts 146~189행) 기준:

i18n 한국어 이름 (sample.json 기준):
- dashboard → `대시보드`
- users → `사용자`
- tasks → `작업`
- apps → `앱`
- chats → `채팅`
- settings → `설정`
- helpCenter → `도움말 센터`

```sql
-- 초기 메뉴 데이터 (web/src/sample/layout/navigation.ts sampleNavItems 기준)
INSERT INTO menus (display_order, code, name, is_active) VALUES
    (1, 'DASHBOARD',   '대시보드',    TRUE),
    (2, 'USERS',       '사용자',      TRUE),
    (3, 'TASKS',       '작업',        TRUE),
    (4, 'APPS',        '앱',          TRUE),
    (5, 'CHATS',       '채팅',        TRUE),
    (6, 'SETTINGS',    '설정',        TRUE),
    (7, 'HELP_CENTER', '도움말 센터', TRUE);
```

**중요: V1/V2는 `TIMESTAMP` 사용, V3부터는 `TIMESTAMPTZ` 사용 (D-05). V1/V2 파일은 절대 수정 금지 (D-07).**

---

### `Menu.java` (model, CRUD)

**아날로그:** `api/src/main/java/com/example/bootstrap/account/domain/model/Account.java`

**임포트 패턴** (Account.java 1~8행, OffsetDateTime으로 교체):
```java
package com.example.bootstrap.menu.domain.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;   // V3: TIMESTAMPTZ 매핑 (Account의 LocalDateTime과 다름 — D-05)
```

**클래스 선언 + 필드 패턴** (Account.java 16~39행 구조 복사, 필드 변경):
```java
@Table("menus")
public class Menu {

    @Id
    private Long id;

    private String code;

    private String name;

    private Integer displayOrder;   // DB: display_order — snake_case 자동 매핑 (D-01)

    private Boolean isActive;       // 박싱 타입 사용 — Pitfall 2 참조

    @CreatedDate
    private OffsetDateTime createdAt;  // TIMESTAMPTZ → OffsetDateTime (D-05)

    /** 기본 생성자. Spring Data R2DBC가 내부적으로 사용합니다. */
    public Menu() {
    }
    // getter/setter 수동 작성 — Lombok 금지 (D-02)
```

**Boolean 필드 getter 패턴** (RESEARCH.md Pitfall 2):
```java
// isActive Boolean 박싱 타입 — getter 이중 is 방지
public Boolean isActive() { return isActive; }
public void setIsActive(final Boolean isActive) { this.isActive = isActive; }
```

**Javadoc getter 패턴** (Account.java 50~61행):
```java
/**
 * 메뉴 ID를 반환합니다.
 *
 * @return menu PK
 */
public Long getId() {
    return id;
}

/**
 * 메뉴 ID를 설정합니다.
 *
 * @param id menu PK
 */
public void setId(final Long id) {
    this.id = id;
}
```

**`@LastModifiedDate` 없음:** menus/roles는 `created_at`만 포함 (읽기 전용 마스터 데이터 — RESEARCH.md Pitfall 5).

---

### `Role.java` (model, CRUD)

**아날로그:** `Account.java` (동일 패턴)

**필드 구성** (menus와 동일 패턴, 컬럼만 다름):
```java
@Table("roles")
public class Role {

    @Id
    private Long id;

    private String name;           // DB: name VARCHAR(100) UNIQUE

    private String description;    // DB: description TEXT NULL

    @CreatedDate
    private OffsetDateTime createdAt;

    public Role() {
    }
    // getter/setter 수동 작성
```

**`description` nullable 처리:** 필드 타입 `String`만으로 충분 (R2DBC가 null 처리). 별도 어노테이션 불필요.

---

### `UserRole.java` (model, CRUD)

**아날로그:** `Account.java` (서로게이트 PK 패턴 적용)

**필드 구성** — 서로게이트 PK + FK 참조 (D-03):
```java
@Table("user_roles")
public class UserRole {

    @Id
    private Long id;               // DB: id BIGSERIAL PRIMARY KEY (서로게이트 PK — D-03)

    private Long userId;           // DB: user_id → FK users(id)

    private Long roleId;           // DB: role_id → FK roles(id)

    @CreatedDate
    private OffsetDateTime createdAt;

    public UserRole() {
    }
    // getter/setter 수동 작성
```

**중요:** `@PrimaryKeyClass` 복합 PK 사용 금지 (D-03, D-04). UNIQUE(user_id, role_id)는 DB 제약으로만 처리.

---

### `RoleMenuPermission.java` (model, CRUD)

**아날로그:** `Account.java` (서로게이트 PK + Boolean 권한 필드 패턴)

**필드 구성:**
```java
@Table("role_menu_permissions")
public class RoleMenuPermission {

    @Id
    private Long id;

    private Long roleId;           // DB: role_id → FK roles(id)

    private Long menuId;           // DB: menu_id → FK menus(id)

    private Boolean canRead;       // DB: can_read BOOLEAN — 박싱 타입 (Pitfall 2)

    private Boolean canWrite;      // DB: can_write BOOLEAN — 박싱 타입 (Pitfall 2)

    @CreatedDate
    private OffsetDateTime createdAt;

    public RoleMenuPermission() {
    }
    // getter/setter 수동 작성
```

**Boolean getter 패턴** (canRead, canWrite도 동일하게 적용):
```java
public Boolean isCanRead() { return canRead; }
public void setCanRead(final Boolean canRead) { this.canRead = canRead; }

public Boolean isCanWrite() { return canWrite; }
public void setCanWrite(final Boolean canWrite) { this.canWrite = canWrite; }
```

---

### `UserMenuPermission.java` (model, CRUD)

**아날로그:** `RoleMenuPermission.java` 패턴 (roleId → userId로 교체)

**필드 구성:**
```java
@Table("user_menu_permissions")
public class UserMenuPermission {

    @Id
    private Long id;

    private Long userId;           // DB: user_id → FK users(id)

    private Long menuId;           // DB: menu_id → FK menus(id)

    private Boolean canRead;       // DB: can_read BOOLEAN

    private Boolean canWrite;      // DB: can_write BOOLEAN

    @CreatedDate
    private OffsetDateTime createdAt;

    public UserMenuPermission() {
    }
    // getter/setter 수동 작성
```

---

### `MenuRepository.java` (repository, CRUD)

**아날로그:** `api/src/main/java/com/example/bootstrap/account/domain/repository/AccountRepository.java`

**전체 패턴** (AccountRepository.java 1~23행):
```java
package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.Menu;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

/**
 * 메뉴 R2DBC 리포지토리.
 *
 * <p>코드 기반 조회를 지원합니다.
 */
@Repository
public interface MenuRepository extends ReactiveCrudRepository<Menu, Long> {

    /**
     * 코드로 메뉴를 조회합니다.
     *
     * @param code 메뉴 코드 (UPPER_SNAKE_CASE)
     * @return 메뉴 (없으면 empty Mono)
     */
    Mono<Menu> findByCode(String code);
}
```

**`findAll()`은 ReactiveCrudRepository가 기본 제공** — 별도 선언 불필요.

---

### `RoleRepository.java` (repository, CRUD)

**아날로그:** `AccountRepository.java`

```java
package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.Role;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;

/**
 * 역할 R2DBC 리포지토리.
 */
@Repository
public interface RoleRepository extends ReactiveCrudRepository<Role, Long> {
    // findAll()은 ReactiveCrudRepository 기본 제공
}
```

---

### `UserRoleRepository.java` (repository, CRUD)

**아날로그:** `AccountRepository.java` (Flux 다건 조회 패턴 추가)

```java
package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.UserRole;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

/**
 * 사용자-역할 연결 R2DBC 리포지토리.
 */
@Repository
public interface UserRoleRepository extends ReactiveCrudRepository<UserRole, Long> {

    /**
     * 사용자 ID로 역할 목록을 조회합니다.
     *
     * @param userId 사용자 PK
     * @return 사용자의 역할 목록
     */
    Flux<UserRole> findByUserId(Long userId);

    /**
     * 역할 ID로 사용자 목록을 조회합니다.
     *
     * @param roleId 역할 PK
     * @return 해당 역할의 사용자 목록
     */
    Flux<UserRole> findByRoleId(Long roleId);
}
```

**Spring Data 파생 쿼리:** `findByUserId` → `WHERE user_id = ?` 로 자동 생성 (snake_case 자동 매핑 — D-01).

---

### `RoleMenuPermissionRepository.java` (repository, CRUD)

**아날로그:** `AccountRepository.java` + `UserRoleRepository.java` 패턴

```java
package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.RoleMenuPermission;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.Collection;

/**
 * 역할별 메뉴 권한 R2DBC 리포지토리.
 */
@Repository
public interface RoleMenuPermissionRepository extends ReactiveCrudRepository<RoleMenuPermission, Long> {

    Flux<RoleMenuPermission> findByRoleId(Long roleId);

    // Phase 2에서 복수 역할 일괄 조회 시 사용
    Flux<RoleMenuPermission> findByRoleIdIn(Collection<Long> roleIds);
}
```

---

### `UserMenuPermissionRepository.java` (repository, CRUD)

**아날로그:** `AccountRepository.java` + `UserRoleRepository.java` 패턴

```java
package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.UserMenuPermission;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

/**
 * 사용자별 메뉴 오버라이드 권한 R2DBC 리포지토리.
 */
@Repository
public interface UserMenuPermissionRepository extends ReactiveCrudRepository<UserMenuPermission, Long> {

    Flux<UserMenuPermission> findByUserId(Long userId);
}
```

---

## 공유 패턴

### R2DBC 엔티티 구조 규칙
**출처:** `api/src/main/java/com/example/bootstrap/account/domain/model/Account.java`
**적용 대상:** 5개 엔티티 모두

```java
// 공통 어노테이션 세트 (Account.java 1~8행)
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import java.time.OffsetDateTime;   // Account는 LocalDateTime — V3 엔티티는 OffsetDateTime 사용

// 클래스 규칙
@Table("{table_name}")                    // 명시적 테이블명
public class EntityName {
    @Id
    private Long id;                       // 서로게이트 PK (BIGSERIAL)

    // @Column 어노테이션 금지 — DefaultNamingStrategy 자동 처리 (D-01)
    // Lombok @Data/@Getter/@Setter 금지 — 수동 getter/setter 필수 (D-02)
    // LocalDateTime 금지 — OffsetDateTime 사용 (D-05)

    @CreatedDate
    private OffsetDateTime createdAt;      // @LastModifiedDate 없음 (updated_at 컬럼 없음)

    public EntityName() {}                  // 기본 생성자 필수

    // getter/setter: 모든 필드에 Javadoc 포함, final 파라미터 사용
    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
}
```

### 리포지토리 공통 패턴
**출처:** `api/src/main/java/com/example/bootstrap/account/domain/repository/AccountRepository.java`
**적용 대상:** 5개 리포지토리 모두

```java
// 단건 조회: Mono<T>
// 다건 조회: Flux<T>
// @Repository 어노테이션 필수
// extends ReactiveCrudRepository<Entity, Long>
@Repository
public interface XxxRepository extends ReactiveCrudRepository<Xxx, Long> {
    Mono<Xxx> findByUniqueField(String field);        // 단건
    Flux<Xxx> findByForeignKey(Long foreignKeyId);   // 다건
    Flux<Xxx> findByForeignKeyIn(Collection<Long> ids); // 다건 IN
}
```

### Flyway SQL 스타일
**출처:** `api/src/main/resources/db/migration/V1__init.sql`
**적용 대상:** `V3__menu_rbac.sql`

```sql
-- 파일명 규칙: V{n}__{설명}.sql (V1, V2 존재 → V3__)
-- BIGSERIAL PRIMARY KEY (SERIAL이 아닌 BIGSERIAL)
-- NOT NULL DEFAULT 명시
-- CONSTRAINT 명: uq_, fk_, chk_ 접두사
-- COMMENT ON TABLE/COLUMN 한국어
-- CREATE INDEX idx_{table}_{column}
-- V3부터 TIMESTAMP 대신 TIMESTAMPTZ 사용
-- V1/V2 파일 절대 수정 금지
```

### R2DBC 스캔 설정 확인
**출처:** `api/src/main/java/com/example/bootstrap/global/config/R2dbcConfig.java` (1~18행)

```java
// 이미 전체 패키지 스캔 중 — 별도 설정 변경 없음
@EnableR2dbcRepositories(basePackages = "com.example.bootstrap")
@EnableR2dbcAuditing
public class R2dbcConfig {}
// menu 패키지 추가 시 자동 스캔됨 — R2dbcConfig.java 수정 불필요
```

---

## 아날로그 없음

해당 없음 — Phase 1의 모든 파일은 기존 `Account.java`/`AccountRepository.java`/`V1__init.sql` 패턴으로 완전히 커버된다.

---

## 주의사항 요약 (Planner용)

| 항목 | Account.java 패턴과의 차이점 |
|------|--------------------------|
| 타임스탬프 타입 | `LocalDateTime` → `OffsetDateTime` (D-05) |
| `@LastModifiedDate` | V3 엔티티 모두 없음 (updated_at 컬럼 없음) |
| Boolean 필드 타입 | `boolean` primitive 대신 `Boolean` 박싱 타입 사용 (Pitfall 2) |
| 복합 PK | `@PrimaryKeyClass` 사용 금지, 서로게이트 BIGSERIAL PK (D-03) |
| SQL 타임스탬프 타입 | `TIMESTAMP` → `TIMESTAMPTZ` (D-05) |
| R2dbcCustomConversions | 추가 불필요 (r2dbc-postgresql 기본 지원 — RESEARCH.md 결론 1) |

---

## 메타데이터

**아날로그 검색 범위:** `api/src/main/java/com/example/bootstrap/`, `api/src/main/resources/db/migration/`
**검색된 파일:** 5개 (Account.java, AccountRepository.java, R2dbcConfig.java, V1__init.sql, V2__batch_schema.sql)
**추가 확인 파일:** `web/src/sample/layout/navigation.ts`, `web/src/sample/i18n/locales/ko/sample.json`
**패턴 추출일:** 2026-05-28
