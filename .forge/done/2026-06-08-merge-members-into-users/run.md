<!-- forge-slug: merge-members-into-users -->

# 실행 기록 — members ↔ users 병합 (task 9)

브랜치: `feat/merge-members-into-users` (feat/org-config에서 분기). 실행 모드: **직접 순차**(S1→S4). 4슬라이스 전부 의존 직렬 + sealed auth/migration 고위험이라 Dynamic Workflow 대신 직접 실행, 각 슬라이스 끝 회귀 게이트.

## 계획대로 된 것

- **S1 — 스키마**: `0007_merge_members_into_users` — users에 HR 컬럼(employee_no/department/rank/phone/grade) nullable 추가 + `uq_users_employee_no`. members→users backfill(email dedup 3분기). `members:write`→`users:write` permission rename(admin 링크 보존). members 테이블 유지. User 모델 반영. 라이브 적용 검증: 5컬럼·UNIQUE·권한 rename·admin 연결 모두 확인. (현 dev DB members 0행 → backfill no-op)
- **S2 — 백엔드**: `domains/users/`(repository/service/router/schemas) 신설 — `/api/v1/users` CRUD/stats/me/export, 읽기=get_current_user·쓰기=`users:write`. main.py members 라우터 → users 라우터. auth `_link_member_if_unlinked` + 호출 2곳(login·oauth) 제거. org grade raw SQL `members`→`users` repoint. members 테스트 → `tests/users/`로 이관, org grade 라우터 테스트도 users 행 기준으로 repoint. **303 passed**, 변경분 ruff/mypy clean. 앱 부팅 시 `/api/v1/users` 등록·`/members` 부재 확인.
- **S3 — 프론트**: `task gen-api` 재생성(openapi.json export + openapi-ts). `members.tsx`를 `/api/v1/users` 엔드포인트·새 타입으로 repoint(목록/상세/추가/편집/삭제/CSV, 등급 동적 유지). 화면 키 `members-list`·"구성원" UI 유지. typecheck 0·build 성공·Biome clean.
- **S4 — drop+검증**: `0008_drop_members_table`로 members drop(down/up 멱등 라이브 검증: downgrade→members 재생성, upgrade→삭제). 죽은 `src/domains/members/` 삭제. 전체 테스트 303 passed. 앱 라이브: /health 200·/users 401·/members 404·/users/me 401.

## 분기(Divergences) / 현장 결정

1. **name 컬럼 미신설 — `display_name` 재사용 (계획 결정 #7의 실행시 선택)**: HR `name`을 별도 컬럼으로 두지 않고 기존 `users.display_name`에 매핑. API 계약은 `name` 유지(UserResponse가 display_name→name 매핑, UserCreate.name→display_name 저장). 이유: 단일 인간 이름에 두 컬럼은 권위 충돌·drift. 결과로 **UserResponse의 name·HR 필드가 전부 nullable**(display_name이 nullable) → 프론트 GradeTag/Field/Avatar에 `?? ''`/`string|null` 수용 추가.
2. **`/users/me`가 더 이상 404 안 함**: 구 `/members/me`는 연결 member 없으면 404였으나, 이제 사용자=레코드라 본인 행을 항상 반환(비직원이면 HR null). 동작 변경.
3. **soft delete가 로그인까지 비활성화**: `is_active=false`는 directory 비활성 + auth 로그인 차단을 동시 의미(병합의 자연 귀결, 직원 비활성=계정 비활성). 의도된 결과.
4. **create가 기존 email에 충돌(비직원 user 포함)**: 구 members와 동일하게 email 중복 시 ConflictError. 단 병합 세계에선 "이미 로그인한 비직원 user를 직원으로 승격"이 directory 목록(employee_no 필터)에 안 보여 UI로 불가 → **비직원→직원 승격 UI 부재 갭**(ADR-0006 Non-goal "비직원 user 정리 UI"와 일치). 후속 후보.
5. **grade repo 메서드명 잔존**: `count_members_with_grade`/`cascade_rename_members`가 이제 users를 조회/갱신하나 이름은 유지(개명 시 grade_service+테스트 파급 → surgical 원칙으로 보류, docstring만 갱신). 네이밍 부채.
6. **directory 목록 범위 = employee_no 있는 user**(계획 결정 #3). 인증전용/시스템 user는 목록·stats에서 제외.

## 코드리뷰 페이즈 (계획 요구: auth/마이그레이션/데이터 변환)

- **auth linking 제거**: 부가 훅의 순수 삭제 — login/oauth는 그대로 토큰 발급(auth 테스트 전원 green). 잔존 참조 0(grep 확인).
- **0007 backfill**: 3분기(user_id 있음 / email 일치 / 신규 credential-less) 로직 검토. display_name은 COALESCE로 기존값 보존. 현 DB no-op이라 데이터 변환 실증은 안 됨(0행) — **실 데이터 backfill은 미검증**(리스크: 다행 환경에서 email dedup/employee_no UNIQUE 충돌). offline --sql로 DDL 확인.
- **0007/0008 down/up**: 0008은 라이브 down/up 멱등 검증 완료. 0007 downgrade는 offline SQL well-formed 확인(라이브 미실행 — 0008 위에 적층돼 있어 단독 round-trip은 안 함).

## 막힌 곳 / 게이트 외 이슈 (전부 사전 존재, 이 작업 무관)

- **auto-mode classifier가 라이브 마이그레이션 2회 차단**(0007·0008) — 공유 DB write라 dry-run 미리보기. offline --sql 미리보기 제시 후 사용자 명시 승인받아 적용(우회 안 함).
- **`task lint` 사전 실패**: `tests/auth/test_auth_flows.py`(이 작업 미수정, git clean)에 RUF059×6·RUF043×1. base 브랜치부터 red. surgical 원칙으로 미수정 — **후속 후보**.
- **chat 도메인 3.14 collection 실패**: langchain `pydantic.v1` ↔ Python 3.14 비호환(root CLAUDE.md 기존 문서화). conftest import 단계 crash라 chat 제외하고 실행. (api/CLAUDE.md의 "642 passed" 주장과 모순 — 환경 회귀 의심, 별건.)
- **`tests/test_migrations.py` 3실패**: `Makefile` 부재(프로젝트가 Taskfile로 대체) FileNotFoundError. 사전 존재.
- **admin role 부트스트랩 미해결**: users:write 브라우저 쓰기 UAT 여전히 차단(직전 5작업과 동일). 쓰기 경로는 통합테스트(test_user_router 403/201)로 검증됨. **#1 후속**.

## 검증 (UAT)

- 정적: 변경분 ruff/mypy clean, mypy 전체 78파일 clean, typecheck 0, build OK.
- 동적: pytest 303 passed(auth+org+users+infra+shared+config+main_runtime), `/users` 통합테스트(401/403/201 CRUD/me) 라이브 Postgres 통과. 0007·0008 라이브 적용, 0008 down/up 멱등. 앱 라이브 기동 게이트(/users 401·/members 404) 통과.
- **미검증**: 실 데이터 members→users backfill(0행), 브라우저 쓰기 클릭 UAT(admin 부트스트랩 차단).
