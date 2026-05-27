# Project State

## Project Reference

참조: .planning/PROJECT.md (최종 수정 2026-05-27)

**Core value:** 사용자가 접근 가능한 메뉴 목록을 API로 정확히 내려주는 것
**Current focus:** Phase 1 — DB 스키마 + 도메인 모델

## Current Position

Phase: 1 of 3 (DB 스키마 + 도메인 모델)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-05-27 — 로드맵 초기화 완료

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: users.role 유지 + roles 테이블 병행 — 기존 코드 브레이킹 없이 확장
- [Init]: ADMIN bypass는 JWT authorities 클레임으로만 판정 (DB 재조회 금지)
- [Init]: @PreAuthorize SpEL 복합 표현식 금지 — 단일 MenuAuthorizationBean 메서드로 통합 (issue #15209)

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 1 진입 전 확인 필요**: R2dbcConfig NamingStrategy(snake_case→camelCase) 설정 여부 — 없으면 엔티티에 @Column 명시 필요
- **Phase 2 진입 전 확인 필요**: 역할 미할당 사용자의 IN (:roleIds) 빈 리스트 동작 — 명시적 분기 필요

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Redis 캐싱 (menu-perms:{userId}) + 캐시 무효화 | Deferred | Init |
| v2 | 메뉴 권한 감사 로그 | Deferred | Init |

## Session Continuity

Last session: 2026-05-27
Stopped at: 로드맵 및 STATE.md 초기화 완료. Phase 1 플래닝 준비됨.
Resume file: None
