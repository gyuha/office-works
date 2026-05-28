# Phase 3: ADMIN API + Security 통합 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 03-ADMIN API + Security 통합
**Areas discussed:** A(응답 DTO), B(403 처리), C(SecurityConfig 경로 등록), D(통합 테스트 범위)

---

## A. GET /api/menus 응답 DTO

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 2 DTO 재사용 | `MyMenuResponse`(canRead/canWrite 포함)를 공유 | |
| 별개 `AdminMenuResponse` | 5개 필드(menuId, code, name, displayOrder, isActive), 권한 필드 없음 | ✓ |

**User's choice:** 별개 `AdminMenuResponse` record 사용 — Phase 2의 `MyMenuResponse`와 분리
**Notes:** ADMIN은 메뉴 관리 목적이므로 canRead/canWrite 불필요. displayOrder, isActive 포함. 필드 5개.

---

## B. 403 처리 방식

| Option | Description | Selected |
|--------|-------------|----------|
| `HttpStatusServerForbiddenEntryPoint` | Spring 기본 403 반환 (JSON 없음) | |
| 커스텀 `AccessDeniedHandler` | `ApiResponse` envelope 형식으로 403 반환 | ✓ |

**User's choice:** 커스텀 `ServerAccessDeniedHandler` 구현 — `ApiResponse` envelope 형식 일관성 유지
**Notes:** 기존 `authenticationEntryPoint` 방식과 동일하게 exceptionHandling 블록에 추가. 에러코드 `MENU_002`(이미 ErrorCode enum에 존재) 사용.

---

## C. SecurityConfig 경로 등록

| Option | Description | Selected |
|--------|-------------|----------|
| `anyExchange().authenticated()` 만으로 처리 | 기존 catch-all로 커버 | |
| 명시적 경로 추가 + `@PreAuthorize` 조합 | SecurityConfig에 `/api/menus/**` 명시 + Controller에 역할 체크 | ✓ |

**User's choice:** 두 레이어 조합 — SecurityConfig(`/api/menus/**` → authenticated) + Controller(`@PreAuthorize("hasRole('ADMIN')")`)
**Notes:** `@EnableReactiveMethodSecurity` 이미 활성화 상태. SecurityConfig에서 인증 요구, Controller에서 역할 체크. JwtAuthenticationFilter 변경 없음.

---

## D. 통합 테스트 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 기본 3개만 | ADMIN 200 / USER 403 / 미인증 401 | |
| 기본 3개 + 응답 필드 검증 + envelope 검증 | 필드 검증(`$.data[0].code` 등) + 403 envelope(`$.code = "MENU_002"`) | ✓ |

**User's choice:** 기본 3개 + ADMIN 200 응답 필드 검증 + 403 ApiResponse envelope 검증
**Notes:** 기존 `MenuControllerIT.java`에 3개 테스트 메서드 추가. 403 시 `$.code = "MENU_002"` assert로 AccessDeniedHandler 동작 End-to-End 검증.

---

## Claude's Discretion

- `AccessDeniedHandler` 클래스명 — `ApiAccessDeniedHandler` 또는 `MenuAccessDeniedHandler` 중 공용 목적에 맞는 이름 선택
- `AdminMenuResponse` DTO 필드 Java 타입 — 엔티티 타입에 맞게 결정
- i18n 메시지 키 `MENU_002` 존재 여부 확인 후 없으면 하드코딩 허용

## Deferred Ideas

없음 — 논의가 Phase 3 스코프 내에서만 진행됨.
