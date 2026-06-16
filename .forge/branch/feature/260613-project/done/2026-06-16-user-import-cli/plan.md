<!-- forge-slug: user-import-cli -->
<!-- task: 23 -->
<!-- tdd: off -->
# 사용자 엑셀 임포트 CLI — users_cli.py (import/template) + Taskfile + README

## Goal / Non-goals
- Goal: `scripts/users_cli.py` 단일 스크립트(argparse 서브커맨드 `import`·`template`)를 만들어, 로컬 `.xlsx`로 사용자 목록을 DB에 일괄 등록하고 빈 템플릿을 현재 폴더에 저장한다. 두 동작을 Taskfile 태스크로 노출하고 README의 Taskfile 명령어 목록에 추가한다. 기존 `user_import.py`의 `parse_import_rows`/`build_import_template`와 `UserDirectoryService.create`를 재사용한다.
- Non-goals:
  - **API `POST /users/import`의 잠복 취약성**(사번 중복이 루프 중간에 나면 세션 오염으로 이후 행 실패) 수정 — 별도 작업.
  - README 본문의 stale 인증 내용(`/auth/signup`·`/verify-email`·EmailVerification 흐름/엔드포인트) 정리 — 별도 작업.
  - README Taskfile 목록의 다른 누락(seed·typecheck·downgrade 등) 전체 동기화 — 이번엔 새 태스크 2개만 추가.
  - Typer/Click 등 새 CLI 의존성 도입 (argparse stdlib만).
  - CLI에 인증/권한 체크 (seed·create_dev_admin과 동일하게 DB 직접 접근, 권한 없음).

## Source of truth
- Glossary terms: none (새 도메인 용어 없음 — 순수 도구 작업)
- Related ADRs: none
- Definition of Done:
  - `task users-template`이 현재 폴더에 `users_template.xlsx`(헤더 `employee_no,name,department,rank,grade,phone,email`)를 저장하고, 같은 이름 존재 시 덮어쓰며 stdout에 안내한다.
  - `task users-import -- <파일.xlsx>`가 유효행을 행별 커밋으로 등록하고, `생성 N건` + 실패행(`{행}: {email} — {사유}`)을 출력하며 종료 코드가 전부성공=0 / 실패행 존재=1 / 파일읽기실패(.xlsx 아님·헤더 불일치·빈 파일)=2 로 갈린다.
  - 두 태스크가 `api/README.md`의 "Taskfile 주요 명령어"에 사용 예시와 함께 추가된다.
  - `task lint`(ruff+mypy) 통과, 가벼운 단위 테스트 통과.

## Work slices
- [ ] S1. `scripts/users_cli.py` 작성 — argparse 서브커맨드 2개.
  - `template [출력경로]`: `build_import_template()` 바이트를 파일로 저장. 인자 없으면 cwd의 `users_template.xlsx`; 디렉터리를 주면 그 안에, `.xlsx` 경로를 주면 그대로. 존재 시 덮어쓰기 + "덮어썼습니다" 안내. DB 불필요(순수).
  - `import <파일.xlsx>`: `create_async_engine(get_settings().database_url)` + sessionmaker로 세션 부트스트랩(create_dev_admin 패턴), `parse_import_rows` → 유효행마다 `UserDirectoryService(UserDirectoryRepository(session)).create(user)` 성공 시 `session.commit()`, 실패(AppError) 시 `session.rollback()` 후 다음 행 계속(부분 성공). 파싱 단계 `ValueError`(.xlsx 아님 등)는 종료 코드 2. 요약 출력 + 종료 코드 0/1/2.
  - 완료 기준: `PYTHONPATH=src uv run python scripts/users_cli.py template ./tmp` 실행 시 `tmp/users_template.xlsx` 생성·헤더 일치; `... import nonexistent_or_bad_file` 시 종료 코드 2. mypy 통과.
- [ ] S2. 가벼운 단위 테스트(`tests/` 하위, DB 불필요 범위) — (a) `build_import_template` 산출물을 파일로 저장하는 template 핸들러가 cwd/지정경로에 정확한 헤더의 .xlsx를 쓰고 기존 파일을 덮어쓰는지, (b) 파일읽기 실패 → 종료 코드 2, 부분 성공/전부 성공의 종료 코드 결정 로직(0/1/2)이 옳은지. 종료 코드 판정은 (created, failed) 결과로부터 순수 함수로 분리해 DB 없이 테스트 가능하게 한다. — 완료 기준: `task test`(또는 해당 파일) 통과. (depends: S1)
- [ ] S3. `Taskfile.yml`에 `users-import`(인자: 파일 경로)·`users-template`(선택 인자: 출력 경로) 태스크 추가. `{{.CLI_ARGS}}`로 인자 전달, `PYTHONPATH=src uv run python scripts/users_cli.py <subcmd> {{.CLI_ARGS}}` 형태. `users-import` desc/문서에 "DB 가동·마이그레이션 선행 필요" 명시, 인프라 자동 기동은 안 함. — 완료 기준: `task users-template -- ./tmp`이 동작하고 `task --list`에 두 태스크가 desc와 함께 노출. (depends: S1)
- [ ] S4. `api/README.md`의 "Taskfile 주요 명령어" 블록에 `users-import`·`users-template`를 사용 예시(`task users-import -- path/to/users.xlsx`, `task users-template -- ./out`)와 함께 추가. 다른 누락 항목·stale 인증 내용은 손대지 않음. — 완료 기준: README에 두 태스크가 예시와 함께 문서화. (depends: S3)
