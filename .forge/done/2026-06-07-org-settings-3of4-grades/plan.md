<!-- forge-slug: org-settings-3of4-grades --> <!-- task: 7 --> <!-- tdd: off --> <!-- part: 3/4 --> <!-- priority: medium -->

# 조직 설정 ③/④ — 등급 체계(grades) DB 승격 + members.grade 연동 ⚠️리스크

`/app/org`의 **등급 체계** 탭을 read-only 표시에서 **관리 테이블(CRUD)**로 승격하고, **봉인된 members 작업의 `grade`를 이 테이블 기준으로 전환**한다. 이 시리즈에서 가장 위험한 part — sealed 코드(members API·프론트)를 건드린다. **재그릴링 완료(2026-06-07)로 연동 방식·삭제 정책·프론트 범위 확정됨.**

## 배경 / 충돌
- 현재 members `grade`는 **고정 enum** `특급|고급|중급|초급`(Pydantic `Literal`, `members.grade` = String(8) 컬럼). `member_management`·`members_list_api` 작업과 프론트 `GRADE_CFG`(이름→**tailwind 토큰 클래스** 배지)가 이 4값에 의존.
- settings.tsx `GradesTab`은 현재 read-only(`GRADE_INFO` 상수: name·color·bg·bd·desc 표시, hex). 사용자가 DB CRUD로 승격 선택.

## Source of truth
- `.forge/adr/0004-frontend-openapi-generated-client-heyapi.md` — 프론트는 hey-api 생성 클라이언트. `task gen-api` 재생성 + 생성 query/mutation options.
- 기존: `domains/org/`(part 1/2 산출, 없으면 골격 생성), `domains/members/`(grade 사용처 — `schemas/member_schemas.py`의 `Grade` Literal·`MemberCreate.grade`·`MemberResponse.grade`, service 검증, repository stats grade_distribution), `web/src/features/office/screens/members.tsx`(`GRADE_CFG`·등급 칩 필터·배지·등급분포 카드), settings.tsx `GradesTab`·`GRADE_INFO`.
- 글로서리: fg-learn에서 **CONTEXT.md의 `등급(Grade)` 항목을 "고정 4값(enum)" → "관리되는 테이블(이름·색·설명·순서; members.grade가 이름으로 참조)"으로 개정**.

## 확정된 결정 (재그릴링)
1. **도메인** `domains/org/`. **권한** 읽기=`get_current_user`(members 폼 등급 드롭다운·색 매핑에 필요) / 쓰기=`require_permission("org:write")`(part 1이 시드, idempotent 보장).
2. **엔티티 `grades`**: id UUID, `name` String unique NOT NULL, `color` String(text hex), `bg` String(배경 hex), `border` String(테두리 hex), `description` Text, `sort_order` int. 시드 4개 = `GRADE_INFO`(초급/중급/고급/특급 + 색 3종 + desc, sort_order).
3. **members.grade 연동 = 이름 String 유지 + 검증 + rename cascade** (Q1):
   - `members.grade` 컬럼은 **String 유지**(데이터·계약 불변). Pydantic `Literal` enum 제약 제거 → **service에서 grades.name 존재 검증**(MemberCreate/Update의 grade가 grades에 있는 이름인지). `MemberCreate.grade`·`MemberResponse.grade` 타입은 String(enum→str 폭 넓힘, 계약 호환).
   - **등급 rename 시 같은 트랜잭션에서 `UPDATE members SET grade=:new WHERE grade=:old` cascade** → drift 없음.
   - **members API 계약 불변** → hey-api 생성 타입 충격 최소(grade 필드가 enum→string 으로만 완화).
4. **삭제 정책 = 참조 중이면 차단(409)** (Q2): 해당 등급 name을 가진 member가 1명이라도 있으면 `ConflictError`. 관리자가 먼저 재배치.
5. **프론트 완전 동적화** (Q3): members.tsx의 등급 **배지·필터 칩·등급분포 카드**를 `GET /grades`(name+hex)에서 동적으로. 하드코딩 `GRADE_CFG`(tailwind 클래스) 제거 → grades API의 hex로 **inline style** 배지(GradesTab과 동일 방식). 임의 신규 등급도 올바르게 렌더.

## 슬라이스
### S1 — grades 스키마 + 마이그레이션 + 시드
- `domains/org/models`에 `Grade`(위 컬럼). 신규 리비전: grades 테이블 + 4개 시드(GRADE_INFO) + org:write/admin idempotent 보장. (members.grade 데이터는 이미 이름 문자열이라 백필 불필요.)
- 완료: `task migrate` 성공, grades 4행(색·순서 포함) DB 확인.

### S2 — org grades repo/service + members.grade 검증 전환 + rename cascade + 테스트
- `GradeService`(list ordered, create, update[name/색/desc; name 변경 시 members cascade], delete[참조 시 ConflictError], reorder). members `schemas/member_schemas.py`의 `Grade` Literal → str, members service에 grade 존재 검증(grades 조회).
- 완료: `pytest tests/org/ tests/members/`(unit+integration) — grades CRUD, 잘못된 grade로 member 생성 거부, rename 시 members.grade 동반 변경, 참조 중 삭제 409. **members 회귀 없음**(기존 members 테스트 전부 통과).

### S3 — router(`/api/v1/grades`) + main + 통합테스트
- GET(get_current_user) / POST·PATCH/{id}·DELETE/{id}·PATCH order(org:write). 삭제 시 참조 검사, rename 시 cascade.
- 완료: integration 401/403/CRUD/rename-cascade/참조삭제차단 통과.

### S4 — 화면 연동 (GradesTab CRUD + members.tsx 동적 등급)
- `task gen-api` 재생성. GradesTab을 CRUD로(목록·추가·편집[이름/색/설명]·삭제·순서). members.tsx의 `GRADE_CFG`·`GRADES` 하드코딩 제거 → `GET /grades` 기반 동적 배지(inline hex)·필터 칩·등급분포 카드. 성공 시 invalidate+toast.
- 완료: `pnpm typecheck` 0·`build` 성공·변경분 Biome clean. **members 화면 등급 표시·필터 회귀 없음**(UAT — 4개 기존 등급이 동일하게 보이고, 신규 등급 추가 시 members 필터/배지에 반영).

## Non-goals
- 등급별 권한/급여 정책.
- `members.grade`를 UUID FK 컬럼으로 물리 전환(이름 String + 검증 + cascade로 충분; 물리 FK는 미채택).
- 등급 삭제 시 자동 재배치(차단만; 재배치는 관리자 수동).

## 리스크 (이 part 전용 — 높음)
- **sealed members 광범위 의존**: grade Literal 제약·프론트 GRADE_CFG가 members API·화면 전반에 박혀 있음. S2(백엔드 검증 전환)·S4(프론트 동적화)에서 **기존 members 테스트·화면 회귀를 반드시 확인**.
- **rename cascade 트랜잭션**: 등급 이름 변경이 members 다수 행을 건드림 — 같은 트랜잭션·실패 시 롤백 보장.
- **프론트 렌더링 방식 전환**(tailwind 클래스 → inline hex): 기존 4등급의 시각적 동일성을 UAT로 확인(색 값이 GRADE_INFO와 일치하는지).
- Python 3.14 표준·`task gen-api` 흐름은 이전 작업에서 정합 완료.
