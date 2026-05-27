-- =============================================================================
-- V3__menu_rbac.sql — 메뉴 RBAC 스키마 (메뉴 + 역할 기반 접근 제어)
--
-- 포함 테이블:
--   [메뉴 도메인]
--   menus                        : 시스템 메뉴 목록
--   roles                        : 역할 정의
--   user_roles                   : 사용자-역할 연결
--   role_menu_permissions        : 역할별 메뉴 권한
--   user_menu_permissions        : 사용자별 메뉴 권한 (개별 오버라이드)
--
-- 주의: V1__init.sql, V2__batch_schema.sql 파일은 절대 수정하지 않습니다.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. menus
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE menus (
    id            BIGSERIAL     PRIMARY KEY,
    code          VARCHAR(50)   NOT NULL,
    name          VARCHAR(100)  NOT NULL,
    display_order INTEGER       NOT NULL DEFAULT 0,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_menus_code UNIQUE (code)
);

COMMENT ON TABLE  menus               IS '시스템 메뉴 목록';
COMMENT ON COLUMN menus.id            IS 'PK (auto-generated)';
COMMENT ON COLUMN menus.code          IS '메뉴 식별 코드 (UPPER_SNAKE_CASE, unique)';
COMMENT ON COLUMN menus.name          IS '메뉴 표시 이름';
COMMENT ON COLUMN menus.display_order IS '메뉴 표시 순서';
COMMENT ON COLUMN menus.is_active     IS '메뉴 활성화 여부';
COMMENT ON COLUMN menus.created_at    IS '생성일시';

CREATE INDEX idx_menus_display_order ON menus (display_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. roles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE roles (
    id          BIGSERIAL     PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    description TEXT          NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_roles_name UNIQUE (name)
);

COMMENT ON TABLE  roles             IS '역할 정의';
COMMENT ON COLUMN roles.id          IS 'PK (auto-generated)';
COMMENT ON COLUMN roles.name        IS '역할 이름 (unique)';
COMMENT ON COLUMN roles.description IS '역할 설명';
COMMENT ON COLUMN roles.created_at  IS '생성일시';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. user_roles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_roles (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    role_id    BIGINT      NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role_id),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

COMMENT ON TABLE  user_roles            IS '사용자-역할 연결';
COMMENT ON COLUMN user_roles.id         IS 'PK (auto-generated)';
COMMENT ON COLUMN user_roles.user_id    IS '사용자 FK (users.id)';
COMMENT ON COLUMN user_roles.role_id    IS '역할 FK (roles.id)';
COMMENT ON COLUMN user_roles.created_at IS '연결 생성일시';

CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. role_menu_permissions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE role_menu_permissions (
    id         BIGSERIAL   PRIMARY KEY,
    role_id    BIGINT      NOT NULL,
    menu_id    BIGINT      NOT NULL,
    can_read   BOOLEAN     NOT NULL DEFAULT FALSE,
    can_write  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_role_menu_permissions_role_menu UNIQUE (role_id, menu_id),
    CONSTRAINT fk_role_menu_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_role_menu_permissions_menu
        FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
);

COMMENT ON TABLE  role_menu_permissions             IS '역할별 메뉴 권한';
COMMENT ON COLUMN role_menu_permissions.id          IS 'PK (auto-generated)';
COMMENT ON COLUMN role_menu_permissions.role_id     IS '역할 FK (roles.id)';
COMMENT ON COLUMN role_menu_permissions.menu_id     IS '메뉴 FK (menus.id)';
COMMENT ON COLUMN role_menu_permissions.can_read    IS '읽기 권한 여부';
COMMENT ON COLUMN role_menu_permissions.can_write   IS '쓰기 권한 여부';
COMMENT ON COLUMN role_menu_permissions.created_at  IS '생성일시';

CREATE INDEX idx_role_menu_permissions_role_id ON role_menu_permissions (role_id);
CREATE INDEX idx_role_menu_permissions_menu_id ON role_menu_permissions (menu_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. user_menu_permissions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_menu_permissions (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    menu_id    BIGINT      NOT NULL,
    can_read   BOOLEAN     NOT NULL DEFAULT FALSE,
    can_write  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_user_menu_permissions_user_menu UNIQUE (user_id, menu_id),
    CONSTRAINT fk_user_menu_permissions_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_permissions_menu
        FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
);

COMMENT ON TABLE  user_menu_permissions             IS '사용자별 메뉴 권한 (개별 오버라이드)';
COMMENT ON COLUMN user_menu_permissions.id          IS 'PK (auto-generated)';
COMMENT ON COLUMN user_menu_permissions.user_id     IS '사용자 FK (users.id)';
COMMENT ON COLUMN user_menu_permissions.menu_id     IS '메뉴 FK (menus.id)';
COMMENT ON COLUMN user_menu_permissions.can_read    IS '읽기 권한 여부';
COMMENT ON COLUMN user_menu_permissions.can_write   IS '쓰기 권한 여부';
COMMENT ON COLUMN user_menu_permissions.created_at  IS '생성일시';

CREATE INDEX idx_user_menu_permissions_user_id  ON user_menu_permissions (user_id);
CREATE INDEX idx_user_menu_permissions_menu_id  ON user_menu_permissions (menu_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 초기 메뉴 데이터
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO menus (display_order, code, name, is_active) VALUES
(1, 'DASHBOARD',   '대시보드',    TRUE),
(2, 'USERS',       '사용자',      TRUE),
(3, 'TASKS',       '작업',        TRUE),
(4, 'APPS',        '앱',          TRUE),
(5, 'CHATS',       '채팅',        TRUE),
(6, 'SETTINGS',    '설정',        TRUE),
(7, 'HELP_CENTER', '도움말 센터', TRUE);
