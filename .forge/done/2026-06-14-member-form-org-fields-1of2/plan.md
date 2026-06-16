<!-- forge-slug: member-form-org-fields-1of2 -->
<!-- task: 18 -->
<!-- tdd: on -->
<!-- part: 1/2 -->
# 구성원 폼 조직 필드 (1/2) — 백엔드 (사번 직접입력·수정 + import 사번)

## Goal / Non-goals
- Goal: 사번(employee_no)을 **직접 입력·수정**할 수 있게 백엔드를 확장한다. `UserCreate`에 optional `employee_no`(비면 서버 자동생성, 채우면 그 값 사용), `UserUpdate`에 `employee_no`(수정 가능) 추가. **DB unique 유지** — 중복 사번은 `ConflictError`(등록/수정 단계 오류). Excel import 템플릿에 `employee_no` 컬럼(첫 컬럼, optional) 추가 + **중복 사번(파일 내 + DB) 거부**(오류 행). 파싱/검증은 TDD.
- Non-goals: 프론트엔드(2/2 part), employee_no/email unique 제약 완화·마이그레이션(유지), email 중복 허용, 소속/직급의 백엔드 검증 추가(현행 — grade만 config 검증), 사번 포맷 정책 변경(기존 `EMP-NNN` 자동생성 유지, 수동값은 길이만 검증).

## Source of truth
- Glossary terms: none (사번/구성원 기존 개념)
- Related ADRs: none (unique 유지·마이그레이션 없음 — 관습적 확장)
- 기존 코드: `UserCreate`(name·department·rank·grade·phone·email, employee_no 없음), `UserUpdate`(employee_no 없음), `UserDirectoryService.create`(`next_employee_no()` 자동, `IntegrityError → ConflictError`로 email/employee_no 중복 처리), `_validate_grade`(grade만 config 검증). users 테이블 `employee_no` `String(16) unique nullable`. `user_import.py`(IMPORT_HEADERS, parse_import_rows, build_import_template — 직전 봉인).
- Definition of Done: `UserCreate.employee_no`(optional)·`UserUpdate.employee_no` 수용, create가 제공 사번 사용 또는 자동생성, 중복 사번 → `ConflictError`(409), update로 사번 변경 가능(중복 시 409). import 템플릿에 employee_no 첫 컬럼, 업로드 시 빈 값=자동생성/채운 값=사용, 파일 내 사번 중복·DB 사번 중복 → 오류 행. `task lint`·`task test`(커버리지 70%) 통과.

## Work slices
- [ ] S1. 스키마 (TDD) — `UserCreate`에 `employee_no: str \| None = None`(strip, max_length=16; 빈 문자열→None), `UserUpdate`에 `employee_no: str \| None`. 검증 단위 테스트(빈값 허용, 길이 초과 거부). — 완료기준: 스키마 단위 테스트 통과, mypy 통과.
- [ ] S2. 서비스 (TDD, fake repo) — `create`: `employee_no = payload.employee_no or await self._repo.next_employee_no()`. 제공 사번이 기존과 충돌 시 `ConflictError`(기존 `IntegrityError` 경로 + 필요 시 사전 `get_by_employee_no` 체크). `update`: changes에 employee_no 포함, 변경 시 중복 체크 → `ConflictError`. — 완료기준: 서비스 단위 테스트(제공 사번 사용·자동생성 fallback·중복 사번 conflict·update 사번 변경/충돌) 통과. (depends: S1)
- [ ] S3. import 사번 컬럼 (TDD) — `IMPORT_HEADERS`에 `employee_no`를 **첫 컬럼**으로 추가(`["employee_no","name",...]`). `build_import_template` 헤더 갱신. `parse_import_rows`: employee_no optional(빈값 허용), **파일 내 사번 중복 → 오류 행**(seen_employee_no set), 매핑을 `UserCreate(employee_no=...)`로. DB 사번 중복은 import 엔드포인트의 create 루프에서 `ConflictError`로 수집(기존 패턴). — 완료기준: import 단위 테스트(사번 빈값/제공/파일내 중복) 통과. (depends: S1)
- [ ] S4. 검증·정리 — 변경 파일 ruff·mypy strict 통과, `task test`(커버리지 70% 게이트) 통과. 기존 import 테스트가 새 employee_no 컬럼으로 깨지지 않게 갱신. — 완료기준: lint·test(커버리지 포함) 통과. (depends: S2, S3)
