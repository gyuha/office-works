---
last_mapped_commit: 7813838ac56097621569a9ce37a8afe4f10f0b54
mapped: 2026-06-11
---

# STRUCTURE — office-works

모노레포 루트는 `api/`(FastAPI), `web/`(React SPA), 루트 `Taskfile.yml`(크로스 패키지 태스크 — `gen-api` 등), 루트 `CLAUDE.md`로 구성된다. 워킹 트리 기준(미커밋 파일 포함).

## 1. `api/src/` — flat 레이아웃

패키지 prefix 없이 `PYTHONPATH=src`로 톱레벨 import한다(`api/Taskfile.yml`이 전역 설정). 즉 `from core.database import Base`, `from domains.auth.models import User` 형태.

```
api/src/
├── main.py                  # 앱 팩토리 create_app() + 모듈 레벨 app + health/ready 인라인 라우터
├── __main__.py              # python -m 실행 진입점
├── core/                    # 횡단 관심사
│   ├── config.py            # pydantic-settings Settings (.env, LLM_ prefix)
│   ├── database.py          # async engine, async_sessionmaker, Base, get_async_session
│   ├── redis.py             # get_redis_client / get_redis_dep / close_redis_client
│   ├── exceptions.py        # AppError 계층 + register_exception_handlers
│   ├── ids.py               # prefixed ULID PK (id_column, USER/ROLE/... prefix 상수)
│   ├── logging.py           # structlog 설정
│   └── middleware.py        # CorrelationIdMiddleware
├── domains/
│   ├── auth/
│   │   ├── router/auth_router.py
│   │   ├── service/auth_service.py
│   │   ├── repository/auth_repository.py
│   │   ├── models/auth_models.py    # User, Role, Permission, RefreshToken, EmailVerification, PasswordReset, OAuthAccount
│   │   ├── schemas/auth_schemas.py
│   │   ├── oauth/                   # google.py, kakao.py, naver.py, microsoft.py
│   │   ├── security.py              # JWT, get_current_user, require_permission
│   │   └── email.py
│   ├── users/                       # 직원 디렉토리 (구 members 병합) — 자체 models 없음, auth User 공유
│   │   ├── router/user_router.py
│   │   ├── service/user_directory_service.py
│   │   ├── repository/user_directory_repository.py
│   │   └── schemas/user_schemas.py
│   ├── chat/
│   │   ├── router/chat_router.py
│   │   ├── service/chat_service.py
│   │   ├── repository/chat_repository.py
│   │   ├── models/chat_models.py
│   │   ├── schemas/chat_schemas.py
│   │   ├── container.py             # DI 컨테이너
│   │   ├── ports.py / llm_client.py / llm_factory.py
│   ├── org/                         # 조직 설정 — 엔티티별 파일 분리
│   │   ├── router/    {position,employment_type,grade,config}_router.py + __init__.py(집계 router)
│   │   ├── service/   {position,employment_type,grade,config}_service.py
│   │   ├── repository/{position,employment_type,grade,config}_repository.py
│   │   ├── models/org_models.py     # Position, EmploymentType, Grade, WorkSettings, LeaveSettings, CompanyInfo
│   │   └── schemas/org_schemas.py
│   └── shared/                      # base.py(엔티티 base), events.py, types.py
└── infra/
    └── llm/provider_factory.py      # LLM provider 어댑터
```

**API 파일 네이밍 규칙:** snake_case, 레이어별 디렉토리 안에 `{도메인}_{레이어}.py`(예: `user_router.py`, `auth_service.py`). org처럼 엔티티가 여럿이면 `{엔티티}_{레이어}.py`로 분할. 각 레이어 디렉토리의 `__init__.py`가 public 심볼을 re-export한다(예: `from domains.users.repository import UserDirectoryRepository`).

### `api/` 기타

```
api/
├── alembic/versions/        # 0001_initial_schema.py ~ 0011_user_memo.py (0010/0011 미커밋)
├── scripts/                 # seed.py(task seed), smoke_test.py, wait_for_services.{py,sh}
├── openapi.json             # OpenAPI 스냅샷 (task gen-api가 export, web 코드젠 입력)
├── Taskfile.yml             # 정식 진입점 (PYTHONPATH=src 설정) / Justfile은 미러
└── pyproject.toml           # requires-python >= 3.14, pytest addopts --cov-fail-under=70
```

## 2. `api/tests/` — 도메인별 미러 구조

```
api/tests/
├── conftest.py              # 공용 픽스처 (autouse settings_cache_clear 등)
├── test_config.py / test_dev_server.py / test_main_runtime.py / test_migrations.py
├── auth/                    # conftest.py + test_{기능}_{관점}.py (예: test_login_route.py, test_signup_schemas.py)
├── chat/                    # _mocks.py + conftest.py + test_*.py
├── org/                     # test_{엔티티}_{router|service}.py 쌍
├── users/                   # test_user_router.py, test_user_service.py
├── shared/                  # test_shared_domain.py
└── infra/llm/               # test_provider_factory.py
```

규칙: pytest `asyncio_mode = auto`(async 데코레이터 불필요), 마커 `unit`/`integration`/`e2e`(`--strict-markers`), 메서드명 `test_methodUnderTest_scenario_expectation`, Redis는 fakeredis 스텁. 커버리지 70% 게이트.

## 3. `web/src/` — Feature-Sliced 변형

파일명은 **kebab-case** (예: `use-auth-mutation.ts`, `login-form.tsx`). Biome(2 spaces, 100자, single quotes), import alias `@/` = `web/src/`.

```
web/src/
├── main.tsx                 # 부팅: setupApiClient() + RouterProvider
├── routeTree.gen.ts         # TanStack Router 코드젠 (수정 금지)
├── routes/                  # 파일 기반 라우팅
│   ├── __root.tsx           # AppProviders + Modals + Toaster
│   ├── _app.tsx             # 인증 게이트 레이아웃 (+ AppShell)
│   ├── _app/
│   │   ├── index.tsx
│   │   └── app.$screenId.tsx   # SCREEN_REGISTRY 동적 스크린
│   ├── auth/                # login.tsx, signup.tsx, callback.tsx
│   ├── login.tsx
│   ├── sample/**            # 템플릿 데모 라우트 (실 기능 아님)
│   └── test/modal.tsx
├── client/                  # hey-api 코드젠 산출물 (수정 금지 — task gen-api로 재생성)
│   ├── sdk.gen.ts / types.gen.ts / client.gen.ts / index.ts
│   ├── @tanstack/react-query.gen.ts   # TanStack Query options 코드젠
│   ├── client/ / core/      # 런타임 헬퍼 (.gen.ts)
├── features/                # 도메인 슬라이스
│   ├── auth/                # components/, hooks/, schema/, store/(auth.store.ts), types/, lib/(mock-auth-api.ts — 실 API 미연동)
│   └── office/
│       ├── components/      # app-shell.tsx, sidebar.tsx, topbar.tsx, dashboard/
│       ├── screens/         # registry.ts(SCREEN_REGISTRY) + members.tsx, teams.tsx, settings.tsx, projects.tsx, approval.tsx, attendance.tsx, types.ts
│       ├── store/sidebar-store.ts
│       ├── nav.ts / icons.tsx
├── components/
│   ├── ui/                  # shadcn 스타일 프리미티브 (button.tsx, dialog.tsx, modal/, rich-text-editor.tsx — 미커밋 Tiptap)
│   ├── layout/auth-shell.tsx
│   └── dev/form-devtool.tsx
├── providers/app-providers.tsx   # QueryClientProvider
├── stores/                  # 전역 Zustand: modal-store.ts, modal.types.ts
├── hooks/                   # use-mobile.ts, use-theme.ts
├── lib/                     # router.ts, hey-api.ts(createClientConfig), api-client.ts(인터셉터), utils.ts, api.ts
├── sample/**                # 템플릿 데모 코드 일체 (i18n 포함) — 실 기능과 격리
└── styles/globals.css
```

### `web/` 기타

```
web/
├── openapi-ts.config.ts     # hey-api 코드젠 설정 (input: ../api/openapi.json, output: src/client)
├── vite.config.ts           # dev 서버 port 3000
├── biome.json(.jsonc)       # lint/format
└── package.json             # pnpm scripts: dev/build/typecheck/lint
```

## 4. 네이밍/배치 규칙 요약

| 영역 | 규칙 | 예 |
|------|------|----|
| API 모듈 | snake_case, `{도메인 또는 엔티티}_{레이어}.py` | `api/src/domains/org/service/grade_service.py` |
| API import | flat (`PYTHONPATH=src`) | `from core.exceptions import AppError` |
| API 테스트 | `tests/{도메인}/test_*.py`, 소스 미러 | `api/tests/users/test_user_service.py` |
| web 파일 | kebab-case | `web/src/features/auth/hooks/use-auth-mutation.ts` |
| web 스토어 | `{이름}.store.ts` 또는 `{이름}-store.ts` | `auth.store.ts`, `sidebar-store.ts` |
| web 라우트 | TanStack 컨벤션 (`_app` 레이아웃, `$param`) | `web/src/routes/_app/app.$screenId.tsx` |
| 코드젠 산출물 | `*.gen.ts` — 직접 수정 금지 | `web/src/client/types.gen.ts`, `web/src/routeTree.gen.ts` |
| 시드/스크립트 | `api/scripts/` | `api/scripts/seed.py` |
