---
last_mapped_commit: b8943aa32230936b80046e2f9b1a4dec458255df
mapped: 2026-06-05
---

# STACK

`office-works`는 FastAPI 백엔드(`api/`)와 React SPA(`web/`)로 구성된 모노레포다. 아래는 디스크 상의 실제 코드 기준 스택이다. (`api/`는 현재 git에서 untracked 상태이며, Java/Spring Boot에서 Python/FastAPI로 리셋된 직후다.)

## 모노레포 레이아웃

- `api/` — Python 3.12 / uv 기반 FastAPI 서버
- `web/` — React 19 + TanStack Router SPA (pnpm)

두 패키지는 독립 빌드 체계를 가진다. 루트에는 통합 워크스페이스 매니페스트가 없고, 각 디렉토리가 자체 진입점(`api/Taskfile.yml`, `web/package.json`)을 갖는다.

---

## API (`api/`)

### 언어 / 런타임

- **Python `>=3.12`** (`api/pyproject.toml`의 `requires-python`, ruff `target-version = "py312"`, mypy `python_version = "3.12"`).
- 패키지 매니저 / 가상환경: **uv** (lock 파일 `api/uv.lock` 약 800KB, `[tool.uv].default-groups = ["dev"]`).
- 빌드 백엔드: **hatchling** (`[build-system]`, `[tool.hatch.build.targets.wheel].packages = ["src"]`).
- 소스 레이아웃: **flat src 레이아웃** — 톱레벨 패키지 prefix 없음. `PYTHONPATH=src`로 `core`/`domains`/`infra`를 직접 import (`api/src/`).

> 주의: 디스크상 `api/.venv`와 `__pycache__`에 `cpython-314` 산출물이 보이나(예: `api/src/infra/llm/__pycache__/*.cpython-314.pyc`), 프로젝트는 Python 3.12 개발을 강제한다. CLAUDE.md에 따르면 3.14 + langchain `pydantic.v1` 비호환으로 chat 도메인 테스트가 collection 단계에서 실패한다.

### 웹 프레임워크 / 서버

- **FastAPI** `>=0.115.0` (`fastapi[standard]`), 앱 팩토리 `create_app()` (`api/src/main.py`).
- **uvicorn** `>=0.30.0` (`uvicorn[standard]`) — 핫리로드 진입점 `uvicorn main:app`.
- **python-multipart** `>=0.0.12` (폼/파일 업로드).
- 미들웨어: `CorrelationIdMiddleware`(`api/src/core/middleware.py`) + `CORSMiddleware`. CORS는 `settings.cors_origins_list`, `expose_headers=["X-Correlation-ID"]`.
- 시작/종료: `lifespan` 컨텍스트 — Redis 풀 warm-up + ping, 종료 시 풀 close (`api/src/main.py`).
- 라우터 등록: 도메인 라우터는 `/api/v1` prefix, `health_router`(`/health`, `/ready`)만 루트.

### 검증 / 설정

- **Pydantic** `>=2.9.0`, **pydantic-settings** `>=2.5.0` — 설정 클래스 `Settings`/`LLMSettings` (`api/src/core/config.py`).
- **email-validator** `>=2.2.0` (`EmailStr` 활성화).
- 설정 싱글톤: `get_settings()` (`@lru_cache(maxsize=1)`), 모듈 레벨 `settings`. `.env` 로드(`env_file=".env"`), `extra="ignore"`, `case_sensitive=False`.
- LLM 설정은 `env_prefix="LLM_"`, 자격증명은 alias(`OPENAI_API_KEY` 등)로 매핑.

### 데이터베이스 / ORM

- **SQLAlchemy 2.0** `>=2.0.36` (`sqlalchemy[asyncio]`, 타입 플러그인 `sqlalchemy[mypy]`).
- 런타임 드라이버: **asyncpg** `>=0.30.0` (`postgresql+asyncpg://`), 엔진 `create_async_engine` (`api/src/core/database.py`, pool_size 5 / max_overflow 10 / pool_recycle 3600 / pool_pre_ping).
- 마이그레이션 드라이버: **psycopg2-binary** `>=2.9.9` (`postgresql+psycopg2://`, Alembic 전용).
- **Alembic** `>=1.14.0` (`api/alembic.ini`, `api/alembic/env.py`). env.py는 `DATABASE_URL_SYNC` 우선, 없으면 `Settings.sync_database_url`로 fallback하고 `sqlalchemy.url`을 오버라이드. asyncpg DSN 사용 시 명시적 에러.
- 리비전: 단일 `api/alembic/versions/0001_initial_schema.py`.
- 모델: 선언적 base `Base(DeclarativeBase)` (`api/src/core/database.py`). UUID PK는 `postgresql.UUID(as_uuid=True)`.
  - auth: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `email_verifications`, `password_resets`, `oauth_accounts` (`api/src/domains/auth/models/auth_models.py`).
  - chat: `conversations`, `messages` (`api/src/domains/chat/models/chat_models.py`).

> RBAC 테이블(roles/permissions/조인)은 ORM 모델에 정의되어 있고 `require_permission`이 사용하나, 단일 초기 마이그레이션 외 시드/추가 리비전 여부는 마이그레이션 파일 직접 확인 필요.

### 인증 / 보안

- **python-jose[cryptography]** `>=3.3.0` — JWT encode/decode. 기본 알고리즘 HS256 (`api/src/domains/auth/security.py`).
- **passlib[argon2]** `>=1.7.4` + **argon2-cffi** `>=23.1.0` — 비밀번호 해싱(`CryptContext(schemes=["argon2"])`).
- JWT: access TTL 15분, refresh TTL 7일(보안 모듈 상수 + 설정). refresh 회전 + 재사용 탐지(family revocation), Redis `jwt:blacklist:` 블랙리스트.
- FastAPI 보안 스킴: `HTTPBearer(auto_error=False)` — Bearer 헤더만, 쿠키 미사용.

### 캐시 / Pub-Sub

- **redis[hiredis]** `>=5.2.0` — async 클라이언트 `redis.asyncio` (`api/src/core/redis.py`, `from_url`, `decode_responses=True`, `max_connections=20`). 용도: JWT 블랙리스트, refresh 재사용 탐지, OAuth state nonce, rate limit, 캐시, SSE fan-out.

### HTTP 클라이언트

- **httpx** `>=0.27.0` — OAuth 토큰 교환/유저인포 호출 (`api/src/domains/auth/oauth/*.py`). dev 그룹에도 중복 선언(AsyncClient 테스트용).

### 이메일

- **fastapi-mail** `>=1.4.2` — `ConnectionConfig`/`FastMail`/`MessageSchema` (`api/src/domains/auth/email.py`). 설정 조립은 `Settings.mail_connection_config`.

### 관측성 / 로깅

- **structlog** `>=24.4.0` — JSON 구조적 로깅 + `correlation_id` 바인딩 (`api/src/core/logging.py`, `configure_logging`). 포맷 `json`/`console` 선택.

### Rate Limiting

- **slowapi** `>=0.1.9` — `Limiter` 인스턴스(`api/src/main.py`), 키 함수 `_get_user_key`(인증 사용자 ID 우선, 없으면 remote IP), `RateLimitExceeded` 핸들러 등록.

### 스트리밍 / LLM / Chat

- **sse-starlette** `>=2.1.0` — `EventSourceResponse` (`api/src/domains/chat/router/chat_router.py`, `[DONE]` sentinel).
- **langchain** `>=0.3.0`, **langchain-core** `>=0.3.0`, **langchain-community** `>=0.3.0`.
- **langchain-litellm** `>=0.2.0** — `ChatLiteLLM` 어댑터 (`api/src/infra/llm/provider_factory.py`의 `make_chat_litellm`이 유일한 생성 지점).
- **litellm** `>=1.50.0** — provider 라우팅(openai/anthropic/gemini/azure/ollama).
- **tenacity** `>=8.5.0** — 일시적 LLM 에러 재시도.

### 에러 처리

- 응답 envelope나 `DOMAIN_NNN` 코드 체계 없음. 서비스가 `AppError` 계층(`NotFoundError`/`ConflictError`/`UnauthorizedError`/`ForbiddenError`, 각 `status_code` 보유, `api/src/core/exceptions.py`)을 raise → `register_exception_handlers`가 `{"detail": ...}` JSON + `X-Correlation-ID`로 변환. 라우터에서 `HTTPException` 직접 raise도 허용.

### 빌드 / 개발 도구

- **정식 진입점: `api/Taskfile.yml`** (Taskfile.dev). `env: PYTHONPATH: src` 전역 설정, 모든 Python 실행은 `uv run` 경유. `api/Justfile`은 동일 명령 미러링(보조).
  - 주요 태스크: `install`(uv sync + pre-commit), `infra`/`infra-down`(docker compose), `dev`(install+migrate+uvicorn reload), `serve`, `test`/`test-unit`/`test-integration`/`test-fast`/`test-cov`, `lint`(ruff+mypy), `format`, `typecheck`, `migrate`/`revision`/`downgrade`, `prod-up`/`prod-down`/`prod-build`/`prod-migrate`, `smoke-test*`.
- **ruff** `>=0.8.0** — 린터+포매터. line-length 100, double quote, lf. select: E/W/F/I/N/UP/B/C4/SIM/ANN/S/T20/PT/RUF. per-file ignore: tests, alembic, scripts, `config.py`(S104), `oauth/*`(S105).
- **mypy** `>=1.13.0** — `strict = true`, 플러그인 `pydantic.mypy` + `sqlalchemy.ext.mypy.plugin`. langchain/litellm/jose/passlib/redis/slowapi/fastapi_mail 등은 `ignore_missing_imports`.
- **pytest** `>=8.3.0** (+ pytest-asyncio `>=0.24.0`, pytest-cov `>=5.0.0`, anyio, fakeredis `>=2.26.0`). `asyncio_mode = "auto"`, `pythonpath = ["src"]`, 마커 unit/integration/e2e (`--strict-markers`), 커버리지 게이트 `--cov-fail-under=70`(대상 `src`, alembic/tests/migrations 제외), `filterwarnings = ["error", ...]`.
- **pre-commit** `>=4.0.0** + **detect-secrets** `>=1.5.0** (`api/.secrets.baseline`).
- 타입 스텁: `types-passlib`, `types-python-jose`, `sqlalchemy[mypy]`.

### 컨테이너 빌드

- `api/Dockerfile` — 멀티스테이지: `uv-binary`(핀: `ghcr.io/astral-sh/uv:0.6.13`) → `builder`(`python:3.12-slim-bookworm`, build-essential/libpq-dev/git, `/runtime-venv`에 런타임 전용 deps, `uv build --wheel`, compileall) → `runtime`(`python:3.12-slim-bookworm`, libpq5+curl만, 비root `appuser` uid 1000, `/runtime-venv` + alembic만 복사, uv/pip 부재).
  - ARG: `PYTHON_VERSION=3.12`, `UV_VERSION=0.6.13`.
  - HEALTHCHECK: `curl http://localhost:${PORT}/health`.
  - CMD: `uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers ${WORKERS:-1} --proxy-headers --forwarded-allow-ips='*'`.

### 설정 파일

- `api/.env` / `api/.env.example` / `api/.env.prod.example` — 환경변수.
- `api/pyproject.toml` — 메타데이터/deps/ruff/mypy/pytest/coverage.
- `api/alembic.ini`, `api/alembic/env.py` — 마이그레이션.
- `api/.dockerignore`, `api/.gitignore`, `api/.secrets.baseline`.

---

## WEB (`web/`)

### 언어 / 런타임 / 패키지 매니저

- **TypeScript** `^5.8.3`, **React 19** (`react`/`react-dom` `^19.0.0`).
- 패키지 매니저: **pnpm** (`packageManager: pnpm@10.28.2`, lock `web/pnpm-lock.yaml`, `web/pnpm-workspace.yaml`). engines: node `>=18.17.0`, pnpm `>=10.0.0`.
- 모듈 타입 ESM (`"type": "module"`).
- tsconfig (`web/tsconfig.json`): target ES2022, module ESNext, moduleResolution Bundler, jsx react-jsx, `strict`, `noUnusedLocals`/`noUnusedParameters`, path alias `@/* → ./src/*`. project reference `tsconfig.node.json`.

### 빌드 / 개발 도구

- **Vite** `^6.0.0` (`web/vite.config.ts`) — 개발 서버 port 3000. 플러그인: `@tanstack/router-plugin`(파일 기반 라우팅, `routesDirectory: src/routes`, `generatedRouteTree: src/routeTree.gen.ts`, autoCodeSplitting), `@vitejs/plugin-react` `^4.3.4`, `@tailwindcss/vite` `^4.0.0`, `vite-tsconfig-paths` `^5.1.4`.
- 스크립트(`web/package.json`): `dev`(vite), `build`(`tsc -b && vite build`), `preview`, `typecheck`(`tsc --noEmit`), `lint`(biome check), `lint:fix`, `format`.
- **Biome** `@biomejs/biome ^1.9.4** (`web/biome.json`) — formatter: 2 spaces, lineWidth 100, single quotes, trailing commas es5; linter recommended; organizeImports. ignore: node_modules/dist/`src/routeTree.gen.ts`.

### 핵심 프레임워크 / 라이브러리

- **라우팅: @tanstack/react-router** `^1.95.0` (+ devtools `^1.166.13`, router-plugin `^1.95.0`). 파일 기반(`web/src/routes/`).
- **서버 상태: @tanstack/react-query** `^5.75.0` — Provider 래핑 `web/src/providers/app-providers.tsx`(`QueryClientProvider`).
- **클라이언트 전역 상태: zustand** `^5.0.3` (+ immer `^11.1.4`). 디렉토리 `web/src/stores/`, `web/src/features/auth/store/`.
- **테이블: @tanstack/react-table** `^8.21.3`.
- **폼: react-hook-form** `^7.55.0` + `@hookform/resolvers` `^4.1.3` (+ devtools `^4.4.0`).
- **검증: zod** `^3.24.2` (한국어 메시지, `web/src/features/auth/schema/`).

### UI / 스타일

- **Tailwind CSS** `^4.0.0** (Vite 플러그인 경유) + `tw-animate-css` `^1.4.0`, `tailwind-merge` `^2.6.0`, `clsx` `^2.1.1`, `class-variance-authority` `^0.7.1`.
- **UI 프리미티브: @base-ui/react** `^1.4.1`, **radix-ui** `^1.4.3` (+ `@radix-ui/react-icons`/`react-label`/`react-slot`), shadcn 스타일(`web/components.json`, `web/src/components/ui/`).
- 아이콘: `lucide-react` `^0.487.0`. 애니메이션: `motion` `^11.18.0`, `react-focus-lock` `^2.13.7`.
- 폰트: `@fontsource-variable/inter` `^5.1.1`.
- 차트: `recharts` `^3.8.1`. 날짜: `date-fns` `^4.1.0`, `react-day-picker` `^10.0.0`. 커맨드 팔레트: `cmdk` `^1.1.1`. 토스트: `sonner` `^2.0.3`.
- 목 데이터: `@faker-js/faker` `^10.4.0`.

### 국제화

- **i18next** `^26.0.10` + **react-i18next** `^17.0.7`. 로케일 `web/src/sample/i18n/locales/{en,ko}/`.

### 프론트엔드 구조 (Feature-Sliced Design 변형)

- `web/src/routes/` — TanStack Router 파일 기반 라우팅 (`auth/`, `sample/`, `test/`).
- `web/src/features/{domain}/` — 도메인 슬라이스(components/hooks/store/schema/lib/types). 현재 `auth/`.
- `web/src/components/ui/` — Radix/Base UI + cva 프리미티브.
- `web/src/stores/` — Zustand 전역 상태.
- `web/src/providers/` — Provider 래핑.
- `web/src/sample/` — 대규모 샘플/데모 슬라이스(apps/auth/chats/dashboard/help-center/settings/tasks/users 등).
- `web/src/lib/` — `router.ts`, `utils.ts`.

> 프론트엔드 인증은 현재 **mock API**를 사용 중이며 실 API 미연동 상태다(`web/src/features/auth/lib/mock-auth-api.ts` — setTimeout 지연 + 하드코딩 분기). 통합 세부는 INTEGRATIONS.md 참조.
