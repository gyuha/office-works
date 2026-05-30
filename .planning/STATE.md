---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Microsoft Teams 소셜 로그인
status: planning
last_updated: "2026-05-30T00:00:00.000Z"
last_activity: 2026-05-30
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

참조: .planning/PROJECT.md (최종 수정 2026-05-29)

**Core value:** 사용자가 접근 가능한 메뉴 목록을 API로 정확히 내려주는 것
**Current focus:** v1.1 — Microsoft Teams(Azure AD) 소셜 로그인 추가

## Current Position

Phase: 4 (시작 전)
Plan: —
Status: Roadmap 작성 완료 — Phase 4 진입 대기
Last activity: 2026-05-30 — v1.1 로드맵 생성 (Phase 4-5)

```
Phase 4 ░░░░░░░░░░  0%   Azure AD 앱 등록 설정
Phase 5 ░░░░░░░░░░  0%   Microsoft OAuth2 백엔드 구현
```

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 4 | - | - | - |
| 5 | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.1 Init]: MSAL4J / spring-cloud-azure-starter 도입 금지 — WebFlux 미지원, 기존 SecurityWebFilterChain 오염
- [v1.1 Init]: Graph API `/v1.0/me`의 `id`(oid) 필드를 providerId로 사용 — `sub`는 앱별 값이므로 oid가 안정적
- [v1.1 Init]: 단일 테넌트(`tenantId` 고정) — 멀티테넌트(`/common` 엔드포인트) 제외
- [v1.0 Init]: users.role 유지 + roles 테이블 병행 — 기존 코드 브레이킹 없이 확장
- [v1.0 Init]: ADMIN bypass는 JWT authorities 클레임으로만 판정 (DB 재조회 금지)

### Pending Todos

- Phase 4 진입 전: Azure Portal App Registration 절차 수행 필요 (사람이 직접)
- Phase 5 진입 전: `oauth_accounts.provider` 기존 CHECK 제약 SQL 확인 필요 (V1 마이그레이션)

### Blockers/Concerns

없음 (현재)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Redis 캐싱 (menu-perms:{userId}) + 캐시 무효화 | Deferred | v1.0 Init |
| v2 | 메뉴 권한 감사 로그 | Deferred | v1.0 Init |
| v2 | tenantId 저장 — 조직별 사용자 구분 | Deferred | v1.1 Init |
| v2 | 프로필 이미지 — Graph API 사진 API 연동 | Deferred | v1.1 Init |
| v2 | 멀티테넌트 `/common` 엔드포인트 | Deferred | v1.1 Init |
| v2 | 프론트엔드 MSAL.js 연동 (mock-auth-api.ts 실 연동) | Deferred | v1.1 Init |

## Session Continuity

Last session: 2026-05-30
Stopped at: Roadmap created — Phase 4 not yet started
Resume file: .planning/ROADMAP.md

### Quick Tasks Completed

| ID | Description | Date | Commit | Dir |
| --- | --- | --- | --- | --- |
| 260528-ttg | Taskfile.yml 파일을 만들어서 각종 실행에 도움이 되도록 해 줘 | 2026-05-28 | (pending) | [260528-ttg-taskfile-yml](./quick/260528-ttg-taskfile-yml/) |
