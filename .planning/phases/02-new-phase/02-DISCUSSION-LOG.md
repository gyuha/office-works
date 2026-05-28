# Phase 2: 권한 서비스 + 핵심 API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 2-권한 서비스 + 핵심 API
**Areas discussed:** 권한 병합 규칙, 응답 DTO 형태, 빈 roleIds 처리, MenuAuthorizationBean 설계

---

## 권한 병합 규칙

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 사용자 오버라이드 우선순위 (역할 true, 오버라이드 false) | 오버라이드 우선 (양방향) | ✓ |
| | 오버라이드는 허용만 (추가만 가능) | |
| | 당신이 결정 | |

**선택:** 오버라이드 우선 — `user_menu_permissions`의 false가 역할 true를 덮어씀. 개인별 제한 가능.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| user_menu_permissions 행 없는 메뉴 처리 | 역할 권한 그대로 | ✓ |
| | 접근 거부 | |
| | 당신이 결정 | |

**선택:** 역할 권한 그대로 — 행 없음 = 오버라이드 없음.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 역할도 오버라이드도 없는 메뉴 | 응답에서 제외 | ✓ |
| | false로 포함 | |
| | 당신이 결정 | |

**선택:** 응답에서 제외 — 프론트엔드는 접근 가능한 것만 받음.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 여러 역할 집계 방식 | OR 집계 (additive) | ✓ |
| | 역할 우선순위 | |
| | 당신이 결정 | |

**선택:** OR 집계 — 하나라도 true면 최종 true.

---

## 응답 DTO 형태

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 비활성 메뉴 포함 여부 | 비활성 제외 | ✓ |
| | 비활성 포함 + isActive 필드 추가 | |
| | 당신이 결정 | |

**선택:** 비활성 제외 — is_active=true만 반환.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 응답 정렬 순서 | display_order 오름차순 | ✓ |
| | 정렬 없음 | |
| | 당신이 결정 | |

**선택:** display_order 오름차순.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 응답 DTO 필드 구성 | 명시된 5개만 (menuId, code, name, canRead, canWrite) | ✓ |
| | displayOrder 추가 (6개) | |
| | 당신이 결정 | |

**선택:** 5개만 — ROADMAP.md 그대로.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| ADMIN 응답 범위 | is_active=true 전체 | ✓ |
| | 모든 메뉴 (비활성 포함) | |
| | 당신이 결정 | |

**선택:** is_active=true 전체 — ADMIN도 비활성 제외.

---

## 빈 roleIds 처리

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 역할 미할당 사용자 처리 전략 | 서비스 레이어 명시적 분기 | ✓ |
| | 빈 리스트로 그냥 호출 | |
| | 당신이 결정 | |

**선택:** 명시적 분기 — roleIds 빈 리스트면 findByRoleIdIn() 스킵.
**Notes:** STATE.md에서 미리 식별된 리스크 — R2DBC의 IN (emptyList) 동작을 믿지 않고 명시적으로 처리.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| user_menu_permissions 조회 시점 | 항상 조회 | ✓ |
| | 역할 있을 때만 조회 | |
| | 당신이 결정 | |

**선택:** 항상 조회 — 역할 없어도 개인 오버라이드만으로 접근 가능.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 병렬 조회 구조 | Mono.zip() 병렬 | ✓ |
| | 순차 flatMap | |
| | 당신이 결정 | |

**선택:** Mono.zip() 병렬.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 병합 후 메뉴 정보 조회 방식 | findAllById(menuIds) | ✓ |
| | findAll() 후 필터 | |
| | 당신이 결정 | |

**선택:** findAllById(menuIds) — 접근 가능한 menuId만 조회.

---

## MenuAuthorizationBean 설계

| 질문 | 선택지 | 선택 |
|------|--------|------|
| Phase 2에서 @PreAuthorize 적용 여부 | Bean 구현만 | ✓ |
| | Phase 2에서 즉시 적용 | |
| | 당신이 결정 | |

**선택:** Bean 구현만 — @PreAuthorize 적용은 Phase 3.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| Bean 메서드 시그니처 | canRead + canWrite 별도 2개 | ✓ |
| | canAccess 단일 메서드 | |
| | 당신이 결정 | |

**선택:** canRead(Authentication, String menuCode) + canWrite(Authentication, String menuCode) 2개.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| 패키지 위치 | global/security/ | ✓ |
| | menu/application/ | |
| | 당신이 결정 | |

**선택:** global/security/ — JwtAuthenticationFilter와 동일 패키지.

| 질문 | 선택지 | 선택 |
|------|--------|------|
| MenuPermissionService 의존 방식 | 단건 조회 메서드 추가 | ✓ |
| | MenuPermissionService 직접 주입 후 목록에서 필터 | |
| | 당신이 결정 | |

**선택:** MenuPermissionService에 canRead(userId, menuCode) + canWrite(userId, menuCode) 단건 메서드 추가.

---

## Claude's Discretion

- `MenuPermissionService` 내부 병합 알고리즘 구현 세부 사항 (Map 구조 등)
- 응답 DTO Java record 이름 (`MyMenuResponse` 등)
- 에러 코드 값 (`MENU_001` 등)
- `MenuRepository`에 `findByIsActiveTrue()` 별도 추가 여부

## Deferred Ideas

없음 — 논의가 Phase 2 스코프 내에서만 진행됨.
