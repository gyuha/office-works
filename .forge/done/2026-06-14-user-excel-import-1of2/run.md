<!-- forge-slug: user-excel-import-1of2 -->
# run.md — 사용자 Excel 일괄 등록 (1/2) 백엔드

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행 + TDD(파싱/검증 test-first)

## 계획대로 된 것
- **S1 의존성+골격** — `uv add openpyxl`(3.1.5). `UserImportRowError{row,reason}`·`UserImportResult{created,failed}` 스키마 + __init__ export 추가.
- **S2 템플릿 (TDD)** — `user_import.build_import_template() -> bytes`(openpyxl, 헤더 행 name/department/rank/grade/phone/email). `GET /users/import-template`(get_current_user)가 `.xlsx` bytes를 `application/vnd...sheet` + `attachment; filename=users_template.xlsx`로 반환. 단위 테스트(헤더 검증).
- **S3 파싱/검증 (TDD)** — `parse_import_rows(bytes) -> (list[(excel_row, UserCreate)], list[RowError])`. openpyxl read_only로 헤더 검증·행→UserCreate(Pydantic) 매핑, 빈 행 스킵, 파일 내 이메일 중복 첫 건만 유지, 비-xlsx → ValueError. 7개 단위 테스트(유효/누락/이메일오류/빈행/파일내중복/헤더불일치/비xlsx).
- **S4 import 엔드포인트** — `POST /users/import`(UploadFile, users:write). parse → 유효 행마다 `service.create`, `AppError`(중복 이메일 등)는 `{excel_row, reason}` 실패로 수집(부분 성공). 비-xlsx 400. 결과 `UserImportResult`.
- **S5 검증** — 내 변경 파일 ruff·mypy strict 통과. `task test`: **693 passed, 커버리지 79.56%(≥70% 게이트 충족)**. user_import.py 92% 커버.

## 분기(Divergence)
- 없음 — 계획 5슬라이스대로. `parse_import_rows` 반환을 `list[UserCreate]` → `list[(excel_row, UserCreate)]`로 한 것은 "중복 이메일을 실패 행으로 보고"(DoD)를 DB 충돌 시에도 올바른 행번호로 하기 위함(계획 의도 내).

## 현장 결정(설계 판단)
- **valid 행에 Excel 행번호 동반** — DB 단계 email 충돌(`ConflictError`)도 정확한 행번호로 보고하려고 `(excel_row, UserCreate)` 튜플 반환. UI가 "몇 행이 왜 실패"를 정확히 표시.
- **충돌은 AppError로 포괄 catch** — `ConflictError`가 `AppError` 하위라 `except AppError`로 받아 실패 수집(insert-only, 덮어쓰기 없음).
- **mypy: openpyxl 스텁 없음** → `pyproject.toml` mypy overrides에 `openpyxl.*` 추가(redis/jose 등과 동일 패턴).
- **검증 수준 = UserCreate 그대로**(자유 텍스트 + 길이 + EmailStr) — 조직설정 대조 안 함(계획대로).

## 코드 리뷰 메모
- 변경: pyproject(openpyxl + mypy override), user_schemas(+2 스키마), schemas/__init__, user_router(+2 엔드포인트, import 정리), 신규 user_import.py + test_user_import.py. 공개 API 계약 추가 + 데이터 생성 경로지만, 핵심 로직은 순수 함수로 분리해 단위 테스트로 커버, 엔드포인트는 thin glue. ruff/mypy/coverage 게이트 통과.
- 선재 결함(무관): 전체 ruff 9건(auth 테스트·test_user_service.py — 내가 안 건드림), task test의 12 실패(stale Makefile 테스트 — CLAUDE.md 명시).

## 미해결/UAT로 확인할 것 (대부분 자동 검증됨)
- 자동: 파싱/검증 7개 단위 테스트 green, 커버리지 79.56%.
- 미커버(thin glue): `POST /users/import` 엔드포인트의 실제 multipart 처리·`service.create` 루프(통합 테스트 미작성 — 핵심 로직은 단위 테스트로 검증). 실제 .xlsx 업로드 동작은 2/2 프론트 UAT에서 함께 확인됨.
- 템플릿 다운로드 .xlsx 바이트는 단위 테스트로 헤더 검증, 실제 HTTP 다운로드는 프론트 UAT에서 확인.
