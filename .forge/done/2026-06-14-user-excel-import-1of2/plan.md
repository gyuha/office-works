<!-- forge-slug: user-excel-import-1of2 -->
<!-- task: 16 -->
<!-- tdd: on -->
<!-- part: 1/2 -->
# 사용자 Excel 일괄 등록 (1/2) — 백엔드 (파싱·검증·엔드포인트)

## Goal / Non-goals
- Goal: `.xlsx` 파일로 사용자를 일괄 등록하는 백엔드를 만든다. `POST /api/v1/users/import`(multipart 파일, `users:write`) — 행을 `UserCreate`로 매핑·검증해 유효한 행은 생성, 실패 행은 `{row, reason}`로 수집해 **부분 성공** 결과 반환. `GET /api/v1/users/import-template`(인증만) — 헤더 행이 있는 빈 `.xlsx` 템플릿 다운로드. 파싱/검증은 순수 함수로 분리해 **TDD(test-first)**.
- Non-goals: 프론트엔드(2/2 part), upsert/덮어쓰기(insert-only), 조직설정(등급/직급 목록) 대조 검증(자유 텍스트만), 미리보기/dry-run 엔드포인트, CSV 지원, 사번(employee_no) 입력(서버 생성 유지), 비동기/대용량 스트리밍 처리.

## Source of truth
- Glossary terms: none (신규 도메인 용어 없음)
- Related ADRs: none (표준 대량 import — 관습적 선택)
- 기존 코드: `api/src/domains/users/`(router/service/repository/schemas). `UserCreate`(name·department·rank·grade·phone·email, employee_no 서버생성), `UserDirectoryService.create`(email 중복 시 `ConflictError`, `next_employee_no()`), `export_users`(CSV, 컬럼 순서 `employee_no,name,department,rank,grade,phone,email` 참고). `python-multipart` 설치됨. openpyxl 미설치.
- Definition of Done: openpyxl 의존성 추가, 두 엔드포인트가 OpenAPI(`/docs`)에 노출, 템플릿 다운로드 시 6컬럼 헤더(name/department/rank/grade/phone/email) `.xlsx` 수신, 정상+오류 혼합 파일 업로드 시 유효행 생성·실패행 사유 반환(부분 성공), 중복 이메일은 실패 행으로 보고, 파싱/검증 단위 테스트 통과, `task lint`(ruff+mypy strict)·`task test`(커버리지 70%) 통과.

## Work slices
- [ ] S1. 의존성 + 라우트 골격 — `api/pyproject.toml`에 `openpyxl` 추가(`uv sync`). `user_router.py`에 `POST /users/import`(`UploadFile`, `require_permission("users:write")`)·`GET /users/import-template`(`get_current_user`) 스텁 + 응답 스키마(`UserImportResult{created:int, failed:list[{row:int, reason:str}]}`)를 `user_schemas.py`에 추가. — 완료기준: `uv sync` 성공, 두 라우트가 `/docs`에 노출(빈 구현이라도), mypy 통과.
- [ ] S2. 템플릿 생성 (TDD) — 순수 함수 `build_import_template() -> bytes`(openpyxl Workbook, 1행=헤더 `["name","department","rank","grade","phone","email"]`). 실패 테스트(헤더·바이트 유효성) 먼저 → 구현. `GET /import-template`가 이 bytes를 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` + `Content-Disposition: attachment; filename=users_template.xlsx`로 반환. — 완료기준: 템플릿 함수 단위 테스트 통과(열어서 헤더 6개 확인), 엔드포인트가 .xlsx 스트림 반환. (depends: S1)
- [ ] S3. 파싱·검증 순수 로직 (TDD) — `parse_import_rows(file_bytes) -> tuple[list[UserCreate], list[RowError]]`. openpyxl로 행 읽어 헤더 매핑 → 각 행을 `UserCreate`로 검증(Pydantic ValidationError → `{row, reason}` 수집), 빈 행 스킵, 헤더 누락/순서 오류 처리. 파일 내 이메일 중복도 행 오류로. 실패 테스트(누락 필드·잘못된 이메일·빈 행·파일내 중복·헤더 불일치) 먼저 → 구현. — 완료기준: 다양한 케이스 단위 테스트 통과(유효/오류 행 분리 정확). (depends: S1)
- [ ] S4. import 엔드포인트 결선 — `POST /users/import`가 `parse_import_rows`로 분리한 유효 행을 서비스로 생성(행별로 기존 `create` 재사용 — email 중복 `ConflictError`는 실패 행으로 수집, 부분 성공). 결과 `UserImportResult` 반환. 비-xlsx/손상 파일은 400. 행 번호는 엑셀 기준(헤더=1, 데이터 2행부터). — 완료기준: 정상+오류 혼합 업로드 통합 테스트로 `created`/`failed` 정확, 중복 이메일 실패 보고(수동 또는 통합). (depends: S2, S3)
- [ ] S5. 검증·정리 — `task lint`(ruff + mypy strict) 통과, `task test`(커버리지 70% 게이트) 통과, 신규 파일 마커/테스트 규약(`test_*`, `Test*`) 준수, `openapi.json` 갱신은 2/2 part의 클라이언트 재생성에서 다룸(여기선 백엔드만). — 완료기준: lint·test(커버리지 포함) 통과. (depends: S4)
