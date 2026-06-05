---
last_mapped_commit: 5c5103df2b3695a9b8bd62b9c5701f2988b8e0ab
mapped: 2026-06-05
---

# TESTING — 테스트 프레임워크·구조·실행

검증 출처: `api/pyproject.toml`, `api/Taskfile.yml`, 실제 `api/tests/**`. 프론트엔드는 현재 자동 테스트가 없다.

## 프레임워크 (pytest)

- **pytest** + **pytest-asyncio** (`asyncio_mode = "auto"` — async 테스트에 데코레이터 불필요)
- **pytest-cov** (branch coverage, 70% 게이트)
- 픽스처 도구: `httpx.AsyncClient`(+`ASGITransport`), `fakeredis` / 커스텀 `FakeRedis`, `MagicMock`/`SimpleNamespace`

## 설정 (`api/pyproject.toml`의 `[tool.pytest.ini_options]`)

```toml
asyncio_mode = "auto"
testpaths = ["tests"]
pythonpath = ["src"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = ["--strict-markers", "--cov=src", "--cov-report=term-missing",
           "--cov-report=html:htmlcov", "--cov-fail-under=70"]
```

커버리지 대상은 `src`, 제외는 `alembic/`·`tests/`·`migrations/` (`[tool.coverage.run] branch = true`).

## 마커

- `unit` — I/O 없음 (순수 함수/로직)
- `integration` — DB/Redis 접근 (인프라 필요)
- `e2e` — 기동 중인 서버 대상

`--strict-markers` 적용 — 미등록 마커 사용 시 에러.

## 디렉토리 구조

```
api/tests/
├── conftest.py                  # 루트 픽스처 (settings 캐시 클리어 등)
├── test_config.py               # Settings 테스트
├── test_migrations.py           # Alembic
├── test_main_runtime.py         # 앱 팩토리
├── auth/
│   ├── conftest.py              # FakeRedis, FakeAuthRepository, 서비스 스텁
│   ├── test_*_route.py          # 라우터 (signup/login/refresh/password_reset/verify_email)
│   ├── test_*_schemas.py        # Pydantic 스키마 검증
│   ├── test_email_backend.py
│   ├── test_access_token_context.py
│   └── test_signup_mailpit_integration.py  # 라이브 이메일(e2e)
└── chat/
    ├── conftest.py              # LLM provider 모킹 (env 오버라이드)
    ├── test_llm_factory.py
    ├── test_provider_routing.py
    ├── test_llm_client.py
    ├── test_di_container.py
    └── test_ports.py
```

## 명명 규칙

- 파일: `test_<module>.py`
- 클래스: `Test<Entity>` (예: `TestMailSettings`)
- 메서드: `test_<methodUnderTest>_<scenario>_<expectation>` (예: `test_mail_from_uses_project_slug`, `test_signup_withValidPayload_returnsUserAndSendsEmail`)

## 실행 (Taskfile)

```bash
task test                # 전체, 커버리지 70% 강제
task test-unit           # 마커 unit
task test-integration    # 마커 integration (인프라 필요)

# 단일 테스트
uv run pytest "tests/test_config.py::TestMailSettings::test_mail_from_uses_project_slug"
```

## 모킹·스텁 전략

**Redis** — 네트워크 없는 인메모리 스텁. `fakeredis` 또는 커스텀 `FakeRedis`(dict 기반 `get`/`set`/`expire`).

**Repository** — `FakeAuthRepository`(dict 기반, DB 없음). `create_user` 등이 `MagicMock`/실엔티티 유사 객체를 반환.

**Service** — 라우터 테스트용 최소 스텁(`FakeSignupService` 등)을 `SimpleNamespace`로 결과 구성.

**FastAPI 의존성 오버라이드** — `app.dependency_overrides[_get_service] = lambda: fake_service`.

**Settings/env** — `monkeypatch.setenv(...)` 후 `get_settings.cache_clear()`. 루트 conftest에 캐시 클리어 autouse 픽스처가 있어 테스트 간 누수를 막는다.

**LLM/Chat** — env 오버라이드로 provider 선택(`LLM_PROVIDER`, `OPENAI_API_KEY` 등)을 모킹하고 팩토리 라우팅을 검증.

## 라우터 테스트 패턴

`FastAPI` 앱에 라우터를 `/api/v1` prefix로 마운트하고 `dependency_overrides`로 서비스를 스텁한 뒤, `httpx.AsyncClient(transport=ASGITransport(app))`로 호출한다. 정규화(이메일 lowercase/trim)와 시크릿 누출 방지(`"hashed_password" not in body`)를 함께 검증한다.

## 커버리지

- 게이트 70% (`--cov-fail-under=70`) — 미달 시 빌드 실패
- 대상 `src/`, 제외 `alembic/`·`tests/`·`migrations/`
- 리포트: `task test-cov` → `htmlcov/index.html`

## 주의

- **Python 3.12** 필수 — 3.14 + langchain `pydantic.v1` 비호환으로 chat 도메인 테스트가 collection 단계에서 실패.
- 통합 테스트는 `.env`의 `DATABASE_URL`(dev=Docker Compose localhost)을 사용 — `task infra` 선행 필요.
- 마이그레이션은 `0001_initial_schema` 하나뿐.

## 프론트엔드

현재 `web/`에 자동 테스트 없음. 수동 검증만 가능(`pnpm dev` → 브라우저에서 인증 플로우/폼/라우팅 확인).
