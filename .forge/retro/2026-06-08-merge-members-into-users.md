# 2026-06-08 — members ↔ users 테이블 병합 (단일 person 테이블)

## Plan vs actual

- **What went as planned**:
  - 직접 순차 4슬라이스(S1 스키마→S2 백엔드→S3 프론트→S4 drop), 각 끝 회귀 게이트. members drop을 마지막으로 미뤄 중간 파손 0.
  - S1 `0007`: users HR 컬럼 nullable + `uq_users_employee_no` + backfill(email dedup 3분기) + `members:write`→`users:write` rename(admin 링크 보존). 라이브 적용·DB 검증 통과.
  - S2: `domains/users/` 신설 `/api/v1/users`(CRUD/stats/me/export, `users:write`), members 라우터 제거, `_link_member_if_unlinked`+호출2 제거, grade raw SQL→users repoint, 테스트 이관. **303 passed**, 변경분 ruff/mypy clean.
  - S3: `task gen-api` 재생성, `members.tsx`→`/api/v1/users`, 화면 키 `members-list` 유지. typecheck 0·build·Biome clean.
  - S4 `0008`: members drop, down/up 멱등 **라이브 검증**, 죽은 `domains/members/` 삭제. 앱 라이브 /users 401·/members 404.

- **Divergences** (대부분 의도된 정제 — 계획 파탄 아님):
  - **★ `name` 컬럼 미신설 — `display_name` 재사용** (계획 결정 #7이 실행시로 위임). API는 `name` 유지(매핑). 파생: UserResponse name·HR 필드 전부 nullable → 프론트 `?? ''` 수용. → ADR-0006 consequences 승격.
  - `/users/me` 무404화(사용자=레코드), soft-delete가 로그인까지 비활성화, create가 기존 email(비직원 포함) 충돌 → **비직원→직원 승격 UI 갭**(ADR-0006 Non-goal과 일치).
  - grade repo 메서드명 `count_members_with_grade`/`cascade_rename_members` 유지(이제 users 조회) — 개명 시 service+테스트 파급이라 surgical 보류. 네이밍 부채.
  - directory 목록 범위 = employee_no 있는 user(계획 결정 #3).

## Learnings

- **Do differently next time**:
  - **sealed 코어(auth)+migration+프론트 동시 변경엔 직접 순차가 맞았다.** 슬라이스가 전부 직렬 의존이라 Workflow의 병렬 이점 0, 대신 각 슬라이스 끝 전체 회귀가 안전망. members drop을 S4로 미룬 게 중간 파손을 0으로 만든 핵심.
  - **마이그레이션 분기에서 S1 게이트는 "전체 green"이 아니라 "마이그레이션+DB+비-대상 도메인 green"으로 잡아야 한다.** S1이 권한을 rename하면서 members 라우터는 아직 옛 권한을 보던 구간 → members 테스트가 의도적으로 red. 슬라이스별 게이트를 도메인 범위로 좁혀 잡으니 혼선이 없었다. 다음에도 "rename은 S1, repoint는 S2, 그 사이 대상 도메인 테스트는 expected-red"를 명시.
  - **공유 DB write는 classifier가 막는다 — offline `--sql` 미리보기 + 사용자 승인 패턴이 정답이었다.** `alembic upgrade A:B --sql`로 DDL을 먼저 보여주고(데이터 루프가 있는 0007은 SELECT 단계서 crash하나 DDL은 다 보임) 승인받아 적용. 우회 시도 없이 깔끔. down/up 멱등은 라이브로 검증.
  - **★ 실 데이터 backfill은 미검증(dev DB members 0행).** 3분기 dedup이 no-op으로만 통과 → 실데이터 환경(linked/email-match/신규 혼재, employee_no UNIQUE)에서 재현 검증 필요. 프로덕션/스테이징 적용 전 시드 데이터로 backfill 리허설 권장.
  - **`task lint`가 base부터 red였다**(`test_auth_flows.py` RUF059×6·RUF043×1, 이 작업 미수정). 게이트로 삼는 `task lint && task test`가 사전 깨져 있으면 내 변경의 green을 "변경분 ruff/mypy clean"으로 분리 입증해야 했다. → 사전 lint 부채는 별 작업으로 청소.
  - **api/CLAUDE.md "642 passed on 3.14" 주장과 chat collection 실패가 모순.** langchain `pydantic.v1`↔3.14 비호환으로 chat conftest가 import 단계 crash → 전체 pytest 세션 abort. chat 제외하고 검증했으나, 이 문서 주장이 환경 회귀를 가렸을 수 있음. fg-map/문서 갱신 시 확인.

## Doc updates

- **CONTEXT.md 개정**: `구성원(Member)` = HR 필드 가진 User 행으로 재정의 / `구성원 연결(Member linking)` 폐기 표시(훅 제거) / `등급`·`직급`·`고용형태`의 `members.*` 참조를 `users.*`로 정정. (ADR-0006이 이 회고로 위임한 항목 이행.)
- **ADR-0006 consequences 추가**: `name`은 별도 컬럼 없이 `display_name` 재사용, `UserResponse.name`↔`display_name` 매핑, HR 필드 nullable 파생.
- **신규 ADR**: 없음(병합 결정은 ADR-0006이 이미 보유, display_name은 그 결과로 흡수).

## 후속 작업 후보 (fg-cleanup 후 fg-ask 대상)

1. **admin role 부트스트랩** (env ADMIN_EMAILS 등) — users:write 브라우저 쓰기 UAT **6연속 차단**. 쓰기 경로는 통합테스트로만 검증됨. **최우선**.
2. **실 데이터 backfill 리허설** — 시드된 members로 0007 backfill 3분기·employee_no UNIQUE 충돌 검증(프로덕션 적용 전).
3. **사전 `task lint` red 청소** — `test_auth_flows.py` RUF059/RUF043(이 작업 무관, base부터 존재).
4. **비직원 user→직원 승격 UI** — 병합으로 생긴 갭(이미 로그인한 비직원을 directory에서 직원으로 만들 경로 부재).
5. **브랜치 체인 머지** — feat/member-management-api→…→org-config→merge-members-into-users 적층 미머지 8+1개. main 정리.
6. **grade repo 메서드 개명**(`count_members_with_grade`→`count_users_with_grade` 등) + api/CLAUDE.md "642 passed/3.14" 주장 재확인.
7. `.forge/codebase/*` 맵 stale(users 도메인 신설·members 삭제 미반영) — fg-map 재실행.
