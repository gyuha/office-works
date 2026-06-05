---
last_mapped_commit: b8943aa32230936b80046e2f9b1a4dec458255df
mapped: 2026-06-05
---

# 테스트

API는 pytest 기반의 실질적인 테스트 스위트를 갖는다. Web에는 정식 테스트 러너(vitest/jest 등)가 **없고**, `web/src/sample/` 아래에 자체 실행형 검증 스크립트가 존재한다(아래 별도 기술).

---

## API (`api/`)

### 프레임워크 / 설정 — `api/pyproject.toml` `[tool.pytest.ini_options]`

- `asyncio_mode = "auto"` — async 테스트에 `@pytest.mark.asyncio` 데코레이터 불필요(pytest-asyncio). 일부 기존 테스트는 명시적으로 `@pytest.mark.asyncio`도 붙인다(`tests/test_main_runtime.py`).
- `testpaths = ["tests"]`, `pythonpath = ["src"]`(테스트도 `core`/`domains`/`infra` 톱레벨 import).
- 수집 규칙: `python_files = ["test_*.py", "*_test.py"]`, `python_classes = ["Test*"]`, `python_functions = ["test_*"]`.
- `filterwarnings = ["error", "ignore::DeprecationWarning", "ignore::PendingDeprecationWarning"]` — 경고를 에러로 승격(Deprecation 계열만 무시).

### 마커

`markers`에 3종 등록, `addopts`의 `--strict-markers`로 미등록 마커 사용 금지.

- `unit` — 순수 단위 테스트(I/O 없음). 예: `tests/test_config.py`, `tests/test_migrations.py`(`@pytest.mark.unit`), `tests/test_dev_server.py`.
- `integration` — DB / Redis 접근(실행 중인 인프라 필요).
- `e2e` — 기동된 서버 대상 end-to-end.

마커는 함수에 `@pytest.mark.<marker>`로 붙이거나 모듈 레벨 `pytestmark`로 지정한다.

### 커버리지 게이트

`addopts = ["--strict-markers", "--cov=src", "--cov-report=term-missing", "--cov-report=html:htmlcov", "--cov-fail-under=70"]`. **커버리지 70% 미만이면 실패한다.** `[tool.coverage.run]`: `source = ["src"]`, `branch = true`, omit `*/migrations/*`·`*/alembic/*`·`*/tests/*`. `[tool.coverage.report]`는 `__repr__`/`if TYPE_CHECKING:`/`raise NotImplementedError`/`...`를 제외한다. HTML 리포트는 `api/htmlcov/`에 생성된다(디스크에 다수 존재).

### 실행 — `api/Taskfile.yml`

`TEST_DIR: tests`. 모든 실행은 `uv run` 경유.

- `task test` → `uv run pytest tests -v` (전체, 커버리지 게이트 적용)
- `task test-unit` → `... -m unit`
- `task test-integration` → `... -m integration` (인프라 필요)
- `task test-fast` → `... --no-cov` (커버리지 스킵, 빠른 피드백)
- `task test-cov` → HTML 커버리지 생성 + 브라우저 오픈
- `task test-mailpit-signup` → `RUN_MAILPIT_INTEGRATION=1 ... --no-cov` (Mailpit 통합)
- 단일 테스트: `uv run pytest "tests/test_config.py::TestMailSettings::test_mail_from_uses_project_slug"`

> 통합 `check` 태스크는 없다 — 전체 검증은 `task lint && task test`.

### 테스트 명명 / 구조

- 파일 `test_*.py`, 클래스 `Test*`, 함수 `test_*`.
- 메서드 명명은 `test_methodUnderTest_scenario_expectation` 스타일을 지향한다. 실제 예: `test_mail_from_uses_project_slug`, `test_ready_endpoint_reports_degraded_dependency`, `test_dev_target_has_reload_flag`, `test_rate_limit_key_prefers_authenticated_user`.
- 단위 테스트는 `@BeforeEach`/fixture 셋업 없이 대상 객체를 직접 생성한다. 설정 테스트는 `make_settings(**env_overrides)` 헬퍼(`tests/test_config.py`)로 `patch.dict(os.environ, ..., clear=True)` + `Settings(_env_file=None)`로 환경을 완전 격리한다.

### 공유 fixture / 격리 — `api/tests/conftest.py`

- `settings_cache_clear`(`autouse=True`) — 모든 테스트 전후로 `get_settings.cache_clear()` 호출. `get_settings`가 `@lru_cache(maxsize=1)`이므로 한 테스트의 `monkeypatch.setenv`가 다음 테스트로 새지 않게 한다.
- conftest 자체는 네트워크/DB/Redis 연결을 하지 않는다.

### 모킹

- **Redis는 `fakeredis`로 스텁**(dev 의존성 그룹에 `fakeredis>=2.26.0`). 또한 `tests/test_main_runtime.py`는 경량 수제 stub(`FakeRedis`/`FakeEngine`/`FakeConnection`)과 `app.dependency_overrides`로 DB/Redis 의존성을 대체한다.
- HTTP/ASGI 테스트는 `httpx`의 `ASGITransport` + `AsyncClient`로 인프로세스 호출(`tests/test_main_runtime.py`).
- chat 도메인은 `app.dependency_overrides[get_llm_factory] = lambda: StubFactory()`로 실제 LLM 호출을 차단하는 stub-factory 패턴을 쓴다(`chat_router.py` docstring에 명시).
- LLM provider 테스트는 `monkeypatch.setenv("LLM_PROVIDER", ...)` 후 캐시 무효화된 설정을 다시 읽는다.

### dev 그룹 테스트 의존성 — `api/pyproject.toml` `[dependency-groups] dev`

`pytest>=8.3`, `pytest-asyncio>=0.24`, `pytest-cov>=5.0`, `anyio>=4.6`, `httpx>=0.27`, `fakeredis>=2.26`. `uv sync`에 기본 포함(`default-groups = ["dev"]`).

### 현재 테스트 파일 (`api/tests/`)

`conftest.py`, `test_config.py`(설정/LLM/CORS 단위), `test_main_runtime.py`(앱 entrypoint·health/ready·lifespan·rate-limit key, async), `test_migrations.py`(`unit` — Taskfile/alembic 정합성), `test_dev_server.py`(`unit` — Taskfile/Justfile reload 플래그 검증). 도메인별 테스트 디렉터리(`tests/auth/`, `tests/chat/`)는 일부 Taskfile 타깃·docstring이 참조하나 현재 디스크의 `tests/`에는 위 평면 파일만 존재한다.

### 주의

- **Python 3.12로 실행할 것.** Python 3.14 + langchain의 `pydantic.v1` 비호환으로 chat 도메인 테스트가 collection 단계에서 실패한다(`requires-python = ">=3.12"`).
- 통합/e2e 마커 테스트는 `task infra`로 PostgreSQL/Redis/Mailpit이 떠 있어야 한다.

---

## Web (`web/`)

### 정식 테스트 러너 없음

`web/package.json`에는 vitest/jest/@testing-library 의존성도, `test` 스크립트도 **없다**. 스크립트는 `dev`/`build`/`preview`/`typecheck`/`lint`/`lint:fix`/`format`뿐이다. `pnpm typecheck`(`tsc --noEmit`) + `pnpm lint`(`biome check .`)가 사실상의 정적 검증 게이트다.

### 자체 실행형 검증 스크립트 — `web/src/sample/`

`*.test.ts` 파일들(예: `web/src/sample/auth/sign-in-page.test.ts`, `sign-up-form-ui.test.ts`, `otp-page.test.ts`, `forgot-password-page.test.ts`, `web/src/sample/layout/navigation.test.ts`, `web/src/sample/errors/maintenance-error-route.test.ts`)은 테스트 프레임워크가 아니라 **Node 표준 모듈 + TypeScript 컴파일러 API로 직접 작성된 standalone 스크립트**다.

- import 형태: `node:fs`(`existsSync`/`readFileSync`), `node:path`, `node:url`(`fileURLToPath`), `typescript`(`import ts`).
- 어서션은 조건 위반 시 `throw new Error('...')` — 별도 expect/assert 라이브러리 없음.
- Zod 스키마를 직접 `safeParse`해서 검증 메시지·통과/거부를 확인하는 패턴(예: `sampleSignInSchema.safeParse(values)` 후 `parsed.error.issues`의 `path`/`message` 검사).
- 이들은 import 시 즉시 실행되는 모듈 레벨 코드이므로 `tsx`/`node`로 직접 실행하는 형태이며, 표준 `pnpm test` 진입점은 존재하지 않는다.

### 브라우저 스모크 — `web/src/sample/smoke/sample-browser-smoke.mjs`

`node:child_process`(`spawn`)로 `vite preview`를 띄우고 Chrome(`CHROME_BIN`, 기본 `/Applications/Google Chrome.app/...`)을 원격 디버깅 포트로 구동해 페이지를 검증하는 ESM 스크립트다. 환경변수(`SAMPLE_SMOKE_PREVIEW_PORT`/`SAMPLE_SMOKE_CHROME_PORT`/`SAMPLE_SMOKE_BASE_URL`/`SAMPLE_SMOKE_LAUNCH_PREVIEW`)로 제어한다. 역시 표준 테스트 러너가 아니라 직접 실행하는 mjs 스크립트다.
