<!-- forge-slug: org-settings-1of4-positions -->

# run — 조직 설정 ①/④ 직급 체계(positions)

실행: 2026-06-07 · **직접 순차 실행**(워크플로 미사용) · 브랜치 `feat/org-positions`(`feat/members-list-api-integration` 위 stacked). 커밋 4개.

| 커밋 | 슬라이스 |
|------|----------|
| `0f66a74` | S1 — positions 테이블 + 8직급 시드 + org:write↔admin 시드 + domains/org 골격 |
| `0f648e8` | S2 — repository + service + 단위테스트(6) |
| `7d56da8` | S3 — `/api/v1/positions` router + main 등록 + 통합테스트(4) |
| `182145b` | S4 — RanksTab 서버사이드 연동(hey-api) |

## What went as planned
- 확정 결정 8개 그대로: 신규 `domains/org/`, 읽기=get_current_user/쓰기=`require_permission("org:write")`, positions(id/name unique/sort_order), reorder=전체 id 배열 sort_order 재할당, 8직급 시드, name UNIQUE, members.rank 무변경(standalone).
- **org 테스트 10건 통과**(unit 6 + integration 4), 변경분 ruff/mypy clean, `pnpm typecheck` 0·`build` 성공. 마이그레이션 0003 down/up 멱등.
- 통합테스트로 검증: 미인증 401·org:write 없는 인증유저 403·생성/reorder 라운드트립·중복 409. 라우트 순서 `/order` < `/{position_id}` 실측.
- ADR-0004대로 hey-api 생성 클라이언트 + `task gen-api` 재생성(positions 포함). Python 3.14 표준 흐름 정합.
- S1이 `org:write`를 기존 admin role에 idempotent 연결 — admin role 한 번 부여로 members:write·org:write 모두 커버.

## Divergences (계획 대비 실제)
- **[정보] 직접 순차 실행** — 하드 순차 의존 + 단일 도메인이라 Dynamic Workflow 대신 이 세션에서 직접 실행(members-list와 동일 판단, 더 쌈).
- **[low] 삭제 min-1 가드는 프론트 전용** — RanksTab은 마지막 1개 삭제를 막지만, 백엔드 DELETE는 마지막 직급도 삭제 허용. 데이터 위험 아님(직급 0개여도 무결성 문제 없음), UI 가드만. 필요 시 백엔드 가드 추가는 후속.
- **[정보] org:write는 admin role에만** — 특정 유저에게 admin role 부여는 범위 밖(기존 RBAC). 화면 쓰기 실테스트엔 계정에 admin role 필요(아래 미해결).

## On-the-spot 결정
- reorder 엔드포인트 `PATCH /positions/order`가 전체 정렬 id 배열을 받아 sort_order 1..N 재할당 — RanksTab의 이웃 swap도 이 한 호출로 표현.
- RanksTab을 string[] → PositionResponse 객체(id 기반 mutation)로 재작성. busy 가드로 동시 mutation 방지. invalidate는 positions query key 한정.

## 자체 적대 검토 (직접 실행, critical/high 0)
- require_permission("org:write")가 POST/PATCH/DELETE에 dependencies로 실제 적용(401/403 테스트로 입증). 읽기는 get_current_user.
- `/order` 정적 경로가 `/{position_id}` 앞에 등록(가로채기 없음, 실측).
- 마이그레이션 시드 idempotent·down은 admin role 보존(다른 권한 참조 가능)·org:write+링크만 제거. down/up 재현 확인.
- rename 시 동일 name 충돌 검사(self 제외). create 중복 IntegrityError→ConflictError.

## 막힌 곳 / 미완
- **화면 클릭 UAT 일부 미수행** — backend 10테스트·typecheck·build 통과. 인증 SPA 세션(admin role 보유 계정)으로의 RanksTab CRUD 브라우저 검증은 사람 확인 대상. `verified`는 정적 게이트 + 라이브 백엔드 기준.
- **미해결(반복)**: 로그인 계정에 admin role 부여 필요(org:write/members:write 둘 다 admin role에 있음). 앞서 권한 차단된 건 — 별도 처리해야 실 쓰기 테스트 가능.

## fg-learn 입력 후보
- part 시리즈 패턴 확립(domains/org, org:write idempotent) — part 2~4가 이 템플릿 재사용.
- 글로서리: `직급(Position)` 등재(관리되는 순서형 인사 등급 축; RBAC role·등급(Grade)과 무관).
- admin role 부트스트랩 미해결이 2개 작업 연속 UAT를 막음 — env ADMIN_EMAILS 등 부트스트랩을 별도 작업으로(후속).
- 삭제 min-1 백엔드 가드 부재(low).
