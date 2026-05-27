# 01-02 실행 요약: 메뉴 RBAC 도메인 레이어

## 완료 일시
2026-05-28

## 작업 내용

메뉴 RBAC 도메인 레이어를 구현했다. Account.java/AccountRepository.java 패턴을 기준으로 5개 R2DBC 엔티티와 5개 리포지토리 인터페이스를 생성했다.

## 생성 파일 목록

### 엔티티 (com.example.bootstrap.menu.domain.model)
- `Menu.java` — @Table("menus"), 코드/이름/표시순서/활성화 여부 필드
- `Role.java` — @Table("roles"), 역할 이름/설명(nullable) 필드
- `UserRole.java` — @Table("user_roles"), 사용자-역할 다대다 매핑 (서로게이트 PK)
- `RoleMenuPermission.java` — @Table("role_menu_permissions"), 역할-메뉴 읽기/쓰기 권한
- `UserMenuPermission.java` — @Table("user_menu_permissions"), 사용자-메뉴 개별 권한

### 리포지토리 (com.example.bootstrap.menu.domain.repository)
- `MenuRepository.java` — findByCode(String) 제공
- `RoleRepository.java` — 기본 CRUD만 (findAll 기본 제공)
- `UserRoleRepository.java` — findByUserId(Long), findByRoleId(Long) 제공
- `RoleMenuPermissionRepository.java` — findByRoleId(Long), findByRoleIdIn(Collection<Long>) 제공
- `UserMenuPermissionRepository.java` — findByUserId(Long) 제공

## Locked Decision 준수 확인

| 결정 | 내용 | 적용 여부 |
|------|------|-----------|
| D-01 | @Column 어노테이션 금지 | 적용 — 미사용 확인 |
| D-02 | Lombok 금지 | 적용 — 미사용 확인 |
| D-03 | 서로게이트 BIGSERIAL PK | 적용 — 전 엔티티 @Id Long id |
| D-05 | OffsetDateTime 사용 | 적용 — LocalDateTime 미사용 확인 |
| Boolean 박싱 | primitive boolean 금지 | 적용 — 모든 boolean 필드 Boolean 타입 |
| setter final | 파라미터에 final 키워드 | 적용 — 전 setter 확인 |

## Acceptance Criteria 결과

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| LocalDateTime 미사용 | 출력 없음 | 출력 없음 | PASS |
| Lombok 미사용 | 출력 없음 | 출력 없음 | PASS |
| @Column 미사용 | 출력 없음 | 출력 없음 | PASS |
| @Repository 수 | 5 | 5 | PASS |
| extends ReactiveCrudRepository 수 | 5 | 5 | PASS |
| findByRoleIdIn 존재 | 존재 | RoleMenuPermissionRepository.java:32 | PASS |
| findByCode 존재 | 존재 | MenuRepository.java:22 | PASS |
| ./gradlew compileJava | BUILD SUCCESSFUL | 오류 없음(출력 없음) | PASS |

## 특이 사항

- Account.java 원본이 LocalDateTime을 사용하고 있으나, D-05 결정에 따라 menu 도메인은 OffsetDateTime으로 작성했다.
- Menu.isActive() getter는 Boolean 필드명이 isActive일 때 isIsActive() 생성을 방지하기 위해 명시적으로 `public Boolean isActive()` 형태로 선언했다.
- R2dbcConfig.java의 @EnableR2dbcRepositories(basePackages = "com.example.bootstrap") 스캔 범위가 menu 패키지를 포함하므로 별도 설정 불필요하다.
