---
last_mapped_commit: b8943aa32230936b80046e2f9b1a4dec458255df
mapped: 2026-06-05
---

# STRUCTURE

모노레포 루트는 `/Users/gyuha/workspace/office-works`. 두 워크스페이스 `api/`(Python FastAPI)와 `web/`(React SPA), 그리고 워크플로 디렉터리 `.forge/`로 구성된다.

```
office-works/
├── CLAUDE.md            모노레포 가이드
├── api/                 FastAPI 백엔드 (untracked in git)
└── web/                 React 19 SPA
```

---

## 1. API (`api/`)

### 1.1 루트 파일

- `Taskfile.yml` — 정식 진입점(Task). `PYTHONPATH=src` 전역 설정.
- `Justfile` — Taskfile 미러링(보조).
- `pyproject.toml` — uv 프로젝트 메타/의존성, `requires-python = ">=3.12"`, pytest/ruff/mypy 설정.
- `uv.lock` — 잠금 파일.
- `alembic.ini` — Alembic 설정.
- `Dockerfile`, `docker-compose.yml`(dev), `docker-compose.prod.yml`(prod), `.dockerignore`.
- `.env` / `.env.example` / `.env.prod.example` — 환경 변수(시크릿 포함, 값은 복사 금지).
- `README.md`, `CLAUDE.md`(Ouroboros 스펙 + api 가이드), `.secrets.baseline`.
- `htmlcov/` — 커버리지 HTML 리포트(생성물).

### 1.2 `api/src/` (flat 레이아웃, PYTHONPATH=src)

```
src/
├── __init__.py
├── __main__.py                 python -m 직접 실행 진입
├── main.py                     create_app() 앱 팩토리 + lifespan + 라우터 등록
├── core/                       횡단 관심사
│   ├── config.py               pydantic-settings Settings, get_settings(), LLMSettings
│   ├── database.py             async engine, Base, AsyncSessionFactory, get_async_session
│   ├── redis.py                async Redis 싱글톤, get_redis_dep
│   ├── exceptions.py           AppError 계층 + register_exception_handlers
│   ├── middleware.py           CorrelationIdMiddleware
│   └── logging.py              structlog 구성
├── domains/
│   ├── auth/
│   │   ├── router/auth_router.py        signup/login/refresh/logout/me/password-reset/oauth
│   │   ├── service/auth_service.py
│   │   ├── repository/auth_repository.py
│   │   ├── models/auth_models.py        users/roles/permissions/refresh_tokens/oauth_accounts 등
│   │   ├── schemas/auth_schemas.py      Pydantic v2 DTO
│   │   ├── security.py                  JWT/argon2/require_permission/get_current_user
│   │   ├── email.py                     fastapi-mail 전송
│   │   └── oauth/
│   │       ├── google.py
│   │       ├── kakao.py
│   │       └── naver.py
│   ├── chat/
│   │   ├── router/chat_router.py        /complete /stream(SSE) /provider /conversations
│   │   ├── service/chat_service.py      port에만 의존
│   │   ├── repository/chat_repository.py
│   │   ├── models/chat_models.py        conversations / messages
│   │   ├── schemas/chat_schemas.py
│   │   ├── ports.py                     LLMClientProtocol / LLMClientFactoryProtocol / AbstractLLMPort
│   │   ├── container.py                 DI 경계 — get_llm_factory / get_chat_service
│   │   ├── llm_client.py                LLMClient, DefaultLLMClientFactory
│   │   └── llm_factory.py               ProviderFactory — <provider>/<model> 라우팅
│   └── shared/
│       ├── base.py                      Entity / AggregateRoot / ValueObject (dataclass)
│       ├── events.py
│       └── types.py
└── infra/
    └── llm/provider_factory.py          langchain-litellm 어댑터 (make_chat_litellm)
```

각 디렉터리(`router`/`service`/`repository`/`models`/`schemas`/`oauth`/`infra/llm`)는 `__init__.py`로 패키지화되어 있다.

### 1.3 `api/alembic/`

```
alembic/
├── env.py                              동기 드라이버(psycopg2) 사용
├── script.py.mako
└── versions/
    └── 0001_initial_schema.py          유일 리비전
```

신규 리비전은 `task revision`(autogenerate). `0001_initial_schema` 수정 금지.

### 1.4 `api/tests/`

pytest. 마커 `unit`/`integration`/`e2e`(`--strict-markers`), `asyncio_mode = auto`, 커버리지 70% 강제. 도메인별 하위 디렉터리:

```
tests/
├── conftest.py
├── test_config.py / test_main_runtime.py / test_migrations.py / test_dev_server.py
├── auth/    (conftest.py + test_login_route.py, test_signup_route.py, test_refresh_*.py,
│             test_password_reset_*.py, test_auth_flows.py, test_*_schemas.py, ...)
├── chat/    (conftest.py, _mocks.py + test_llm_client.py, test_llm_factory.py, test_ports.py,
│             test_di_container.py, test_provider_routing.py, test_provider_mocks.py,
│             test_api_provider_switching.py)
├── shared/  (test_shared_domain.py)
└── infra/
```

### 1.5 `api/scripts/`

`smoke_test.py`, `wait_for_services.py`, `wait_for_services.sh`, `__init__.py`.

---

## 2. WEB (`web/`)

### 2.1 루트 파일

- `package.json` — pnpm, React 19, TanStack Router/Query/Table, Zustand, zod, react-hook-form, Tailwind v4, Biome.
- `vite.config.ts` — `tanstackRouter`(routes→`src/routeTree.gen.ts`, autoCodeSplitting), react, tailwindcss, tsconfigPaths. dev 서버 port 3000.
- `biome.json` — 2 spaces, lineWidth 100, single quotes, trailing commas es5. `src/routeTree.gen.ts` 무시.
- `tsconfig.json` — strict, `@/*` → `./src/*` 경로 별칭, `noEmit`.

### 2.2 `web/src/`

```
src/
├── main.tsx                    엔트리 — RouterProvider 렌더
├── vite-env.d.ts
├── routeTree.gen.ts            (생성물 — git 추적 시)
├── lib/
│   ├── router.ts               createRouter
│   └── utils.ts                cn() 등
├── providers/
│   └── app-providers.tsx       QueryClientProvider
├── stores/                     Zustand 전역 클라이언트 상태
│   ├── modal-store.ts          useModal (devtools)
│   └── modal.types.ts
├── hooks/
│   ├── use-mobile.ts
│   └── use-theme.ts
├── styles/
│   └── globals.css             Tailwind v4
├── components/
│   ├── theme-toggle.tsx
│   ├── ui/                     shadcn 스타일 프리미티브 31개 (button, dialog, form, table, ...)
│   │   └── modal/              modal-manager / container / backdrop / form / header / default / modal
│   ├── layout/auth-shell.tsx
│   └── dev/form-devtool.tsx
├── routes/                     TanStack Router 파일 기반 라우팅
│   ├── __root.tsx
│   ├── index.tsx / sample.tsx
│   ├── auth/                   login.tsx, signup.tsx
│   ├── test/modal.tsx
│   └── sample/                 dashboard/users/tasks/chats/apps/settings/errors/auth/help-center
├── features/                   도메인 슬라이스 (FSD)
│   └── auth/
│       ├── components/         login-form.tsx, signup-form.tsx
│       ├── hooks/              use-auth-mutation.ts (TanStack Query)
│       ├── schema/             auth.schema.ts (zod, 한국어 메시지)
│       ├── store/              auth.store.ts (Zustand useAuthStore)
│       ├── types/              auth.ts
│       └── lib/                mock-auth-api.ts (실 API 미연동 — mock)
└── sample/                     admin 대시보드 데모 (features와 분리된 참조 구현)
    ├── i18n/                   index.ts, locales/{ko,en}/sample.json
    ├── layout/ lib/ auth/ dashboard/ users/ tasks/ chats/ apps/ settings/ help-center/ errors/ smoke/
    └── (각 슬라이스: components/ types/ data/ schema/ store/ pages/ + *.test.ts)
```

### 2.3 명명 규칙

- **web 파일명: `kebab-case`** (`use-auth-mutation.ts`, `login-form.tsx`, `mock-auth-api.ts`). 라우트 동적 세그먼트는 `$userId.tsx` 형식.
- **web 슬라이스 내부 표준 디렉터리**: `components/`, `hooks/`, `schema/`, `store/`, `types/`, `data/`, `pages/`.
- **api 모듈명: `snake_case`** (`auth_router.py`, `chat_service.py`, `provider_factory.py`). 도메인 레이어 디렉터리는 `router`/`service`/`repository`/`models`/`schemas`.
- **api 스키마 명명**: `<Entity>Request` / `<Entity>Response` / `<Entity>Create` (Pydantic v2, `from_attributes=True`).
- **테스트(api)**: 파일 `test_*.py`, 클래스 `Test*`, 함수 `test_methodUnderTest_scenario_expectation`. 마커 `unit`/`integration`/`e2e`.
- **테스트(web)**: `*.test.ts` (주로 `sample/` 내부).
