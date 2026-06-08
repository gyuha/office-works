# members와 users를 단일 person 테이블로 병합

## Status
accepted

## 결정
구성원(Member)과 User의 **분리를 철회**하고 하나의 `users` 테이블로 합친다.
- `users`에 HR 컬럼(`employee_no`·`name`·`department`·`rank`·`grade`·`phone`)을 **전부 nullable**로 추가. 직원 행은 채워지고, 인증 전용/시스템 행은 비어 있을 수 있다.
- `members` 데이터를 `users`로 backfill 후 `members` 테이블을 **drop**한다. backfill은 **email 기준 dedup**: member.user_id가 있으면 그 user에 HR 채움 / email이 기존 user와 일치하면 그 user에 merge / 아니면 인증수단 없는(hashed_password null·oauth 없음) 새 user 행 생성.
- 디렉터리 관리 API는 `/api/v1/members`를 폐기하고 **`/api/v1/users`로 통합**(기존 members 도메인을 User 모델 기반으로 재목적화). 쓰기 권한 `members:write` → **`users:write`** 개명.
- 로그인 시 `_link_member_if_unlinked`(eager Member 연결)는 **제거** — 사전 등록 직원은 이미 같은 user 행이므로, JIT가 email로 그 행을 찾아 OAuth만 붙이면 된다.
- 등급 참조([[ADR-0005]])의 raw SQL(`count_members_with_grade`/`cascade_rename_members`)은 `members` → `users` 테이블로 repoint.

## 맥락 / 왜
member-management 작업은 의도적으로 둘을 분리했다: 관리자가 직원을 **로그인 전에 사전 등록**하고(Member, user_id null), 로그인 시 email로 User에 연결. 분리의 가치는 "아직 계정 없는/외부 사람"을 모델링하는 것이었다.

그러나 이 시스템은 **단일 테넌트 사내 도구**다 — Teams(Entra) SSO로 들어오는 사용자는 전원 회사 직원이다(ADR-0003의 tid 강제). 따라서 "User ≠ 직원"인 경우가 실질적으로 없고, 두 테이블 분리는 **JIT 연결 훅·email 매칭·user_id FK·교차 도메인 raw SQL**이라는 상시 복잡도만 남긴다. 사전 등록 케이스는 "인증수단 없는 user 행"으로 보존되므로 분리 없이도 충족된다.

## 고려한 대안
- **분리 유지(현 status quo)** — 외부/미가입 인물 모델링엔 맞지만 단일 테넌트 사내 도구엔 잉여 복잡도. 기각(사용자 판단).
- **members를 canonical로 살리고 auth 컬럼 흡수** — `refresh_tokens`/`oauth_accounts`/`user_roles`가 전부 `users.id` FK라 auth 코어 FK를 전부 재지정해야 함. 위험 과다로 기각, users 보존 채택.
- **members를 users의 DB View로** — 읽기는 되나 CRUD/마이그레이션이 꼬임. 기각.
- **users.grade를 FK로(ADR-0005 재검토)** — 이번 범위 밖. grade는 이름 문자열 참조 유지(병합 후엔 users.grade).

## 결과
- **CONTEXT.md의 `구성원(Member)`·`구성원 연결(Member linking)` 정의가 폐기/개정된다** — Member ≡ (HR 필드를 가진) User. "Member와 User는 별개", "user_id로 연결" 같은 서술은 더 이상 유효하지 않다(이 작업 fg-learn에서 글로서리 개정).
- `users` 테이블이 곧 **전 직원 디렉터리**가 된다 — 일부 행은 인증수단 없음(미로그인 사전등록), 일부는 HR 없음(시스템/테스트 계정). HR 컬럼 nullable이 이를 허용.
- `employee_no`가 nullable·UNIQUE가 되므로(부분 unique), 직원에게만 EMP-NNN 자동 부여, 비직원 행은 null.
- sealed 작업(member-management·members-list·grades) 다수를 건드린다 — 회귀 위험이 이 작업의 최대 리스크. 마이그레이션의 members drop은 모든 코드 repoint 후 마지막에 수행.
- 되돌리려면(다시 분리) 또 한 번의 대규모 마이그레이션이 필요하다.
- **사람 이름은 별도 `name` 컬럼을 두지 않고 기존 `users.display_name`을 재사용한다**(실행 시 결정 — 계획 결정 #7이 위임). 단일 인간 이름에 `name`/`display_name` 두 컬럼을 두면 권위 충돌·drift가 생기므로 하나로 합쳤다. API 계약은 `name`을 유지한다: `UserResponse.name`은 `display_name`을 매핑해 노출하고, `UserCreate.name`은 `display_name`에 저장한다. 그 결과 디렉터리 응답의 `name`을 포함한 HR 필드가 전부 nullable이다(`display_name`이 nullable이므로) — 프론트는 `?? ''` 등으로 수용한다. 별도 `name`이 필요해지면 마이그레이션이 필요하다.
