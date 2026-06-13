# RUN — 팀관리 백엔드 (team-management-api-1of3-backend)

실행일: 2026-06-11 · 실행 방식: 인라인 직접 실행(워크플로우 미사용 — 슬라이스 직렬 의존, 최근 retro 2건의 교훈 적용) · 실행 전 fg-map 전체 갱신(30커밋 stale 해소)

## 계획대로 된 것

- **S1 마이그레이션 0012** — teams(자기참조, parent CASCADE) + users.team_id(SET NULL) + department drop. `--sql` 미리보기 → 사용자 승인 → 라이브 적용, downgrade/재upgrade 멱등 검증 통과. 리비전 id 24자(≤32 제약 준수).
- **S2 teams 도메인** — 4-레이어 + 7개 엔드포인트(GET 목록+카운트 / POST / PATCH / DELETE / GET members / PUT·DELETE 배정) 계획대로. 쓰기 `users:write`, 읽기 `get_current_user`. main.py 등록.
- **S3 users 개편** — department 표면 전부 제거(스키마·필터·정렬·검색·CSV·stats), team_id/team_name 추가. openapi.json 재생성(리뷰어가 라이브 앱과 byte-identical 검증).
- **S4 시드** — 팀 14·직원 25(이메일 로마자 규칙) 고정 테이블 그대로. 2회 연속 실행 멱등 확인. DB 검증: 배정 20·무소속 5·대표이사 직속 0·기획2Part=이수연 — 계획의 파생 검증치와 정확히 일치.
- **S5 회귀** — 698 passed / 12 failed(전부 사전 존재 stale Makefile 테스트, 이 작업 무관) / 커버리지 78.49%(게이트 70% 통과). 변경분 ruff·mypy clean.

## 어긋난 것 / 현장 결정

1. **[설계 결정] User↔Team ORM relationship을 의도적으로 미선언** — 명시적 outerjoin/스칼라 조회로 team_name 제공. relationship 선언 시 auth만 import하는 모든 컨텍스트가 Team mapper 등록을 요구하게 되는 오염 방지.
2. **[예상 밖 1건] FK는 relationship 없이도 metadata 등록을 요구** — `users.team_id`의 ForeignKey("teams.id") 때문에 org 도메인 통합테스트(grade cascade)가 NoReferencedTableError로 실패. `domains/auth/models/__init__.py`에 메타데이터 등록용 Team import 추가로 해결(teams.models는 auth를 import하지 않아 순환 없음). 이 보정이 계획에 없던 유일한 파일.
3. **[기존 테스트 2곳 보정] (계획 범위 내)** — org grade 테스트의 `department=` kwarg 제거, users 단위테스트 fake repo를 team 계약으로 재작성.
4. **[조건부 코드리뷰 — 적대 2개 병렬: 정합성·보안 / API 계약] 실결함 4건 포착 → 인런 수정 + 고정 테스트 3개 추가:**
   - **ADV-1 (critical)**: `/users/stats`가 모든 호출 500 — `ORDER BY distinct(teams.name)` PG 문법 오류(리뷰어가 라이브 DB로 실증). fake repo 단위테스트라 SQL이 실행되지 않아 테스트가 못 잡았음 → `order_by(Team.name)` 수정 + 실DB stats 통합테스트 추가.
   - **ADV-2 (medium)**: 비활성/비직원 user 배정이 200인데 모든 읽기에 안 보이는 팬텀 쓰기 → ConflictError 409 가드 + 단위테스트 2개.
   - **ADV-3 (medium)**: 비유니크 정렬키 페이지네이션 불안정 → `User.id` tiebreaker.
   - **ADV-4 (low)**: 팀 삭제와 배정/생성 레이스 시 IntegrityError 500 → ConflictError 409 변환(users 도메인 패턴 정합).
   - API 계약 리뷰의 P0 3건은 전부 "프론트가 아직 구계약" — **2of3/3of3 분할의 의도된 중간 상태**(typegen이 2of3에서 시끄럽게 잡는 것이 의도된 실패 모드라고 리뷰어도 확인). 수정 비대상.
5. **[잔여 lint] 사전 존재 N802 2건**(memo 테스트 camelCase — 프로젝트 명명 규약 vs ruff 충돌, CONCERNS §1)은 범위 밖 유지.

## 리뷰 advisory — 후속 후보 (수정 안 함, 의식적 보류)

- **시드 드리프트 2종**: (a) 동일 이메일을 다른 employee_no가 선점하면 시드 전체 롤백(단일 트랜잭션), (b) 관리자가 팀명을 rename하면 재시드가 옛 이름 팀을 부활시키고 구성원을 옮김. dev 부트스트랩 한정 영향.
- **팀명 중복 무제약**: 같은 부모 아래 동명 팀 생성 가능(double-submit). (name, parent_id) UNIQUE + 409 후보 — 단 PG NULL 처리(NULLS NOT DISTINCT) 필요.
- **unassign 비멱등**: 더블클릭 제거 시 두 번째가 409. 멱등 204로 바꿀지 design choice.
- 직급 시드(사원·선임…)와 직원 rank(대리·과장…)가 불일치 — rank는 자유텍스트라 무해하나 positions 기반 드롭다운 생기면 안 맞음.

## 막힌 곳

없음. 공유 DB 쓰기 2회(마이그레이션·시드)는 모두 미리보기/검증 쿼리 → 사용자 승인 절차 준수.
