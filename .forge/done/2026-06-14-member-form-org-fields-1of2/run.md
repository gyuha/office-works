<!-- forge-slug: member-form-org-fields-1of2 -->
# run.md — 구성원 폼 조직 필드 (1/2) 백엔드

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행 + TDD

## 계획대로 된 것
- **S1 스키마** — `UserCreate.employee_no: str|None`(optional, max16, 빈문자→None via `blank_employee_no_to_none`). `UserUpdate.employee_no: str|None`(strip_text 검증에 포함).
- **S2 서비스** — `create`: `employee_no = payload.employee_no or next_employee_no()` (제공 시 사용·비면 자동). 중복은 기존 `IntegrityError → ConflictError`로 409. `update`: `model_dump(exclude_unset)` + 기존 `repo.update(changes)`가 employee_no를 적용하고 IntegrityError→ConflictError로 충돌 처리 → **서비스 추가 변경 불필요**.
- **S3 import** — `IMPORT_HEADERS`에 `employee_no`를 첫 컬럼으로 추가(템플릿 자동 반영). `parse_import_rows`: employee_no optional, **파일 내 사번 중복 → 오류 행**(`seen_employee_nos`). DB 사번 중복은 import 엔드포인트 create 루프의 ConflictError로 수집(기존 패턴).
- **S4 검증** — 변경 파일 ruff·mypy strict 통과. `task test`: **697 passed, 커버리지 79.75%(≥70%)**. import 테스트 11개(+employee_no 빈값/제공/파일내중복), 서비스 테스트(+제공 사번 사용).

## 분기(Divergence)
- 없음 — 계획대로. update는 기존 일반 changes 경로가 employee_no를 그대로 처리해 서비스 코드 추가가 불필요했음(계획 S2의 "필요 시" 사전체크는 IntegrityError로 충분).

## 현장 결정(설계 판단)
- **중복 사번 = IntegrityError→ConflictError 재사용.** 별도 `get_by_employee_no` 사전체크 없이 기존 DB unique + IntegrityError 변환으로 409 처리(create/update 공통). 메시지는 "same email or employee number".
- **employee_no 빈값 정규화.** UserCreate에서 `""`→`None`으로 변환해 "비우면 자동생성" 의미를 스키마 레벨에서 보장(폼/엑셀 빈칸 모두 동일 처리).
- **import 사번 첫 컬럼.** 템플릿 가독성(사번이 맨 앞) + 파일 내 사번 중복도 파싱 단계에서 차단.

## 코드 리뷰 메모
- 변경: user_schemas(employee_no 2곳), user_directory_service(create 1줄), user_import(헤더+dedup), 테스트(import 갱신+추가, service 추가). 공개 API 스키마 확장 + 데이터 생성 경로지만 unique 유지·마이그레이션 없음. 핵심 로직 단위 테스트 커버. 게이트 통과.
- 선재 결함(무관): test_user_service.py I001(기존 import 정렬 — HEAD에도 존재, 내 추가는 함수뿐), task test 12 실패(stale Makefile 테스트 — CLAUDE.md 명시).

## 미해결/UAT로 확인할 것 (대부분 자동 검증됨)
- 자동: 스키마·파싱·서비스 단위 테스트 green, 커버리지 79.75%.
- 실제 HTTP(POST /users 제공 사번, PATCH 사번 수정, import 사번 컬럼·중복 거부)는 2/2 프론트 UAT에서 함께 확인.
