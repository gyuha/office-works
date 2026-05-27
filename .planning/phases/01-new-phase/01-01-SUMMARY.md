# 01-01 실행 요약

## 작업 내용

V3__menu_rbac.sql Flyway 마이그레이션 파일을 신규 생성하여 메뉴 RBAC에 필요한 5개 테이블 DDL과 초기 메뉴 7개 INSERT를 포함시켰다.

## 생성/수정 파일

- **신규 생성**: `api/src/main/resources/db/migration/V3__menu_rbac.sql`
- **수정 없음**: V1__init.sql, V2__batch_schema.sql (D-07 준수)

## 포함 테이블

| 번호 | 테이블명 | 용도 |
|------|----------|------|
| SCH-01 | menus | 시스템 메뉴 목록 |
| SCH-02 | roles | 역할 정의 |
| SCH-03 | user_roles | 사용자-역할 연결 (서로게이트 PK) |
| SCH-04 | role_menu_permissions | 역할별 메뉴 권한 (서로게이트 PK) |
| SCH-05 | user_menu_permissions | 사용자별 메뉴 권한 오버라이드 (서로게이트 PK) |

## Acceptance Criteria 결과

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| `grep -c "CREATE TABLE"` | 5 | 5 | PASS |
| `grep -c "TIMESTAMPTZ"` | ≥5 | 5 | PASS |
| `grep -c "BIGSERIAL"` | 5 | 5 | PASS |
| `HELP_CENTER` 문자열 | 존재 | 존재 | PASS |
| UNIQUE constraint 5개 | 5 | 5 | PASS |
| V1/V2 파일 미변경 | 변경 없음 | 변경 없음 | PASS |

## 주요 결정 사항 준수

- D-03: 연결 테이블 3개 모두 BIGSERIAL 서로게이트 PK 사용
- D-05: 모든 created_at → TIMESTAMPTZ (TIMESTAMP 금지)
- D-07: V1/V2 파일 미수정
- D-08: 초기 메뉴 7개 INSERT (DASHBOARD, USERS, TASKS, APPS, CHATS, SETTINGS, HELP_CENTER)
- D-09: menus.code UPPER_SNAKE_CASE 적용
