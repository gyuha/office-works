# 2026-06-07 — 조직 설정 ①/④ 직급 체계(positions) DB·API·화면 CRUD

## Plan vs actual

- **What went as planned**:
  - 직접 순차 실행(워크플로 미사용)로 S1~S4를 `feat/org-positions`(`feat/members-list-api-integration` 위 stacked)에 4커밋: `0f66a74`(스키마+시드+도메인 골격) · `0f648e8`(repo/service+단위6) · `7d56da8`(router+main+통합4) · `182145b`(RanksTab 연동).
  - 확정 결정 8개 그대로. org 테스트 **10건 통과**(unit 6 + integration 4), 변경분 ruff/mypy clean, `pnpm typecheck` 0·`build` 성공, 마이그레이션 0003 down/up 멱등. 라이브 백엔드 `GET /positions` 401·openapi positions 경로·8직급 시드 확인.
  - ADR-0004대로 hey-api 생성 클라이언트 + `task gen-api`. `org:write`를 기존 admin role에 idempotent 연결(admin role 한 번 부여로 members:write·org:write 커버). Python 3.14 표준 흐름 정합.
- **Divergences** (전부 정보성/low):
  - [정보] 직접 순차 실행 선택(하드 순차+단일 도메인 → 워크플로 병렬 이득 0, members-list와 동일 판단).
  - [low] 삭제 min-1 가드가 프론트(RanksTab) 전용 — 백엔드 DELETE는 마지막 직급도 허용. 데이터 위험 아님(직급 0개여도 무결성 OK).
  - [정보] reorder는 `PATCH /positions/order`가 전체 id 배열로 sort_order 1..N 재할당 — UI 이웃 swap을 한 호출로 표현.

## Learnings

- **Do differently next time**:
  - **part 시리즈 템플릿이 part 1에서 확립됨 — part 2~4는 이걸 복제하면 빠르다.** `domains/org/` 레이어 골격, `org:write` permission을 admin role에 idempotent 시드(각 part 마이그레이션이 방어적으로 보장), 읽기=get_current_user/쓰기=org:write, hey-api `task gen-api` 재생성 후 탭 배선, NullPool 통합테스트 픽스처. part 2(고용형태)는 positions와 거의 동일 shape이라 사실상 복붙+이름 변경.
  - **★ admin role 부트스트랩 미해결이 두 작업 연속(members-list, positions) UAT를 막았다.** 시드는 permission/role/link만 만들고 "특정 유저에게 admin role 부여"는 매번 범위 밖으로 남겨, 화면 쓰기(추가/편집/삭제)를 브라우저로 검증하려면 매번 수동 DB 삽입이 필요한데 그게 권한 차단으로 막힌다. → **env `ADMIN_EMAILS` 같은 부트스트랩을 독립 작업으로 빼서 한 번에 해결**할 것(이걸 안 하면 org 파트 2~4도 같은 UAT 벽에 부딪힌다). 후속 후보로 명시.
  - (low, retro 한정) 삭제 min-1을 데이터 차원에서 보장하려면 백엔드 가드가 필요 — 현재는 UI만. 직급 전 삭제가 실제 문제면 service에 가드 추가.

## Doc updates
- CONTEXT.md promotion: **`직급(Position)` 신규 등재** — 관리되는 순서형 직위 체계(positions). RBAC role·등급(Grade)·자유텍스트 members.rank와 구분, "members.rank는 positions와 연결 안 됨(standalone)" 명시. 기존 `등급(Grade)` 항목의 "직급(rank)" 참조도 "직급(Position)"으로 정합.
- ADR added: **none** — domains/org·org:write·reorder 방식은 관행/구현 디테일이라 ADR 바 미달.

## 후속 작업 후보 (fg-cleanup 후 fg-ask 대상)
1. **admin role 부트스트랩** — env `ADMIN_EMAILS` 로그인 시 자동 부여 등. members:write·org:write를 가진 admin role을 실제 운영자 계정에 붙이는 표준 경로. **이게 없으면 org 파트 2~4 UAT가 계속 막힘** — 우선순위 높음.
2. part 2(고용형태)·3(등급)·4(config) — backlog 대기. part 3은 재그릴링 완료.
3. 삭제 min-1 백엔드 가드(low).
4. `.forge/codebase/*` 맵의 "Python 3.12 필수" 등 stale 기술 — fg-map 재실행 시 갱신.
