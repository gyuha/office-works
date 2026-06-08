<!-- forge-slug: member-management-api -->

# run — 구성원 관리 API (Dynamic Workflow 실행 기록)

실행: 2026-06-07 · Dynamic Workflow `wf_5ed0abfe-6da` (5 에이전트, 직렬 S1→S2→S3→S4 + 적대적 리뷰) · ~19분 · 서브에이전트 ~441k 토큰.
브랜치: `feat/member-management-api` (main 분기). 커밋 4개, 19 files / +1723.

| 커밋 | 슬라이스 |
|------|----------|
| `023b0cb` | S1 — members 테이블 + 시드 마이그레이션 |
| `bd100e6` | S2 — repository + service + 단위테스트(7) |
| `e162160` | S3 — `/api/v1/members` router + main 등록 + 통합테스트(5) |
| `091ef60` | S4 — 로그인 시 eager Member 연결 |

## What went as planned

- **4개 슬라이스 완료기준 전부 실제 산출물로 검증됨** (파일 존재 + 테스트 재실행 통과 + DB 상태 SELECT + 라우트 순서 실측). 최종 재실행 **160 passed / 1 skipped** (tests/members + tests/auth), members 단독 14 passed(unit 7 + integration 7). 변경분 ruff `All checks passed`, mypy strict `Success`(12 files).
- 확정된 결정 9개 그대로 구현: 별도 `members` 테이블(user_id nullable FK), 열린 로그인 유지, 읽기=`get_current_user`/쓰기=`require_permission("members:write")`, 사번 자동 EMP-NNN, dept/rank 자유텍스트, grade enum, 전체 범위(목록·상세·생성·수정·soft delete·통계·/me·CSV), 마이그레이션이 permission+admin role 시드, eager 연결.
- **적대적 리뷰 결과 critical/high 결함 0.** require_permission이 POST/PATCH/DELETE에 실제 dependencies로 걸림(읽기는 get_current_user), `/me·/stats·/export` 정적 경로가 `/{member_id}` 앞에 등록되어 가로채기 없음, eager 연결은 login의 `is_verified` 게이트 후 검증 이메일로만 수행(글로서리 준수), 사번 동시성·email UNIQUE 충돌이 ConflictError로 처리, 시드 멱등·downgrade 안전.
- **rbac retro 교훈 적용 성공** — worktree 격리 미사용, 동일 트리 직렬 실행. 산출물 유실 없이 4커밋 모두 브랜치에 안착.

## Divergences (계획 대비 실제)

- **[정보] 마이그레이션 경로** — plan은 `migrations/`를 언급했으나 실제 Alembic은 `api/alembic/versions/`. 거기에 `0002_members_table_and_seed.py` 추가. autogenerate 대신 **손으로 작성**(시드 INSERT는 autogenerate가 못 만듦), 0001 스타일 모방. `alembic/env.py`에 members 모델 import 등록(auth/chat과 동일 try/except). **0001 미수정.**
- **[정보] 시드 downgrade 비대칭** — downgrade가 `admin` role은 남기고(다른 권한/참조 가능) `members:write` permission과 그 링크만 제거. "admin 없으면 생성" 시드라 롤백 안전 측면의 의도적 선택. down→up 사이클 재현 확인. 시드 UUID는 pgcrypto 의존 회피 위해 파이썬 `uuid4()`.
- **[정보] 통합테스트 DB 전략** — 기존 tests/auth의 'integration'은 사실상 in-memory fake로 `_get_service` 오버라이드(실 DB 미사용)였음. S3 완료기준(생성 후 GET 라운드트립 영속·admin role 직접 부여)은 실 Postgres가 필요해 **가동 중 로컬 Postgres에 붙는 실 DB 통합테스트**로 작성. 이벤트 루프 충돌(모듈 전역 pooled engine이 pytest-asyncio 루프 전환 시 'Event loop is closed')은 테스트 전용 `NullPool` 엔진 픽스처 + `dependency_overrides[get_async_session]`로 해결. 인증은 `dependency_overrides[get_current_user]`로 주입(require_permission이 그 위에서 작동).
- **[정보] Python 3.14 환경 빚** — uv 기본이 3.14라 **모든 명령에 `--python 3.12` 강제**(plan/CLAUDE.md가 3.12 요구). teams-sso retro에서 이미 나온 사전 환경 빚을 이번엔 3.12 강제로 우회. (근본 정리는 별도 작업.)
- **[low] CSV export 테스트 누락** — `/export` 엔드포인트는 구현·등록됐으나(page_size=10_000 단일 페이지 StreamingResponse) 통합테스트 필수 케이스에 export 검증이 명시 안 돼 전용 테스트 미작성.
- **[명명] 테스트 함수명** — ruff N802(소문자 강제)로 plan이 제안한 camelCase 스타일 대신 snake_case 사용.

## On-the-spot 결정

- 단위테스트는 인메모리 `FakeMemberRepository`로 DB 비의존(unit 마커), 통합테스트만 실 Postgres.
- `list` 메서드명이 빌트인을 가려 `_Conditions` 별칭 + `Sequence` 반환으로 회피.
- eager 연결은 `AuthService._link_member_if_unlinked(user)`가 `MemberRepository(self._repo._session)`로 같은 세션 사용 → `login()`·`oauth_provision_user()`에서 호출.

## 리뷰 finding (전부 low, plan이 명시 수용 — 수정 안 함)

1. `_link_member_if_unlinked`의 `except Exception` 광범위 삼킴 — 정상 경로에선 무해(SELECT+set+flush뿐), 현실 실패는 커넥션 단절(어차피 로그인 실패). plan "연결 훅이 로그인 안 깨뜨림" 충족.
2. `MemberRepository(self._repo._session)` — auth repo private 속성 직접 접근(캡슐화 위반). plan이 "auth→members 소폭 결합 허용"으로 명시 → 범위 내 의도된 결합, 순환 없음.
3. `next_employee_no()` 동시 INSERT 시 사번 충돌 가능 → UNIQUE→IntegrityError→ConflictError 방어. plan 리스크 섹션 "dev 규모 수용".
4. 마이그레이션 downgrade admin role 잔존 — 위 divergence와 동일, 의도적·정당.

## 막힌 곳

- 없음(blockers 전부 빈 배열). 수정·커밋 없이 검증만 수행한 리뷰가 정당한 종료 상태.

## fg-learn 입력 후보

- **환경 빚(반복 확인)**: uv 기본 Python 3.14 vs 요구 3.12. teams-sso retro #2와 동일 — Taskfile/.python-version로 3.12 고정하거나 환경 정리하는 별도 작업.
- **통합테스트 패턴 분기**: 기존 auth 'integration'(fake)과 신규 members 'integration'(실 DB + NullPool)이 서로 다름. 공용 실-DB 통합테스트 픽스처(conftest)로 수렴할지.
- CSV export 전용 테스트 보강(low).
