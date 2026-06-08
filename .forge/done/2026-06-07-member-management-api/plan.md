<!-- forge-slug: member-management-api --> <!-- task: 3 --> <!-- tdd: off --> <!-- priority: high -->

# 구성원 관리 API (Member management)

`/app/members-list` 화면(현재 mock)을 떠받칠 FastAPI 백엔드. 구성원(Member)은 auth User와 **별개의 조직/HR 레코드**로, 관리자가 사전 등록하고 사용자가 로그인하면 이메일로 1:1 연결된다.

## 배경 / 한 줄 요약

- 프론트 `web/src/features/office/screens/members.tsx`가 in-memory mock(`MEMBERS_DATA`)으로 목록/상세/편집/검색/필터/정렬/페이지네이션/요약카드를 이미 구현. 이걸 받칠 실제 API가 없다.
- auth 도메인엔 이미 `User`/RBAC(`roles`·`permissions`·`require_permission`)·JIT OAuth 프로비저닝이 있다. **재사용**하고, 새 `domains/members/`를 기존 레이어 관행(router→service→repository→models + schemas)대로 추가한다.

## Source of truth (글로서리 / 기존 코드)

- `.forge/CONTEXT.md` → **구성원(Member)**, **구성원 연결(Member linking)**, **등급(Grade)**, **JIT 프로비저닝** (이번 그릴링에서 등재/대조 완료).
- 기존 코드 계약(준수):
  - `api/src/domains/auth/security.py` — `get_current_user`(읽기 게이트), `require_permission("members:write")`(쓰기 게이트).
  - `api/src/domains/auth/service/auth_service.py` — `login()` / `oauth_provision_user()` (여기에 eager 연결 훅 삽입).
  - `api/src/core/exceptions.py` — `AppError` 계층(`ConflictError`/`NotFoundError`/`ForbiddenError`); 응답 envelope·도메인 코드 체계 없음, `{"detail": ...}`.
  - `api/src/main.py` — 앱 팩토리에서 `/api/v1` prefix로 라우터 등록.
  - SQLAlchemy 2.0 async(`AsyncSession`), Pydantic v2 schemas, Alembic(동기 psycopg2) — `task revision`으로 신규 리비전.

## 확정된 결정 (그릴링 결과)

1. **도메인 모델**: 별도 `members` 테이블. `user_id` nullable FK→`users.id`. auth 도메인 스키마 무변경. (Q1)
2. **로그인 정책**: 열린 프로비저닝 **유지**(매칭 Member 없어도 로그인 성공). Member는 HR 오버레이. JIT 정의 위반 없음 → ADR 불필요. (Q2)
3. **권한**: 읽기(목록·상세·통계·/me)=`get_current_user`(인증된 누구나), 쓰기(생성·수정·삭제)=`require_permission("members:write")`. (Q3)
4. **사번**: 서버 자동 생성 `EMP-NNN`(zero-padded 3자리, 최대 일련번호+1). 관리자 입력 불필요. (Q4)
5. **소속/직급**: 자유 텍스트 String 컬럼. 부서 목록은 distinct 파생. (Q4)
6. **등급**: enum `특급|고급|중급|초급`(DB는 String + Pydantic Literal/Enum 검증). (확정)
7. **API 범위**: 목록·상세·생성·수정·삭제(soft)·요약통계·/me·CSV 내보내기 전부. (Q5)
8. **admin 시드**: 신규 마이그레이션이 `members:write` permission + `admin` role(없으면 생성) + 연결을 시드. 특정 유저를 admin으로 만드는 건 범위 밖(기존 RBAC `user_roles` 삽입 / 테스트는 직접 부여). (Q6a)
9. **연결 메커니즘**: eager — `login()`·`oauth_provision_user()`에서 User 확정 후 미연결 Member를 email로 찾아 `user_id` 설정. auth→members 소폭 결합 허용. (Q6b)

### 관행으로 결정한 leaf (그릴링 미질의)

- **email 편집**: Member.email 수정 가능(UNIQUE 검증). 이미 `user_id` 연결된 경우 email 변경해도 연결 유지(연결은 user_id로 고정). 미연결 상태에서만 email이 매칭 키.
- **목록 응답 shape**: `{ items: [...], total, page, page_size, total_pages }`. 서버사이드 검색(q: name/사번/dept/rank/email/phone 부분일치)·필터(department, grade)·정렬(no/name/dept/rank/grade + asc/desc)·페이지네이션(기본 page_size=10).
- **soft delete**: `members.is_active=false`. 기본 목록·통계는 활성만. 삭제 시 연결된 user는 건드리지 않음.
- **검증**: email `EmailStr`, grade enum, 나머지 문자열 필수/길이 제한. 사번은 서버 생성이라 생성 요청 바디에서 제외.
- **이번 달 신규**: `members.created_at`이 당월인 건수.

## 슬라이스 (작업 단위)

### S1 — members 도메인 스키마 + 마이그레이션
- `domains/members/models/member_models.py`: `Member`(id UUID PK, user_id nullable FK→users.id, employee_no String UNIQUE, name, department, rank, grade, phone, email String UNIQUE, is_active default true, created_at/updated_at).
- `task revision`로 신규 Alembic 리비전: `members` 테이블 생성 + `members:write` permission·`admin` role·role_permission 시드(idempotent, 0001 수정 금지).
- **완료 기준**: `task migrate` 성공, `members` 테이블·시드 row가 DB에 존재(`select`로 확인).

### S2 — repository + service (CRUD·목록·통계·사번 생성)
- `MemberRepository`: list(필터/정렬/페이지), get_by_id, get_by_email, get_by_user_id, create, update, soft_delete, next_employee_no, link_to_user(email, user_id), stats 집계.
- `MemberService`: 위 비즈니스 로직 + 사번 자동 생성 + 충돌(ConflictError: email/사번 중복)·부재(NotFoundError) 처리.
- **완료 기준**: 서비스 단위테스트(`tests/members/`, 마커 unit) — 사번 생성, email 중복 시 ConflictError, soft delete가 목록서 제외, stats 등급분포 합 = 활성 총수. 통과.

### S3 — router (`/api/v1/members`) + main 등록
- `GET /members`(목록, 읽기 게이트), `GET /members/stats`, `GET /members/me`, `GET /members/{id}`, `POST /members`(쓰기), `PATCH /members/{id}`(쓰기), `DELETE /members/{id}`(쓰기), `GET /members/export`(CSV, 읽기). `_get_service` DI 헬퍼 + main.py 라우터 등록.
- 라우트 순서 주의: `/me`·`/stats`·`/export` 정적 경로를 `/{id}` 앞에 둔다.
- **완료 기준**: 통합테스트(마커 integration) — 미인증 401, 비-admin의 POST 403, admin POST→GET 라운드트립, `/me`가 연결 Member 반환. 통과.

### S4 — 로그인 시 eager Member 연결
- `AuthService`에 `_link_member_if_unlinked(user)` 헬퍼(members repo 경유) 추가, `login()`·`oauth_provision_user()`에서 호출. 미연결 + email 매칭 Member 있을 때만 `user_id` 설정.
- **완료 기준**: 단위/통합테스트 — 매칭 Member 있는 email로 로그인 시 `Member.user_id`가 채워지고 `/members/me`로 확인. 매칭 없으면 로그인 성공·연결 없음(기존 JIT 동작 회귀 없음). 통과.

## Non-goals (이번엔 안 함)

- 프론트엔드 mock → 실 API 연동(`members.tsx`의 `MEMBERS_DATA` 교체). 별도 작업.
- 특정 사용자에게 admin role 부여하는 UI/부트스트랩(env ADMIN_EMAILS 등). 기존 RBAC 소관.
- departments/rank를 별도 엔티티로 정규화.
- 명시적 계정 연결(재인증) 플로우, email 변경 시 자동 재연결.
- CLAUDE.md의 stale 문구("RBAC 미구현") 정정 — 문서 드리프트, 범위 밖(보고만).
- 부서별 권한/메뉴 권한(레거시 Spring 개념) 이식.

## 리스크 / 주의

- **사번 자동 생성 동시성**: "최대+1"은 동시 INSERT 시 충돌 가능. UNIQUE 제약으로 막고 IntegrityError→ConflictError 재시도 또는 명시 에러. dev 규모에선 수용.
- **auth→members 결합**: 연결 훅이 members repo에 의존. import 방향(auth가 members 참조)만 한쪽으로 유지, 순환 금지.
- **테스트 환경**: Python 3.12로 실행(3.14는 langchain 비호환). 사전 게이트 빚(retro 기록: ruff 7건·stale Makefile 테스트·환경)은 이 작업 외 원인 — "내 변경분 신규 위반 0"만 DoD, 사전 위반은 보고만.
