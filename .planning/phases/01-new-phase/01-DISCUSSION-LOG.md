# Phase 1: DB 스키마 + 도메인 모델 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 1-DB 스키마 + 도메인 모델
**Areas discussed:** R2DBC NamingStrategy / @Column 명시 여부, 복합 PK 엔티티 설계, 타임스탬프 타입, 초기 샘플 메뉴 데이터

---

## R2DBC NamingStrategy / @Column 명시 여부

| Option | Description | Selected |
|--------|-------------|----------|
| @Column 명시 불필요 | 기본 NamingStrategy가 snake_case↔camelCase 자동 변환. Account 엔티티 확인으로 동작 검증됨 | ✓ |
| @Column 명시 필요 | R2dbcConfig에 NamingStrategy 설정이 없어 수동 매핑이 필요할 수 있다는 가정 | |

**결과:** 코드베이스 확인으로 선결. `R2dbcConfig`에 NamingStrategy 미설정이지만 `Account` 엔티티의 `emailVerified`, `profileImageUrl` 등이 `@Column` 없이 정상 동작 중 — 사용자 선택 불필요, 사실 확인으로 결정.
**Notes:** STATE.md에 블로커로 등록되어 있었으나 코드베이스 스카우트로 해소됨.

---

## 복합 PK 엔티티 설계

| Option | Description | Selected |
|--------|-------------|----------|
| 서로게이트 PK | `id BIGSERIAL PRIMARY KEY` 추가 + `UNIQUE` 제약. 기존 Account 패턴 일치, 구현 단순 | ✓ |
| 복합 PK 유지 | REQUIREMENTS 원안. R2DBC `@PrimaryKeyClass` + `@PrimaryKeyColumn` 필요, `isNew()` 구현 부담 | |

**User's choice:** 서로게이트 PK — `id BIGSERIAL PRIMARY KEY` 추가 + UNIQUE 제약으로 중복 방지
**Notes:** 없음

---

## 타임스탬프 타입

| Option | Description | Selected |
|--------|-------------|----------|
| TIMESTAMP 유지 | V1 패턴 일관성, `LocalDateTime`, 추가 설정 없음 | |
| TIMESTAMPTZ로 변경 | timezone 안전, `OffsetDateTime`, R2DBC 코덱 확인 필요 | ✓ |

**User's choice:** `TIMESTAMPTZ` + `OffsetDateTime`. V1/V2 혼용 및 R2DBC 코덱 설정 필요 여부는 researcher가 확인 후 처리.
**Notes:** V1/V2는 기존 그대로 `TIMESTAMP` 유지. V3부터만 `TIMESTAMPTZ` 적용.

---

## 초기 샘플 메뉴 데이터 (SCH-06)

| Option | Description | Selected |
|--------|-------------|----------|
| 실제 서비스 메뉴 | 현재 운영 중인 실제 메뉴 코드/이름으로 INSERT, 전체 수량 | ✓ |
| 임의 샘플 | MENU_001 등 더미 데이터, 추후 교체 예정 | |

**User's choice:** 실제 서비스 메뉴 전체. `web/src/sample/layout/navigation.ts`의 `sampleNavItems` 기준 7개 항목.
**Notes:** `code` 컬럼은 UPPER_SNAKE_CASE (`DASHBOARD`, `USERS`, `TASKS`, `APPS`, `CHATS`, `SETTINGS`, `HELP_CENTER`). 모두 `is_active = true`.

---

## Claude's Discretion

- **리포지토리 커스텀 쿼리 메서드명:** Spring Data 명명 규칙 (`findByUserId`, `findByRoleId` 등) — 사용자 지시 없음
- **신규 도메인 패키지명:** `com.example.bootstrap.menu` — 기존 도메인 분리 패턴 (`account`, `ai`, `batch`) 따름

## Deferred Ideas

없음 — 논의가 Phase 1 스코프 내에서만 진행됨.
