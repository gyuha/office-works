---
last_mapped_commit: 7813838ac56097621569a9ce37a8afe4f10f0b54
mapped: 2026-06-11
---

# 테스트 가이드 (TESTING)

## pytest 설정 (`api/pyproject.toml` `[tool.pytest.ini_options]`)

- `asyncio_mode = "auto"` — async 테스트에 `@pytest.mark.asyncio` 데코레이터 불필요.
- `testpaths = ["tests"]`, `pythonpath = ["src"]` (flat 레이아웃이라 `core`/`domains`를 톱레벨로 import).
- 수집 규칙: 파일 `test_*.py`/`*_test.py`, 클래스 `Test*`, 함수 `test_*`.
- `filterwarnings = ["error", ...]` — 경고를 에러로 승격(Deprecation 계열만 ignore).
- `addopts`: `--strict-markers --cov=src --cov-report=term-missing --cov-report=html:htmlcov --cov-fail-under=70` — **커버리지 70% 미달 시 테스트 실패.** 커버리지는 branch 포함(`[tool.coverage.run] branch = true`), `alembic/`·`tests/`·`migrations/` 제외.
- 마커 3종(`--strict-markers`로 오타 차단):
  - `unit` — 순수 단위(no I/O)
  - `integration` — DB/Redis 접근
  - `e2e` — 기동 서버 대상 (**선언만 있고 현재 `pytest.mark.e2e` 사용처는 없음**)

마커는 모듈 단위로 `pytestmark = pytest.mark.unit` / `pytest.mark.integration`을 파일 상단에 선언하는 방식이 표준이다(예: `api/tests/users/test_user_service.py`, `api/tests/org/test_config_router.py`).

## 실행 명령 (`api/Taskfile.yml`)

```bash
task test               # 전체 + 커버리지 게이트
task test-unit          # -m unit
task test-integration   # -m integration (task infra 필요 — Postgres/Redis/Mailpit)
task test-mailpit-signup  # RUN_MAILPIT_INTEGRATION=1 + --no-cov 단일 파일
uv run pytest "tests/test_config.py::TestMailSettings::test_mail_from_uses_project_slug"  # 단일
```

Mailpit 통합 테스트(`api/tests/auth/test_signup_mailpit_integration.py`)는 `os.getenv("RUN_MAILPIT_INTEGRATION") != "1"`이면 skip되는 opt-in 테스트다.

## 네이밍 컨벤션

`test_methodUnderTest_scenario_expectation` 패턴. snake_case와 camelCase 시나리오 표기가 혼용된다 — 실제 예 (`api/tests/users/test_user_service.py`):

- `test_create_withMemo_persistsAndEchoesInResponse`
- `test_create_duplicate_email_raises_conflict_error`
- `test_delete_soft_deletes_and_excludes_from_default_list`
- `test_get_work_settings_without_auth_returns_401` (`api/tests/org/test_config_router.py`)

설정처럼 그룹화가 유용한 곳은 `Test*` 클래스를 쓴다(`api/tests/test_config.py`의 `TestAppSettings`, `TestDatabaseDSN`, `TestJWTSettings` 등). 도메인 테스트는 클래스 없이 모듈 레벨 함수가 다수.

## 픽스처 배치 (`api/tests/`)

```
tests/conftest.py            # 루트 — settings_cache_clear (autouse)
tests/auth/conftest.py       # FakeRedis, FakeAuthRepository, auth_service
tests/chat/conftest.py       # LLM mock 픽스처 일체 (+ tests/chat/_mocks.py)
tests/{auth,chat,org,users,shared,infra}/   # 도메인별 디렉토리
tests/test_config.py, test_migrations.py, test_dev_server.py, test_main_runtime.py  # 횡단
```

- **루트 `api/tests/conftest.py`**: `settings_cache_clear` autouse 픽스처가 모든 테스트 전후로 `get_settings.cache_clear()`를 호출 — `@lru_cache` Settings가 monkeypatch된 env를 다음 테스트로 누출하지 않게 한다.
- **`api/tests/auth/conftest.py`**: 단위 테스트용 인메모리 페이크. `FakeRedis`(get/set/exists/delete/ping + 만료 기록), `FakeAuthRepository`(dict 기반, `transaction()` 컨텍스트 카운팅, `MagicMock` row + `core.ids.generate_id`로 prefixed ID 생성), `auth_service`(페이크에 와이어링된 `AuthService`).
- **`api/tests/chat/conftest.py` + `api/tests/chat/_mocks.py`**: 네트워크 경계인 `ChatLiteLLM`만 패치(`patch("infra.llm.provider_factory.ChatLiteLLM")`)하고 그 위(`LLMClient`/`ProviderFactory`/`ChatService`)는 실제 구현을 테스트하는 전략. env 픽스처(`env_openai`/`env_ollama`), 순수 settings 픽스처, `FakeChatLiteLLM`/`StubLLMClient`/`MagicMock` 3단계 페이크를 제공.

### Redis 스텁에 대한 사실

`fakeredis`는 `api/pyproject.toml` dev 그룹에 선언돼 있으나 **현재 테스트 코드에서 import하는 곳은 없다.** 실제로 쓰이는 것은 `api/tests/auth/conftest.py`의 수제 `FakeRedis` 클래스다. (루트 `CLAUDE.md`의 "Redis는 fakeredis로 스텁" 서술은 의존성 기준이지 실사용 기준이 아니다.)

## 단위 테스트 패턴

대상 객체를 픽스처/직접 생성으로 조립하고 페이크 리포지토리를 주입한다. 예: `api/tests/users/test_user_service.py`는 `@dataclass _FakeUser` + `FakeUserDirectoryRepository`(리포지토리 계약 미러)를 정의하고 `UserDirectoryService`에 주입, `ConflictError`/`NotFoundError`/`AppError` raise를 검증한다.

## 통합 테스트 패턴 (실 Postgres + ASGI)

`api/tests/org/test_config_router.py`, `api/tests/users/test_user_router.py` 등 라우터 통합 테스트의 공통 골격:

```
session_factory 픽스처 → 테스트별 FastAPI 앱 조립 → ASGITransport 클라이언트 → 호출/검증 → 생성 행 삭제(cleanup)
```

1. `create_async_engine(settings.async_database_url, poolclass=NullPool)` + `async_sessionmaker`로 실 DB에 연결하는 `session_factory` 픽스처(teardown에서 `engine.dispose()`).
2. `_build_app()`이 테스트 전용 `FastAPI()` 인스턴스를 만들어 `register_exception_handlers` + 대상 라우터(`prefix="/api/v1"`)만 등록.
3. `app.dependency_overrides[get_async_session]`로 세션 주입을 오버라이드(commit/rollback 래핑 포함), 인증은 `app.dependency_overrides[get_current_user] = lambda: current_user`로 우회 — 실 JWT 발급 없이 권한 시나리오(401/403/round-trip)를 테스트한다.
4. 클라이언트는 `httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")` — 실 서버 기동 없음.
5. 테스트가 만든 행은 `created_user_ids` 같은 yield 픽스처가 teardown에서 `delete()`로 직접 정리한다(트랜잭션 롤백 격리가 아닌 명시적 삭제). admin 권한이 필요한 케이스는 시드된 `admin` Role을 조회해 연결하므로 **`task seed` 선행이 전제**다.

DB 없이 도는 정적 계약 테스트도 있다: `api/tests/test_migrations.py`는 Makefile/Alembic 명령 와이어링을 파일 파싱으로 검증한다(Docker·DB 불필요).

## 웹 (`web/`) 테스트 현황

- **테스트 러너 없음.** `web/package.json`에 test 스크립트가 없고 vitest/jest/@testing-library 의존성도 없다. `pnpm typecheck`(tsc)와 `pnpm lint`(Biome)가 유일한 자동 검증이다.
- `web/src/sample/**/*.test.ts` 9개 파일이 존재하지만(예: `web/src/sample/auth/sign-in-page.test.ts`) 러너용 테스트가 아니다 — `node:fs`/`typescript`를 import해 조건 위반 시 `throw new Error(...)`하는 자기실행 스크립트 형태이며, 어떤 npm 스크립트에도 연결돼 있지 않다.
- `web/src/client/`(생성물)는 Biome ignore 대상이라 lint 검증에서도 제외된다.
