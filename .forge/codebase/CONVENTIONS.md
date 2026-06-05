---
last_mapped_commit: b8943aa32230936b80046e2f9b1a4dec458255df
mapped: 2026-06-05
---

# 코드 컨벤션

모노레포는 `api/`(Python 3.12 / uv / FastAPI)와 `web/`(React 19 SPA / Biome)로 나뉜다. 두 영역의 컨벤션을 분리해 기술한다. 모든 facts는 디스크의 실제 파일에서 확인했다.

---

## API (`api/`)

### 정적 분석 설정 — `api/pyproject.toml`

ruff와 mypy 모두 `[tool.*]`로 `pyproject.toml`에 정의된다.

- **ruff** (`[tool.ruff]`, line 134~172): `target-version = "py312"`, `line-length = 100`, `src = ["src"]`.
  - 활성 룰셋(`[tool.ruff.lint] select`): `E`, `W`, `F`, `I`(isort), `N`(pep8-naming), `UP`(pyupgrade), `B`(bugbear), `C4`, `SIM`, `ANN`(annotations), `S`(bandit), `T20`(print 금지), `PT`(pytest-style), `RUF`.
  - 전역 무시(`ignore`): `ANN401`(동적 kwargs는 framework/LLM 경계에서 허용), `S101`(assert), `B008`(FastAPI DI 기본값 함수 호출 패턴).
  - per-file-ignores: `tests/**`는 `S101`/`ANN`/`T20`/`N806`/`E501` 등 대거 완화, `alembic/**`·`scripts/**`도 별도 완화, `src/core/config.py`는 `S104`, `src/domains/auth/oauth/*.py`는 `S105`.
  - **포매터**(`[tool.ruff.format]`): `quote-style = "double"`(파이썬은 큰따옴표), `indent-style = "space"`, `line-ending = "lf"`.
- **mypy** (`[tool.mypy]`, line 177~205): `python_version = "3.12"`, `strict = true`, `mypy_path = ["src"]`, `explicit_package_bases = true`. 플러그인 `pydantic.mypy` + `sqlalchemy.ext.mypy.plugin`. 단, `disallow_any_generics = false`, `warn_return_any = false`로 일부 strict 룰을 완화한다. langchain/litellm/jose/passlib/redis/slowapi 등은 `ignore_missing_imports = true`.

### 레이어 구조

`src/`는 flat 레이아웃(톱레벨 패키지 prefix 없음, `PYTHONPATH=src`). 도메인별 레이어: `router → service → repository → models`, DTO는 `schemas/`.

- `api/src/core/` — config, database, redis, exceptions, logging, middleware (횡단 관심사)
- `api/src/domains/{auth,chat,shared}/` — 도메인 슬라이스
- `api/src/infra/llm/` — 외부 어댑터(`provider_factory.py`)
- `api/src/main.py` — `create_app` 앱 팩토리

### 파일·모듈 네이밍

- 모듈은 `snake_case`. 도메인 레이어 디렉터리(`router/`, `service/`, `repository/`, `models/`, `schemas/`) 안의 파일은 도메인 prefix를 단다: `auth_router.py`, `auth_service.py`, `auth_repository.py`, `auth_models.py`, `auth_schemas.py`. chat 도메인도 동일(`chat_router.py` 등).
- 모든 소스 파일은 `from __future__ import annotations`로 시작하고, 모듈 상단에 docstring을 둔다.

### Pydantic v2 DTO — `schemas/`

요청/응답 DTO는 전부 `BaseModel`. 확인 위치: `api/src/domains/auth/schemas/auth_schemas.py`.

- 네이밍 컨벤션(파일 docstring에 명시): `<Entity>Create`(생성 요청), `<Entity>Response`(응답), `<Entity>Request`(create/update에 안 맞는 일반 요청). 실제로는 `SignupRequest`/`SignupResponse`, `LoginRequest`, `TokenResponse`, `RefreshRequest` 등.
- ORM → 응답 변환은 `model_config = {"from_attributes": True}` + `Model.model_validate(orm_obj)` (예: `UserResponse`, 라우터에서 `UserResponse.model_validate(user)`).
- 필드 제약은 `Field(min_length=…, max_length=…, gt=…)`, 이메일은 `EmailStr`, 고정 리터럴은 `Literal["bearer"]`.
- 검증/정규화는 `@field_validator(..., mode="before")` classmethod로. 이메일 trim+lower(`normalize_email`), 비밀번호 강도 검사(`password_strength`), 공백 거부 등. 검증 실패는 `raise ValueError(...)` → FastAPI가 422로 변환.
- chat 도메인의 라우터-로컬 DTO(`ChatRequest`/`ChatResponse`/`ProviderInfoResponse`)는 `chat_router.py` 안에 직접 정의되기도 한다(엔드포인트 전용).

### 비동기 일관성

DB는 SQLAlchemy 2.0 async(`AsyncSession` + asyncpg). 라우터·서비스·리포지토리 메서드는 전부 `async def`. Alembic 마이그레이션만 동기 드라이버(psycopg2, `sync_database_url`). 리포지토리는 `select()/update()/delete()` + `await self._session.execute(...)` + `scalar_one_or_none()` 패턴(`auth_repository.py`). 트랜잭션은 리포지토리의 `@asynccontextmanager async def transaction()`로 감싸며, 이미 트랜잭션 중이면 `begin_nested()`를 사용한다.

### 의존성 주입

FastAPI `Depends` + 서비스 생성자 주입. `api/src/domains/auth/router/auth_router.py`의 `_get_service` 헬퍼가 `get_async_session`·`get_redis_dep`·`get_auth_email_service`로 세션/Redis/메일러를 받아 `AuthService(AuthRepository(session), redis, mail_service=...)`를 조립한다. 서비스는 HTTP를 모르며 repo/redis/mail port만 주입받는다(`auth_service.py`의 `__init__`). 설정은 `get_settings()`(전역) 또는 `Depends(get_settings)`. chat 도메인은 `container.get_chat_service`/`get_llm_factory`로 주입하고, 테스트는 `app.dependency_overrides[get_llm_factory]`로 stub 교체한다.

### 에러 처리 — `api/src/core/exceptions.py`

응답 envelope나 `DOMAIN_NNN` 코드 체계가 **없다**.

- 서비스 계층은 `AppError` 계층을 raise한다: `AppError`(base, `message` + `status_code`, 기본 400), `NotFoundError`(404, `"{resource} not found."`), `ConflictError`(409), `UnauthorizedError`(401), `ForbiddenError`(403). 각 서브클래스가 자기 `status_code`를 보유.
- 라우터는 `try/except AppError`로 받아 `_app_error_to_http(exc)`(auth_router.py line 76)로 `HTTPException`으로 변환한다. 401일 때 `WWW-Authenticate: Bearer` 헤더를 붙인다. 라우터에서 `HTTPException`을 직접 raise하는 것도 허용(예: OAuth 400/502, chat 422/404/502).
- 앱 레벨 핸들러는 `register_exception_handlers(app)`로 일괄 등록: `HTTPException`/`RequestValidationError`(422)/`Exception`(500). 모든 에러 응답 본문은 `{"detail": ...}` JSON이며 `X-Correlation-ID` 헤더를 포함한다(`_error_response`).

### 설정 — pydantic-settings

`api/src/core/config.py`의 `Settings(BaseSettings)`. `model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore", populate_by_name=True)`. `@lru_cache(maxsize=1)`로 싱글턴(`get_settings()`); 테스트에서는 `get_settings.cache_clear()`로 무효화. 시크릿은 `SecretStr`(`secret_key`, `jwt_secret_key`, `*_api_key`, `postgres_password` 등) — 사용 시 `.get_secret_value()`. enum은 `StrEnum`(`AppEnv`, `LLMProvider`, `LogFormat`). 파생값은 `@property`(`async_database_url`, `sync_database_url`, `redis_dsn`, `cors_origins_list`, `llm`). LLM 설정은 별도 `LLMSettings(BaseSettings)`에 `env_prefix="LLM_"`, 단 provider별 API 키는 prefix 없이 `Field(alias="OPENAI_API_KEY")` 등으로 받는다.

### 로깅 — structlog

`structlog.get_logger(__name__)`로 모듈 로거 획득. 이벤트는 첫 인자에 이벤트명(snake_case 문자열), 나머지는 키워드로 구조화(`logger.info("user_created", user_id=..., email=...)`). `CorrelationIdMiddleware`(`api/src/core/middleware.py`)가 요청마다 `X-Correlation-ID`를 읽거나 uuid4 생성하고 `structlog.contextvars.bind_contextvars`로 `correlation_id`/`method`/`path`를 바인딩, 요청 시작/종료를 `request_started`/`request_finished`로 기록한다.

### 도메인 베이스 — `api/src/domains/shared/base.py`

DDD building block은 **순수 dataclass**(SQLAlchemy `Base`와 무관): `Entity`(`@dataclass(eq=False)`, UUID identity 기반 `__eq__`/`__hash__`), `AggregateRoot`(timestamps + `version`), `ValueObject`(`@dataclass(frozen=True)`). ORM 모델은 별개로 `core.database.Base`를 직접 상속한다(`auth_models.py`는 `Mapped`/`mapped_column` + `postgresql.UUID(as_uuid=True)`, M:N은 `Table`).

---

## Web (`web/`)

### Biome 설정 — `web/biome.json`

Biome 1.9.4가 린터+포매터(eslint/prettier 없음). `pnpm lint`=`biome check .`, `pnpm lint:fix`=`biome check --write .`, `pnpm format`=`biome format --write .`.

- `organizeImports.enabled: true`, `linter.rules.recommended: true`.
- formatter: `indentStyle: "space"`, `indentWidth: 2`(2 스페이스), `lineWidth: 100`(100 칼럼).
- javascript.formatter: `quoteStyle: "single"`(작은따옴표 — 파이썬과 반대), `trailingCommas: "es5"`.
- ignore: `node_modules`, `dist`, `.superpowers`, `src/routeTree.gen.ts`(TanStack Router 생성 파일).

### 파일명 — kebab-case

모든 소스 파일은 `kebab-case`. 컴포넌트 `login-form.tsx`/`signup-form.tsx`, 훅 `use-auth-mutation.ts`/`use-mobile.ts`, store `auth.store.ts`/`modal-store.ts`, 스키마 `auth.schema.ts`. 라우트는 TanStack Router 파일 기반(`routes/auth/login.tsx`, 동적 세그먼트 `$userId.tsx`).

### 디렉터리 구조 (Feature-Sliced Design 변형)

- `web/src/routes/` — TanStack Router 파일 기반 라우팅. plugin이 `src/routeTree.gen.ts`를 생성(`vite.config.ts`의 `tanstackRouter`).
- `web/src/features/{domain}/` — 도메인 슬라이스. auth 슬라이스는 `components/`, `hooks/`, `store/`, `schema/`, `types/`, `lib/`로 구성.
- `web/src/components/ui/` — Radix/Base UI + cva 기반 프리미티브(shadcn 스타일).
- `web/src/stores/` — Zustand 전역 클라이언트 상태. `web/src/providers/` — Provider 래핑(`app-providers.tsx`).
- `web/src/sample/` — 광범위한 샘플/데모 코드(admin shell, settings, tasks, users, dashboard 등). 별도 `sample-*` prefix 컴포넌트와 자체 i18n(`sample/i18n/locales/{ko,en}/sample.json`)을 둔다.

### 상태 관리 분리

- **서버 상태 = TanStack Query**: `web/src/features/auth/hooks/use-auth-mutation.ts`는 `useMutation`으로 로그인/회원가입, `onSuccess`에서 store 갱신 + `useNavigate` 이동 + sonner `toast`. 현재 mutationFn은 `mock-auth-api.ts`의 `mockLogin`/`mockSignup`을 호출(실 API 미연동).
- **클라이언트 전역 상태 = Zustand**: `web/src/features/auth/store/auth.store.ts`는 `create<AuthState>((set) => ({...}))` 패턴, `setUser`/`clearUser` 액션.

### Zod 검증 — 한국어 메시지

`web/src/features/auth/schema/auth.schema.ts`. 스키마는 `z.object`, 메시지는 한국어 문자열로 인라인:

```typescript
email: z.string().email('유효한 이메일 주소를 입력해주세요'),
password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
```

교차 필드 검증은 `.refine((data) => ..., { message: '비밀번호가 일치하지 않습니다', path: ['confirmPassword'] })`. 폼 값 타입은 `z.infer<typeof schema>`로 도출(`LoginFormValues`, `SignupFormValues`). 폼은 react-hook-form + `@hookform/resolvers`(zodResolver) 조합(package.json 의존성).

### TypeScript / 빌드

`web/package.json`: `"type": "module"`, 패키지 매니저 `pnpm@10.28.2`, Node `>=18.17.0`. `pnpm build`=`tsc -b && vite build`, `pnpm typecheck`=`tsc --noEmit`, `pnpm dev`=vite(port 3000). React 19, Vite 6, Tailwind 4(`@tailwindcss/vite`), 경로 별칭은 `vite-tsconfig-paths`.
