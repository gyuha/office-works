<!-- forge-slug: team-management-api-1of3-backend --> <!-- task: 11 --> <!-- tdd: off --> <!-- part: 1/3 -->

# 팀관리 백엔드 — teams 도메인 + users 단일 소속 축 전환 + 시드

## Goal / Non-goals
- Goal: 자기참조 계층 `teams` 테이블과 `/api/v1/teams` CRUD·구성원 배정 API를 신설하고, `users`를 단일 소속 축(team_id, department 폐기)으로 전환하며, 팀관리 화면의 mock 데이터(팀 14개 + 직원 25명)를 `task seed`로 재현한다.
- Non-goals:
  - 다대다 소속(겸직) — ADR-0008에서 기각.
  - 팀 이동 API(parent_id 변경) — mock에 없는 동작. 따라서 사이클 방지 검증도 불필요(생성 시 parent는 기존 팀만 지정 가능).
  - 기존 dev DB users의 department 값 → 팀 자동 변환(기존 행은 무소속 시작, ADR-0008 결과 항목).
  - 프론트 연동(2of3·3of3), admin role 부트스트랩(기존 갭, CONCERNS §3), employment_type 시드 매핑(mock에 없음 — null).

## Source of truth
- Glossary terms: `팀(Team)`, `구성원(Member)`, `등급(Grade)` in .forge/CONTEXT.md
- Related ADRs: .forge/adr/0008-team-single-affiliation-drop-department.md (핵심), 0006(Member ≡ User·인증수단 없는 디렉터리 행), 0005(grade 이름 참조)
- Definition of Done: 마이그레이션·시드 적용 후 `GET /api/v1/teams`가 팀 14개와 직속 인원수를 반환하고, 시드 직원 25명(배정 20·무소속 5)이 users에 존재하며, `task test` 전체 green + 변경분 ruff/mypy clean.

## 확정 결정 (그릴링 합의)
1. 연결 모델 **1:N** — `users.team_id` FK(nullable, ondelete SET NULL). M:N 기각.
2. mock의 2팀 소속 4명은 **더 깊은 팀 우선**으로 단일 귀속(동점은 mock 정의 순서상 첫 등장): 이수연→기획2Part, 윤서준→CTO, 황도윤→개발2팀, 조하늘→전략컨설팅실.
3. **department 컬럼 drop** — 스키마·CSV·테스트의 부서 표면 제거(ADR-0008).
4. 팀 삭제 = **하위 팀 전체 cascade + 소속 구성원 무소속화**(mock 확인 모달과 동일 시맨틱).
5. 쓰기 게이트 = **`require_permission("users:write")` 재사용**, 읽기 = `get_current_user`.
6. 시드 이메일 = **이름 로마자 표기** `이름.성@office.local`(아래 고정 매핑), upsert 키는 `employee_no`.
7. `api/scripts/seed.py`의 "users는 시드 범위 밖" docstring 선언을 개정 — **인증수단 없는 디렉터리 행은 캐노니컬 데이터셋에 포함**(인증 계정·oauth·토큰은 여전히 금지).

## Work slices
- [ ] S1. 마이그레이션 `0012`(down_revision=0011, 미커밋 0010/0011 뒤에 연결) — `teams`(id `tem_` prefix → `core/ids.py`에 `TEAM = "tem"` 추가, name String(64) NOT NULL, parent_id self-FK ondelete CASCADE nullable, created_at/updated_at) 생성 + `users.team_id` FK(ondelete SET NULL, nullable) 추가 + `users.department` drop(downgrade에서 nullable로 복원, 데이터는 비복원 — ADR-0008 명시). — 완료기준: `alembic upgrade head` / `downgrade -1` / 재-upgrade 멱등, 라이브 DB 적용 확인.
- [ ] S2. `domains/teams/` 4-레이어 신설(models/schemas/repository/service/router, main.py 등록 `/api/v1/teams`) — 엔드포인트: `GET /teams`(flat 목록 + direct_member_count), `POST /teams`{name, parent_id?}(parent 미존재 404), `PATCH /teams/{id}`{name}, `DELETE /teams/{id}`(서브트리 cascade + 구성원 SET NULL), `GET /teams/{id}/members`(직속 구성원 — 이름·사번·직급·등급·연락처 포함), `PUT /teams/{id}/members/{user_id}`(배정 — 타 팀 소속자는 이동), `DELETE /teams/{id}/members/{user_id}`(무소속화). 쓰기 4종에 `users:write`. — 완료기준: teams 단위·통합 테스트 green(트리 cascade 삭제·이동 시맨틱·404/403 케이스 포함). (depends: S1)
- [ ] S3. users 도메인 개편 — `user_schemas.py`에서 department 제거, `UserCreate/UserUpdate`에 team_id(존재 검증, 미존재 404), `UserResponse`에 team_id·team_name(조인) 추가, CSV export 부서 컬럼→팀 컬럼, 기존 users 테스트 보정, `api/openapi.json` 재생성. — 완료기준: users 도메인 테스트 green + openapi.json에 department 부재·team 필드 존재. (depends: S1)
- [ ] S4. 시드 확장(`api/scripts/seed.py`) — 팀 14개(자연키: 루트부터의 name 경로, 멱등 upsert) + 직원 25명 upsert(키 employee_no; display_name·rank·grade·phone은 mock 그대로, email은 아래 매핑, hashed_password/oauth 없음) + 팀 배정 20명·무소속 5명(임나영·오지은·허수아·배성준·류아인) + docstring 범위 선언 개정. — 완료기준: `task seed` 2회 연속 실행이 동일 상태(멱등), DB 검증 쿼리로 팀 14·직원 25·배정 20 확인. (depends: S2, S3)
- [ ] S5. 전체 회귀 — `task test` green(커버리지 게이트 70% 통과), 변경분 ruff/mypy clean(사전 존재 lint 부채 12건은 비대상 — CONCERNS §1). — 완료기준: 테스트 전체 통과 출력 확보. (depends: S4)

## 시드 고정 데이터 (실행 시 재해석 금지)
팀 트리(이름, 부모): 대표이사(루트) > 전무 > [경영지원실, 연구실, 전략컨설팅실, CTO > [개발1팀, 개발2팀, 개발3팀], PM전략실, 기획팀 > [기획1Part, 기획2Part], 디자인실]

| 사번 | 이름 | email local-part | 직급 | 등급 | 연락처 | 팀 |
|------|------|------------------|------|------|--------|-----|
| EMP-001 | 김지훈 | jihoon.kim | 대리 | 고급 | 010-1234-5678 | 개발1팀 |
| EMP-002 | 이수연 | suyeon.lee | 과장 | 특급 | 010-2345-6789 | 기획2Part |
| EMP-003 | 박민준 | minjun.park | 사원 | 중급 | 010-3456-7890 | 개발3팀 |
| EMP-004 | 최유진 | yujin.choi | 차장 | 고급 | 010-4567-8901 | 경영지원실 |
| EMP-005 | 정다은 | daeun.jung | 과장 | 특급 | 010-5678-9012 | 개발1팀 |
| EMP-006 | 강태양 | taeyang.kang | 대리 | 중급 | 010-6789-0123 | 디자인실 |
| EMP-007 | 윤서준 | seojun.yoon | 부장 | 특급 | 010-7890-1234 | CTO |
| EMP-008 | 임나영 | nayoung.lim | 사원 | 초급 | 010-8901-2345 | (무소속) |
| EMP-009 | 홍준서 | junseo.hong | 주임 | 중급 | 010-9012-3456 | 기획팀 |
| EMP-010 | 오지은 | jieun.oh | 팀장 | 고급 | 010-0123-4567 | (무소속) |
| EMP-011 | 신현우 | hyunwoo.shin | 과장 | 고급 | 010-1234-5670 | PM전략실 |
| EMP-012 | 장미래 | mirae.jang | 팀장 | 특급 | 010-2345-6780 | 디자인실 |
| EMP-013 | 노지훈 | jihoon.noh | 사원 | 초급 | 010-3456-7891 | 개발1팀 |
| EMP-014 | 허수아 | sua.heo | 대리 | 고급 | 010-4567-8902 | (무소속) |
| EMP-015 | 조하늘 | haneul.cho | 차장 | 중급 | 010-5678-9013 | 전략컨설팅실 |
| EMP-016 | 권태오 | taeo.kwon | 부장 | 특급 | 010-6789-0124 | PM전략실 |
| EMP-017 | 서보람 | boram.seo | 대리 | 중급 | 010-7890-1235 | 개발2팀 |
| EMP-018 | 문가영 | gayoung.moon | 주임 | 고급 | 010-8901-2346 | 경영지원실 |
| EMP-019 | 배성준 | seongjun.bae | 팀장 | 고급 | 010-9012-3457 | (무소속) |
| EMP-020 | 유은서 | eunseo.yoo | 사원 | 중급 | 010-0123-4568 | 디자인실 |
| EMP-021 | 황도윤 | doyun.hwang | 주임 | 고급 | 010-1111-2222 | 개발2팀 |
| EMP-022 | 송채원 | chaewon.song | 사원 | 중급 | 010-3333-4444 | 기획1Part |
| EMP-023 | 한지민 | jimin.han | 대리 | 고급 | 010-5555-6666 | PM전략실 |
| EMP-024 | 전현서 | hyunseo.jeon | 과장 | 특급 | 010-7777-8888 | 디자인실 |
| EMP-025 | 류아인 | ain.ryu | 주임 | 초급 | 010-9999-0000 | (무소속) |

이메일 도메인: `@office.local`. 파생 검증치: 대표이사 직속 0명·전무 직속 0명·연구실 0명(중복 소속 해소 파생 — ADR-0008), 대표이사 하위 포함 20명.

## 리스크 / 주의
- 미커밋 워킹트리 위에서 작업(0010/0011 마이그레이션·memo 기능 미커밋 — CONCERNS §0). 0012는 0011 뒤에 연결해야 한다.
- 공유 DB 마이그레이션 적용은 merge-members retro 교훈대로 **`alembic upgrade --sql` 미리보기 → 사용자 승인 → 적용** 순서를 따른다.
- `task lint`는 사전 부채로 이미 red(CONCERNS §1) — 게이트는 "변경분 clean + task test green"으로 잡는다(merge-members retro 패턴).
