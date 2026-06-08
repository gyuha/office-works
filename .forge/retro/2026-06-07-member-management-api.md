# 2026-06-07 — 구성원 관리 API (members 도메인 신설 · 마이그레이션+시드 · CRUD/통계/CSV 라우터 · 로그인 eager 연결)

## Plan vs actual

- **What went as planned**:
  - Dynamic Workflow(직렬 S1→S2→S3→S4 + 적대적 리뷰, worktree 미사용)로 4슬라이스 전부 `feat/member-management-api`에 안착(커밋 `023b0cb`/`bd100e6`/`e162160`/`091ef60`, 19 files /+1723). 완료기준 4/4를 실제 산출물로 검증 — 최종 재실행 **160 passed/1 skipped**(members+auth), members 단독 14 passed. 변경분 ruff clean, mypy strict Success.
  - 확정 결정 9개 그대로: 별도 `members` 테이블(user_id nullable FK), 열린 로그인 유지(게이트 아님), 읽기=get_current_user/쓰기=require_permission("members:write"), 사번 자동 EMP-NNN, dept/rank 자유텍스트, grade enum, 전체 범위(목록·상세·생성·수정·soft delete·통계·/me·CSV), 마이그레이션이 permission+admin role 시드, eager 연결.
  - 적대적 리뷰 critical/high 0. 권한 게이트 실재(POST/PATCH/DELETE에 require_permission dependencies), 정적 경로(/me·/stats·/export)가 /{member_id} 앞에 등록, eager 연결이 login의 is_verified 게이트 후 검증 이메일로만 수행(글로서리 준수), 사번 동시성·email UNIQUE 충돌이 ConflictError로 처리, 시드 멱등·downgrade 안전.
  - **rbac retro의 worktree 교훈 재적용 성공** — 같은 도메인 패키지 추가라 worktree 격리 미사용, 동일 트리 직렬. 산출물 유실 0(rbac에서 통째로 버려졌던 사고 미재발).
- **Divergences** (전부 정보성/low — plan과 큰 이탈 없음):
  - [정보] 마이그레이션 경로: plan 표기 `migrations/` ≠ 실제 `api/alembic/versions/`. autogenerate 대신 손작성(시드 INSERT 때문), env.py에 members 모델 등록, 0001 미수정.
  - [정보] 시드 downgrade 비대칭: admin role은 남기고 members:write+링크만 제거(다른 참조 가능성 — 롤백 안전 의도). 시드 UUID는 pgcrypto 회피 위해 파이썬 uuid4.
  - [정보] 통합테스트 DB 전략: 기존 auth 'integration'은 in-memory fake였으나, S3는 완료기준(영속 라운드트립·admin role 직접 부여) 때문에 실 Postgres + 테스트 전용 NullPool 엔진 픽스처 + dependency_overrides로 작성(모듈 전역 pooled engine의 'Event loop is closed' 회피).
  - [정보] Python 3.14 환경: uv 기본이 3.14라 모든 명령에 `--python 3.12` 강제.
  - [low] CSV `/export`는 구현·등록됐으나 전용 테스트 미작성. 테스트 함수명은 ruff N802로 snake_case.

## Learnings

- **Do differently next time**:
  - **이 레포의 Python 환경 빚이 또 발목을 잡았다 — 이번이 두 번째(teams-sso retro #2와 동일).** uv 기본 인터프리터가 3.14인데 코드는 3.12 요구(langchain pydantic.v1 비호환). 워크플로가 매 명령 `--python 3.12`로 우회해 작업은 완수했으나, 매번 강제하는 건 깨지기 쉽다. **별도 정리 작업으로 `.python-version`/Taskfile/uv 설정을 3.12로 고정**해 근본 해결할 것. 계획 단계에서 "환경 게이트 빚 존재"를 리스크로 미리 박아둔 게 이번엔 도움이 됐다(에이전트가 알고 우회).
  - **신규 도메인의 실-DB 통합테스트를 쓸 땐 기존 도메인의 'integration' 마커 실체를 먼저 확인할 것.** auth의 'integration'은 사실 fake-override 라우트 검증이었고, members는 실 Postgres 라운드트립이 필요했다 → 둘이 같은 마커인데 의미가 달라졌다. NullPool 픽스처 패턴을 공용 conftest로 올려 수렴시키는 후속이 바람직. (구현 디테일이라 retro에만 — 글로서리/ADR 비대상.)
  - **plan의 경로 표기는 실제 트리로 검증하고 적을 것.** `migrations/`로 적었으나 실제는 `api/alembic/`. 사소하나 에이전트가 한 번 헷갈릴 여지. fg-ask 단계에서 디렉터리 실존을 한 번 확인했으면 됐다.
  - **직렬 의존 + 단일 도메인 작업에 Dynamic Workflow는 병렬 이득이 0이었다.** 사용자가 워크플로를 택했고 결과는 깨끗했지만(리뷰 페이즈가 값을 함), 비용(~441k 토큰/19분) 대비 직접 순차 실행이 더 쌌을 것. 다음 유사 작업은 직접 실행 권장을 더 강하게.

## Doc updates

- CONTEXT.md promotion: **none** — 실행 중 새 도메인 용어/의미 변화 없음(구성원·구성원 연결·등급은 fg-ask 그릴링에서 이미 등재·대조 완료).
- ADR added: **none** — 새 하드 결정 없음. 로그인 정책은 열린 채 유지(JIT 무변경), Member/User 분리·eager 연결은 fg-ask에서 이미 非-ADR로 판정. NullPool 통합 픽스처는 구현 디테일.

## 후속 작업 후보 (fg-cleanup 후 fg-ask 대상)

1. **Python 3.12 환경 고정** — `.python-version`/Taskfile/uv 설정 정합으로 `--python 3.12` 강제 제거. teams-sso retro #2와 합쳐 한 작업으로.
2. **프론트엔드 연동** — `web/src/features/office/screens/members.tsx`의 mock `MEMBERS_DATA`를 실 `/api/v1/members` API로 교체(이번 작업의 명시적 non-goal).
3. **공용 실-DB 통합테스트 conftest** — members의 NullPool 엔진 픽스처를 공용화하고 auth 'integration'도 실 DB로 수렴할지 검토.
4. CSV `/export` 전용 테스트 보강(low).
5. admin role을 특정 유저에게 부여하는 부트스트랩(env ADMIN_EMAILS 등) — 현재 시드는 role/permission만, 유저 부여는 수동(범위 밖이었음).
6. 고아 worktree 3개(`wf_0f916fa6-ff3-2/3/4`, stale bb65748) `git worktree prune` 정리 — rbac retro에서 이월된 별건.
