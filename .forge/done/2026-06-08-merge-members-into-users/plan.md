<!-- forge-slug: merge-members-into-users --> <!-- task: 9 --> <!-- tdd: off --> <!-- priority: high -->

# members ↔ users 테이블 병합 (단일 person 테이블)

`members`와 `users`를 하나의 `users` 테이블로 합친다. 단일 테넌트 사내 도구라 Teams 로그인 사용자는 전원 직원 — Member/User 분리가 잉여 복잡도다. ([[ADR-0006]])

## 배경 / 강결합 주의
- member-management가 세운 분리(Member ≠ User, `members.user_id`→users, 로그인 시 email 연결)를 철회. sealed 작업 **auth/teams-sso·members·grades**와 프론트가 이 분리에 의존 → **회귀 위험이 이 작업 최대 리스크**.
- 결합 지점: auth `_link_member_if_unlinked`(login/oauth eager 연결), org grades raw SQL(`count_members_with_grade`/`cascade_rename_members` on `members`), 프론트 `members.tsx`(/api/v1/members, MemberResponse).
- **branch 체인**: 현 작업은 `feat/member-management-api`…`feat/org-config`로 stacked된 미머지 브랜치 위에 올라간다(8개 작업분). 이 위에 새 브랜치로.

## Source of truth
- `.forge/adr/0006-merge-members-into-users.md` — 병합 결정(방향·backfill·API 통합·권한 개명·linking 제거). **이 작업의 권위 결정.**
- `.forge/adr/0005-member-grade-name-reference-not-fk.md` — grade 이름 참조(병합 후 `users.grade`).
- `.forge/CONTEXT.md` — 구성원(Member)/구성원 연결 정의(이 작업 fg-learn에서 개정 예정).
- 기존 코드: `api/src/domains/auth/models/auth_models.py`(User), `domains/members/*`(재목적화 대상), `domains/auth/service/auth_service.py:480 _link_member_if_unlinked`, `domains/org/repository/grade_repository.py`(members raw SQL), `web/src/features/office/screens/members.tsx`.

## 확정된 결정 (그릴링)
1. **단일 `users` 테이블, HR 컬럼 nullable** 추가(employee_no·name·department·rank·grade·phone). 인증전용/시스템 행은 HR null 허용. (Q1)
2. **병합 방향: users 보존 + HR 흡수**(auth FK 보존). members→users backfill **email dedup**(user_id 있으면 그 user / email 일치하면 merge / 아니면 인증수단 없는 새 user), 그 후 members drop. (Q2)
3. **API: `/api/v1/members` 폐기 → `/api/v1/users` 통합**. members 도메인을 User 모델 기반 users 디렉터리로 재목적화(list/stats/create/update/delete/me/export). (Q3/Q4)
4. **권한 `members:write` → `users:write` 개명**(마이그레이션이 permission rename + admin 링크 유지). (Q4)
5. **`_link_member_if_unlinked` 제거** — 사전등록 직원은 같은 user 행, JIT가 email로 찾아 oauth만 부착. (Q2)
6. **grades 결합 repoint** — raw SQL `members`→`users`. (ADR-0005 유지, 대상 테이블만 변경)
7. employee_no: nullable + UNIQUE(부분), 직원에게만 EMP-NNN 자동. name: members.name → users.name(또는 display_name 정합 — 실행 시 결정, 단일 인간 이름).

## 슬라이스 (순차 — members drop은 마지막)
### S1 — 스키마: users에 HR 컬럼 추가 + members→users backfill (members 유지)
- 신규 마이그레이션: users에 employee_no/name/department/rank/phone/grade nullable 추가(+employee_no UNIQUE). members 각 행을 email dedup 규칙으로 users에 backfill. `members:write`→`users:write` permission rename(admin 링크 유지). **members 테이블은 아직 drop 안 함**(중간 파손 방지). User 모델에 HR 컬럼 반영.
- 완료: `task migrate` 성공, users에 HR 컬럼·기존 member 데이터 반영(SELECT 확인), users:write 권한 admin 연결, members 데이터 보존.

### S2 — 백엔드: users 디렉터리 도메인 + 결합 repoint + linking 제거
- members 도메인을 User 모델 기반으로 재목적화: `/api/v1/users` CRUD(list 검색/필터/정렬/페이지, stats[departments 포함], create[직원, employee_no 자동], update, soft delete, me, CSV export), 읽기=get_current_user/쓰기=`require_permission("users:write")`. 구성원=employee_no 있는 user(목록 필터).
- auth `_link_member_if_unlinked` + 호출 2곳 제거. org grades raw SQL `members`→`users` repoint. grade 검증(member create)도 users 기반으로.
- 테스트: 기존 members 테스트를 users로 이관·갱신, auth/grades 회귀 0.
- 완료: `pytest tests/`(auth+users+org) 통과, `/api/v1/users` 401/403/CRUD/stats/me/export 통합테스트, grade rename cascade가 users.grade로 동작.

### S3 — 프론트: /users API repoint
- `task gen-api` 재생성. `members.tsx`를 `/api/v1/users` 엔드포인트·새 타입으로 repoint(목록·상세·추가·편집·삭제·CSV, 등급 동적 유지). 라우트/화면 키는 유지 가능(`members-list`).
- 완료: `pnpm typecheck` 0·`build` 성공·변경분 Biome clean.

### S4 — members 테이블·죽은 코드 drop + 검증
- 신규 마이그레이션으로 `members` 테이블 drop(이제 참조 없음). 죽은 members 도메인 잔재·테스트 제거. CLAUDE.md/문서의 members 언급 정리(필요 최소).
- 완료: 전체 테스트 통과, `task migrate` down/up 멱등, 앱 라이브 기동(`/api/v1/users` 401·members 경로 부재).

## Non-goals
- users.grade를 물리 FK로 전환(ADR-0005 유지, 이름 문자열).
- RBAC/role 체계 변경, 인증 플로우(JIT/토큰) 자체 변경(연결 훅 제거 외).
- 비직원 user 행 정리 UI.
- 브랜치 머지(별개).

## 리스크
- **sealed auth 코어 + members + grades + 프론트 동시 변경** — 회귀 위험 최대. 각 슬라이스 끝 기존 테스트 전체 재실행이 게이트. 실행 시 코드리뷰 페이즈 필수(auth/마이그레이션/데이터 변환).
- **backfill 데이터 정합** — email dedup 누락 시 UNIQUE 충돌 또는 중복 직원. linked/email-match/신규 3분기 + 이미 로그인한 직원(user_id 세팅됨) 케이스 검증.
- members drop을 마지막 슬라이스로 미뤄 중간 파손 방지(S1~S3 동안 members 테이블 잔존).
- admin role 부트스트랩 미해결(별건) — users:write UAT도 동일 제약.
