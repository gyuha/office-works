<!-- forge-slug: user-import-cli -->
# run.md — 사용자 엑셀 임포트 CLI

소규모·직렬 작업이라 워크플로우 대신 단일 서브에이전트로 직접 실행. 메인 세션에서 교차검증 + UAT.

## 계획대로 된 것
- **S1** `api/scripts/users_cli.py` — argparse `template`/`import` 서브커맨드. `resolve_template_path(arg)`(none→cwd `users_template.xlsx` / 디렉터리 / `.xlsx` 경로)·`decide_exit_code(created, failed, parse_failed)→0/1/2`를 순수 헬퍼로 분리. `import`은 seed.py 패턴으로 엔진/세션 부트스트랩, `parse_import_rows` → 유효행마다 `service.create` 성공 시 `session.commit()`, 실패(AppError) 시 `session.rollback()` 후 계속(부분 성공, 오염 회피). 파싱 `ValueError`→exit 2. mypy clean.
- **S2** `api/tests/users/test_users_cli.py` — DB 불필요 단위 테스트 8건(template 헤더+덮어쓰기, resolve_template_path 3케이스, decide_exit_code 0/1/2). → 8 passed.
- **S3** `api/Taskfile.yml` — `users-template`(인프라 의존 없음)·`users-import`(desc에 "DB 가동·마이그레이션 선행 필요", 자동 기동 안 함), `{{.CLI_ARGS}}` 전달. → `task --list`에 둘 다 노출.
- **S4** `api/README.md` "Taskfile 주요 명령어" 블록에 두 태스크 + 사용 예시 추가. 다른 누락·stale 인증 내용 미수정(non-goal 준수).

UAT(메인 세션 직접): `template /tmp/...` → 생성 안내; 재실행 → "기존 파일을 덮어썼습니다"; 산출 .xlsx 헤더 `employee_no,name,department,rank,grade,phone,email` 일치; `import /tmp/없는파일.xlsx` → exit 2. 8 단위 테스트 통과. `task --list` 노출 확인.

## 계획과 달랐던 것 (divergences) — 낮음
- **테스트 명명**: 플랜/CLAUDE.md는 `test_methodUnderTest_scenario` 카멜케이스를 언급하나 ruff N802가 카멜케이스 함수명을 거부하고 기존 `tests/users/`가 전부 snake_case라, snake_case로 작성(게이트 통과 유일 방법, 기존 관행 일치). → CLAUDE.md의 명명 가이드와 실제 ruff 설정이 모순됨(별도 정리 후보).
- **`task lint`(mypy)는 `src`만 대상이라 `scripts/`를 안 봄**: 새 스크립트는 `mypy scripts/users_cli.py` 직접 실행으로 clean 확인. lint 태스크의 사전 존재 범위 공백(이번 변경과 무관).
- **Taskfile이 전역 `env: PYTHONPATH: src`를 이미 설정** → 두 신규 태스크의 명시적 `PYTHONPATH=src` 접두는 중복이나, S3 스펙의 명령 형태를 문자대로 따름. 무해.
- **DB 실삽입 루프(행별 commit/rollback)는 런타임 미검증**: 인프라 미가동(seed/create_dev_admin과 동일 제약). 코드 리딩 + exit-code 단위 테스트로만 검증. 실제 .xlsx → DB 적재는 추후 인프라 가동 시 확인 권장.
- 참고: API `POST /users/import`의 사번-중복 오염 취약성은 이번 범위 밖(별도 작업으로 합의됨).
