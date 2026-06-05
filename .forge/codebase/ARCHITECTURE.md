---
last_mapped_commit: b8943aa32230936b80046e2f9b1a4dec458255df
mapped: 2026-06-05
---

# ARCHITECTURE

`office-works`는 FastAPI 백엔드(`api/`)와 React 19 SPA(`web/`)로 구성된 모노레포다. 두 영역은 서로 다른 아키텍처 패턴을 따른다. 이 문서는 디스크에 존재하는 현재 코드를 기준으로 한다.

> 참고: `web/`의 인증은 아직 `api/`와 연동되지 않았다. `web/src/features/auth/hooks/use-auth-mutation.ts`가 `web/src/features/auth/lib/mock-auth-api.ts`의 mock 함수를 호출한다.

---

## 1. API — 계층형 도메인 아키텍처

### 1.1 패턴

`api/src/`는 flat 레이아웃이다. 패키지 prefix 없이 `PYTHONPATH=src`로 `core`/`domains`/`infra`를 톱레벨 import한다. 도메인은 DDD/헥사고날을 절충한 계층 구조를 따른다.

```
{domain}/router → service → repository → models
{domain}/schemas  (Pydantic v2 요청/응답 DTO)
core/             (config, database, redis, exceptions, logging, middleware — 횡단 관심사)
infra/            (llm — provider_factory 등 외부 어댑터)
```

- `router` — HTTP 핸들러. FastAPI `Depends`로 service를 조립하고 `AppError`를 `HTTPException`으로 변환한다.
- `service` — 비즈니스 로직. HTTP를 모르고 `AppError` 하위 예외를 raise한다.
- `repository` — 모든 DB I/O. `AsyncSession`을 받아 SQLAlchemy 2.0 쿼리를 실행한다.
- `models` — SQLAlchemy ORM. 전부 `core/database.py`의 `Base`를 상속한다.
- `schemas` — Pydantic v2 DTO. ORM 직렬화는 `model_config = {"from_attributes": True}` 사용.

흐름: `라우터 → 서비스 → 리포지토리 → 모델`

### 1.2 엔트리포인트 — 앱 팩토리

`api/src/main.py`가 진입점이다.

- `create_app()` — FastAPI 인스턴스를 만들고 미들웨어/예외 핸들러/라우터를 등록한다. 모듈 레벨 `app = create_app()`이 uvicorn 진입점이다.
- `lifespan` (asynccontextmanager) — 시작 시 `configure_logging` 호출, Redis 풀 warm-up(`get_redis_client().ping()`), 종료 시 `close_redis_client()`.
- `_register_routers(application)` — `health_router`(루트 `/health`, `/ready`)는 prefix 없이 등록. `domains.auth.router`와 `domains.chat.router`는 `/api/v1` prefix로 등록(import 실패 시 graceful skip).
- `limiter = Limiter(key_func=_get_user_key)` — slowapi 레이트리미터. 키는 인증 사용자 ID 또는 remote IP.

`api/src/__main__.py` + `main.py`의 `if __name__ == "__main__"` 블록은 `python -m` 직접 실행(개발 시 hot-reload ON)을 지원한다.

### 1.3 미들웨어 + 요청 흐름

미들웨어는 outermost→innermost 순서로 `CorrelationIdMiddleware` → `CORSMiddleware`.

`CorrelationIdMiddleware`(`api/src/core/middleware.py`):
- 요청 헤더의 `X-Correlation-ID`를 읽고, 없으면 `uuid4` 생성.
- structlog contextvars에 `correlation_id`/`method`/`path` 바인딩 → 응답 후 clear.
- `request_started`/`request_finished` 로그를 INFO로 남기고 응답 헤더에 `X-Correlation-ID` 부착.

요청 데이터 흐름:

```
요청 → CorrelationIdMiddleware → CORS → 라우터(/api/v1) → 서비스 → 리포지토리 → DB(AsyncSession)
                                                  ↓ AppError raise
                                  register_exception_handlers → {"detail": ...} JSON + X-Correlation-ID
```

### 1.4 에러 처리

`api/src/core/exceptions.py`:
- `AppError(message, status_code)` 기반 계층 — `NotFoundError`(404), `ConflictError`(409), `UnauthorizedError`(401), `ForbiddenError`(403). 각 인스턴스가 `status_code`를 보유.
- `register_exception_handlers(application)`가 세 핸들러를 등록: `HTTPException`(`{"detail": ...}`), `RequestValidationError`(422, Pydantic ctx의 비직렬화 객체를 문자열로 sanitize), generic `Exception`(500, "Internal server error.").
- **응답 envelope나 `DOMAIN_NNN` 코드 체계는 없다.** 모든 에러 응답은 `{"detail": ...}` + `X-Correlation-ID` 헤더.
- 주의: `AppError` 자체에 대한 핸들러는 등록되지 않는다. 라우터의 `_app_error_to_http()` 헬퍼(`auth_router.py`)가 서비스의 `AppError`를 잡아 `HTTPException`으로 수동 변환한다(401일 때 `WWW-Authenticate: Bearer` 헤더 추가). chat 라우터는 `HTTPException`을 직접 raise한다.

### 1.5 비동기 + 영속성 패턴

`api/src/core/database.py`:
- SQLAlchemy 2.0 **async** — `create_async_engine(settings.async_database_url)` + asyncpg 드라이버.
- 엔진 파라미터: `pool_pre_ping=True`, `pool_size=5`, `max_overflow=10`, `pool_recycle=3600`, `echo=settings.app_debug`.
- `AsyncSessionFactory = async_sessionmaker(expire_on_commit=False, autoflush=False, autocommit=False)`.
- `get_async_session()` — FastAPI 의존성. 정상 시 commit, 예외 시 rollback, 항상 close.
- `Base(DeclarativeBase)` — 모든 도메인 모델의 부모.
- 핸들러·서비스·리포지토리는 전부 `async def`.
- **Alembic 마이그레이션만 동기 드라이버(psycopg2, `DATABASE_URL_SYNC`)를 쓴다** (`api/alembic/env.py`).

Redis(`api/src/core/redis.py`):
- `redis.asyncio` 싱글톤 클라이언트. `get_redis_client()`(lazy 풀 생성, `decode_responses=True`, `max_connections=20`), `close_redis_client()`, `get_redis_dep()`(FastAPI 의존성).
- 용도: JWT blacklist(`jti`), refresh-token 재사용 탐지, OAuth state nonce, 레이트리밋, 캐시, SSE pub/sub.

### 1.6 의존성 주입

FastAPI `Depends` + 서비스 생성자 주입.

- auth: `auth_router.py`의 `_get_service()`가 `get_async_session`/`get_redis_dep`/`get_auth_email_service`를 받아 `AuthService(AuthRepository(session), redis, mail_service=...)`를 조립.
- chat: `domains/chat/container.py`가 DI 경계. `get_llm_factory()`가 `LLMClientFactoryProtocol`(인터페이스)을 반환하고, `get_chat_service(factory)`가 `ChatService(llm_client=factory.get_llm_client())`를 빌드. 구상 클래스(`DefaultLLMClientFactory`) import는 함수 내부에 두어 모듈 네임스페이스에 노출되지 않는다(아키텍처 경계 강제). 테스트는 `app.dependency_overrides[get_llm_factory]`로 stub 주입.
- 설정: `get_settings()`(`core/config.py`, `@lru_cache`)로 주입. pydantic-settings `Settings`, `.env` 로드, LLM 설정은 `LLM_` prefix.

### 1.7 핵심 추상화

- **auth 도메인** (`domains/auth/`) — 회원가입·이메일 인증·로그인·토큰 회전·로그아웃·비밀번호 재설정·OAuth2. JWT(Bearer only, access 15분 / refresh 7일, `jti` + Redis blacklist), argon2(`passlib`) 비밀번호 해싱, `require_permission(key)` RBAC 의존성 팩토리, `get_current_user` 의존성 (`security.py`). `oauth/`에 Google/Kakao/Naver 어댑터, 라우터의 `_get_oauth_adapter()`가 provider 문자열로 분기. 이메일은 `fastapi-mail`(`email.py`, dev=Mailpit, prod=SMTP).
- **chat 도메인** (`domains/chat/`) — 헥사고날(Ports & Adapters). `ports.py`에 `LLMClientProtocol`(runtime_checkable Protocol), `LLMClientFactoryProtocol`, `AbstractLLMPort`(ABC) 정의. `ChatService`(`service/chat_service.py`)는 port 추상화에만 의존하고 LangChain/litellm 타입은 `TYPE_CHECKING` 블록에서만 import. 동기(`/complete`) + SSE 스트리밍(`/stream`, `sse-starlette` `EventSourceResponse`) 제공. DB 백킹 conversation/message CRUD는 `ChatRepository`(`require_permission("chat:write")` 가드, 스트림 종료 후 assistant 메시지 영속화 + 첫 턴 auto-title).
- **shared 도메인** (`domains/shared/`) — `base.py`의 DDD 베이스(`Entity`/`AggregateRoot`/`ValueObject`, 순수 dataclass — SQLAlchemy `Base`와 무관), `events.py`, `types.py`.
- **infra/llm** (`infra/llm/provider_factory.py`) — langchain-litellm 어댑터. `LLM_PROVIDER` env만 바꾸면 openai/anthropic/gemini/azure/ollama 전환. 도메인이 `langchain_litellm`을 직접 import하지 않도록 격리하는 단일 지점. 모델 문자열 라우팅(`<provider>/<model>`)은 `domains/chat/llm_factory.py`의 `ProviderFactory`.

---

## 2. WEB — Feature-Sliced Design 변형

### 2.1 엔트리포인트

`web/src/main.tsx` — `createRoot`로 `RouterProvider`(TanStack Router) 렌더. `@fontsource-variable/inter`, `@/styles/globals.css`, `@/sample/i18n` import. `StrictMode` 래핑.

`web/src/lib/router.ts` — `createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true })`. `routeTree`는 `@/routeTree.gen`(Vite `@tanstack/router-plugin`이 `src/routes`에서 자동 생성).

`web/src/routes/__root.tsx` — 루트 라우트. `AppProviders` 래핑, `Outlet`, `Modals`(`modal-manager`), `Toaster`(sonner), DEV 시 `TanStackRouterDevtools`. sample 경로가 아닐 때만 `ThemeToggle` 렌더.

### 2.2 Provider 계층

`web/src/providers/app-providers.tsx` — `QueryClientProvider`만 래핑. `QueryClient`는 `useState`로 1회 생성, `mutations.retry: false`. 별도 Auth Provider는 없다(인증 상태는 Zustand store).

### 2.3 상태 관리 분리 (TanStack Query vs Zustand)

- **서버 상태 = TanStack Query** — `@tanstack/react-query`. 현재는 `web/src/features/auth/hooks/use-auth-mutation.ts`의 `useMutation`(`useLoginMutation`/`useSignupMutation`)이 유일하게 사용되며 mock API를 호출. `onSuccess`에서 Zustand store 갱신 + `useNavigate`.
- **클라이언트 전역 상태 = Zustand** — `web/src/features/auth/store/auth.store.ts`(`useAuthStore`: `isAuthenticated`/`user`/`setUser`/`clearUser`), `web/src/stores/modal-store.ts`(`useModal`, `devtools` 미들웨어, 모달 스택), `web/src/sample/users/store/users-store.ts`.

분리 원칙: 서버에서 받은 데이터/뮤테이션은 React Query, 순수 클라이언트 UI/세션 상태(모달, 인증 플래그)는 Zustand.

### 2.4 폼 검증

`react-hook-form` + `@hookform/resolvers`(zodResolver) + `zod`. 스키마는 `web/src/features/auth/schema/auth.schema.ts`, 메시지는 한국어(예: `'유효한 이메일 주소를 입력해주세요'`).

### 2.5 UI 레이어

`web/src/components/ui/` — Radix UI / Base UI + `class-variance-authority`(cva) + `tailwind-merge` 기반 shadcn 스타일 프리미티브 31개(`button`, `dialog`, `form`, `table`, `command` 등). 모달 시스템은 `components/ui/modal/`(manager/container/backdrop/form/header/default). Tailwind CSS v4(`@tailwindcss/vite`).

### 2.6 sample 영역

`web/src/sample/`은 admin 대시보드 데모(dashboard/users/tasks/chats/apps/settings/help-center/errors/auth). 실제 도메인 기능(`features/`)과 분리된 참조 구현이며 자체 i18n(`sample/i18n`, ko/en)과 `*.test.ts`를 포함한다.
