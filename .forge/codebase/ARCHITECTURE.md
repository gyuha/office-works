---
last_mapped_commit: 5c5103df2b3695a9b8bd62b9c5701f2988b8e0ab
mapped: 2026-06-05
---

# 아키텍처 (Office Works)

모노레포 구조: FastAPI 백엔드(`api/`) + React 19 SPA(`web/`). 도메인 주도 설계(DDD) + 포트-어댑터 아키텍처.

## 전체 요청 흐름

### 백엔드 — FastAPI 비동기 처리

```
HTTP 요청
    ↓
CorrelationIdMiddleware (UUID 생성, structlog 바인딩)
    ↓
CORSMiddleware
    ↓
라우터 (FastAPI APIRouter @ /api/v1)
    ├─ /api/v1/auth/* (회원가입, 로그인, OAuth2, 토큰 회전)
    └─ /api/v1/chat/* (LLM 채팅 + SSE 스트리밍)
    ↓
서비스 (비즈니스 로직, async def)
    ├─ AuthService
    │  ├─ AuthRepository (DB 쿼리)
    │  ├─ Redis (토큰 블랙리스트, 세션)
    │  └─ AuthEmailSender (이메일 전송)
    └─ ChatService
       ├─ ChatRepository (대화 저장)
       └─ AbstractLLMPort (LLM 호출)
    ↓
리포지토리 (SQLAlchemy 2.0 async, AsyncSession)
    ↓
PostgreSQL 데이터베이스
    ↓
AppError 예외 발생 시
    ├─ NotFoundError (404)
    ├─ ConflictError (409)
    ├─ UnauthorizedError (401)
    └─ ForbiddenError (403)
    ↓
register_exception_handlers (전역 예외 처리)
    ↓
{"detail": "error message"} + X-Correlation-ID 헤더
```

### 프론트엔드 — React 19 + TanStack Router

```
사용자 입력
    ↓
TanStack Router 파일 기반 라우팅 (src/routes/)
    ├─ / (홈 — 인증 상태 표시)
    ├─ /auth/login (로그인)
    ├─ /auth/signup (회원가입)
    └─ /sample/* (샘플 페이지)
    ↓
Feature 슬라이스 (src/features/{domain}/)
    ├─ components/ (Form, 버튼 등)
    ├─ hooks/ (use-auth-mutation)
    ├─ store/ (Zustand)
    └─ lib/ (mock-auth-api)
    ↓
TanStack Query (서버 상태)
    ├─ useAuthMutation
    └─ [향후] useChatQuery
    ↓
Zustand Store (클라이언트 전역 상태)
    └─ useAuthStore (user, isAuthenticated)
    ↓
HTTP 요청 (fetch / axios)
    ↓
백엔드 API (/api/v1)
```

## 백엔드 레이어별 구조

### `api/src/main.py` — 앱 팩토리

- `lifespan()`: 시작/종료 시 Redis 연결 warmup, 구조적 로깅 설정
- `create_app()`: FastAPI 앱 초기화, 미들웨어 등록, 라우터 포함
- `_register_routers()`: `/health`, `/ready` + `/api/v1/auth`, `/api/v1/chat` 라우터 동적 로딩
- 예외 핸들러 등록 → `register_exception_handlers(app)`

### `core/` — 횡단 관심사

**`config.py`** (Pydantic Settings)
- `AppEnv` enum: development, staging, production
- `LLMProvider` enum: openai, anthropic, gemini, azure, ollama
- `LLMSettings`: LLM 제공자별 설정 (API 키, 모델, 베이스 URL 등)
- `Settings`: 전체 애플리케이션 설정 (DB, Redis, JWT, OAuth, 이메일, 로깅 포맷)
- `get_settings()`: 싱글톤 설정 반환 (캐시됨)

**`database.py`** (SQLAlchemy 2.0 async)
- `Base`: 모든 ORM 모델의 declarative base
- `engine`: `create_async_engine()` with `asyncpg` 드라이버
- `SessionLocal`: `async_sessionmaker(AsyncSession)`
- `get_async_session()`: FastAPI Depends 의존성 — 요청별 AsyncSession 제공

**`redis.py`** (Redis 연결 풀)
- `get_redis_client()`: 싱글톤 Redis 클라이언트 (접속 풀)
- `close_redis_client()`: 종료 시 정리
- `get_redis_dep()`: FastAPI Depends 의존성

**`middleware.py`**
- `CorrelationIdMiddleware`: 요청마다 UUID 생성, structlog 컨텍스트 바인딩
- 헤더: `X-Correlation-ID` 주입

**`exceptions.py`** (AppError 계층)
- `AppError`: 기본 예외 (status_code, message)
- `NotFoundError(404)`, `ConflictError(409)`, `UnauthorizedError(401)`, `ForbiddenError(403)`
- `register_exception_handlers()`: FastAPI에 전역 핸들러 등록
- 응답: `{"detail": "..."}` JSON + `X-Correlation-ID` 헤더

**`logging.py`** (structlog)
- `configure_logging()`: JSON 구조적 로깅 초기화
- 모든 로그는 correlation_id 바인딩

### `domains/` — 도메인 경계

#### `domains/shared/` — 공유 커널
- `base.py`: `Entity`, `AggregateRoot`, `ValueObject` 추상 클래스
- `events.py`: `DomainEvent`, `DomainEventBus`
- `types.py`: `UserId`, `ConversationId`, `MessageId`, `PermissionKey` (NewType)
- **중요**: `auth`, `chat`은 `shared`를 import 가능, 반대는 금지 (비순환 의존성)

#### `domains/auth/` — 인증 도메인

**모델** (`models/auth_models.py`)
- `User`: 사용자 계정 (email, hashed_password, display_name, is_verified, is_active, roles)
- `RefreshToken`: 갱신 토큰 (JTI, family_id, rotated_at, replaced_by_jti — 토큰 로테이션/재사용 감지)
- `EmailVerification`: 이메일 검증 대기 (token, expires_at)
- `PasswordReset`: 비밀번호 재설정 대기
- `OAuthAccount`: OAuth2 연동 계정 (Google, Kakao, Naver — provider + provider_user_id)
- `Role`, `Permission`: RBAC 스키마 (미구현 — 계획 단계)

**리포지토리** (`repository/auth_repository.py`)
- 모든 메서드 `async def`
- `get_user_by_id()`, `get_user_by_email()`, `create_user()`, `mark_user_verified()`
- `refresh_token_*()`: 갱신 토큰 CRUD
- 트랜잭션 관리: `async with repo.transaction():`

**서비스** (`service/auth_service.py`)
- `signup()`: 이메일 + 비밀번호 → 사용자 생성, 검증 이메일 전송
- `verify_email()`: 토큰 검증 → 사용자 활성화
- `login()`: 이메일 + 비밀번호 → AccessToken + RefreshToken
- `refresh()`: RefreshToken → 새 AccessToken + 회전된 RefreshToken (토큰 로테이션)
- `logout()`: RefreshToken 블랙리스트 (Redis) + AccessToken JTI 블랙리스트
- `password_reset_request()`, `password_reset_confirm()`: 비밀번호 재설정
- OAuth2: `get_oauth_login_url()`, `handle_oauth_callback()` (Google, Kakao, Naver)

**라우터** (`router/auth_router.py`, 접두사 `/auth`)
- `POST /signup`: `SignupRequest` → 검증, 서비스 호출
- `POST /verify-email/{token}`: 이메일 검증
- `POST /login`: `LoginRequest` → `TokenResponse` (access_token, refresh_token, expires_in)
- `POST /refresh`: `RefreshRequest` → 새 토큰 쌍
- `POST /logout`: 토큰 폐기
- `GET /me`: 현재 사용자 정보 (Bearer 토큰 필수)
- `GET /auth/oauth/{provider}/login`: OAuth2 인증 URL 반환
- `GET /auth/oauth/{provider}/callback`: OAuth2 콜백 (code 교환)

**보안** (`security.py`)
- `hash_password()`, `verify_password()`: argon2
- `create_access_token()`, `create_refresh_token()`: JWT (HS256)
- `decode_token()`: JWT 검증
- `get_current_user()`: Bearer 토큰으로부터 User 추출 (FastAPI Depends)
- `get_current_access_token_context()`: AccessToken JWT 페이로드 추출
- `require_permission()`: 권한 검증
- `blacklist_jti()`: Redis에 JTI 추가

**이메일** (`email.py`)
- `AuthEmailSender`: 이메일 발송 (SMTP via Mailpit in dev)
- `send_verification_email()`, `send_password_reset_email()`

#### `domains/chat/` — LLM 채팅 도메인

**모델** (`models/chat_models.py`)
- `Conversation`: 대화 (user_id, created_at, updated_at)
- `Message`: 메시지 (conversation_id, role, content, created_at)

**포트** (`ports.py` — hexagonal architecture)
- `LLMClientProtocol`: 런타임 체크 가능 Protocol (`ainvoke`, `astream`)
- `LLMClientFactoryProtocol`: 팩토리 Protocol (`get_llm_client()`)
- `AbstractLLMPort`: ABC — `invoke()`, `stream()`
- **설계 목표**: 도메인이 infra 구체 클래스를 import하지 않음 (interface만 사용)

**서비스** (`service/chat_service.py`)
- `complete()`: 비스트리밍 응답 (LLM 완전 응답 대기)
- `stream()`: 스트리밍 응답 (async generator — SSE에 사용)
- LangChain `BaseMessage` 입출력
- **격리**: `AbstractLLMPort`에만 의존, infra 클래스는 TYPE_CHECKING 블록에서만 import

**리포지토리** (`repository/chat_repository.py`)
- `create_conversation()`, `get_conversation()`
- `create_message()`, `get_messages_for_conversation()`

**라우터** (`router/chat_router.py`, 접두사 `/chat`)
- `POST /complete`: 비스트리밍 완성
- `POST /stream`: SSE 스트리밍 응답
- `GET /provider`: 현재 활성 LLM 제공자 정보

**컨테이너** (`container.py` — DI)
- `get_llm_factory()`: LLMClientFactoryProtocol 반환
- `get_chat_service()`: ChatService 반환 (팩토리 + repo + session 조립)

### `infra/` — 인프라 어댑터

**`llm/provider_factory.py`** (LangChain-LiteLLM 어댑터)
- `make_chat_litellm()`: LLMSettings로부터 `ChatLiteLLM` 인스턴스 생성
- 제공자별 라우팅 (OpenAI, Anthropic, Gemini, Azure, Ollama)
- API 키, 베이스 URL, 모델명 설정

**`llm/llm_client.py`** (LLMClient 어댑터)
- `LLMClient`: `ChatLiteLLM`을 래핑, `AbstractLLMPort` 구현
- `ainvoke()`: 비스트리밍 호출
- `astream()`: 스트리밍 호출 (async generator)
- `DefaultLLMClientFactory`: LLMClientFactoryProtocol 구현

## 데이터 모델 & 흐름

### 인증 흐름

1. **회원가입** (signup)
   - POST `/auth/signup` → `SignupRequest` (email, password, display_name)
   - `AuthService.signup()` → `AuthRepository.create_user()` → User 생성
   - 이메일 검증 토큰 생성 → Redis 임시 저장
   - 검증 이메일 발송 → `AuthEmailSender.send_verification_email()`

2. **이메일 검증** (verify-email)
   - GET `/auth/verify-email/{token}`
   - 토큰 유효성 검증 (Redis에서 조회)
   - User.is_verified = True

3. **로그인** (login)
   - POST `/auth/login` → `LoginRequest` (email, password)
   - `AuthService.login()` → 비밀번호 검증
   - AccessToken + RefreshToken 발급
   - RefreshToken을 DB에 저장 (family_id로 기족 추적, 로테이션 감지)

4. **토큰 회전** (refresh)
   - POST `/auth/refresh` → RefreshToken
   - 기존 토큰 유효성 검사 (재사용 감지)
   - 새 AccessToken + 새 RefreshToken 발급
   - 기존 토큰 replaced_by_jti로 마크

5. **로그아웃** (logout)
   - POST `/auth/logout` → AccessToken JTI + RefreshToken
   - JTI를 Redis 블랙리스트에 추가 (유효 기간 동안)

### 채팅 흐름

1. **비스트리밍 완성** (complete)
   - POST `/chat/complete` → `ChatRequest` (messages: [{role, content}, ...])
   - `ChatService.complete()` → LLM 호출
   - LLM 응답 완전히 대기 → JSON 반환

2. **스트리밍 완성** (stream)
   - POST `/chat/stream` → `ChatRequest`
   - `ChatService.stream()` → async generator
   - SSE (Server-Sent Events) 응답
   - 각 청크 = 한 줄 이벤트, 마지막은 `[DONE]` 마커

## 데이터베이스 스키마

PostgreSQL 16, 모든 ID는 UUID (as_uuid=True).

### 주요 테이블

- `users`: email (unique), hashed_password, display_name, is_verified, is_active, created_at, updated_at
- `roles`: key (unique), description
- `permissions`: key (unique), description
- `role_permissions`: role_id ↔ permission_id (M:N)
- `user_roles`: user_id ↔ role_id (M:N)
- `refresh_tokens`: user_id, jti (unique), family_id, rotated_at, replaced_by_jti, expires_at
- `email_verifications`: user_id, token (unique), expires_at
- `password_resets`: user_id, token (unique), expires_at
- `oauth_accounts`: user_id, provider, provider_user_id, created_at
- `conversations`: user_id, created_at, updated_at
- `messages`: conversation_id, role (system/user/assistant), content, created_at

마이그레이션: Alembic 1개 리비전 (`0001_initial_schema`) — 신규 리비전은 `task revision` autogenerate

## 의존성 주입 (DI) 패턴

### FastAPI Depends 헬퍼

```python
# 라우터에서
async def _get_service(
    session: AsyncSession = Depends(get_async_session),
    redis: Redis = Depends(get_redis_dep),
) -> AuthService:
    repo = AuthRepository(session)
    return AuthService(repo, redis, ...)

@router.post("/login")
async def login(
    req: LoginRequest,
    svc: AuthService = Depends(_get_service),
) -> TokenResponse:
    tokens = await svc.login(req.email, req.password)
    ...
```

### 채팅 DI

```python
# container.py
async def get_chat_service(
    factory: LLMClientFactoryProtocol = Depends(get_llm_factory),
    session: AsyncSession = Depends(get_async_session),
) -> ChatService:
    repo = ChatRepository(session)
    client = factory.get_llm_client()
    return ChatService(llm_client=client, repo=repo)

# 라우터에서
@router.post("/chat/complete")
async def chat_complete(
    req: ChatRequest,
    svc: ChatService = Depends(get_chat_service),
) -> dict:
    response = await svc.complete(req.to_langchain_messages())
    ...
```

## 미들웨어 & 예외 처리 체인

```
요청 → CorrelationIdMiddleware (UUID + structlog 바인딩)
    ↓
    CORSMiddleware
    ↓
    라우터 (FastAPI)
    ↓
    [정상] → JSON 응답 + X-Correlation-ID 헤더
    ↓ [AppError 발생]
    register_exception_handlers()
        ├─ NotFoundError → 404 + detail
        ├─ ConflictError → 409 + detail
        ├─ UnauthorizedError → 401 + detail + WWW-Authenticate 헤더
        ├─ ForbiddenError → 403 + detail
        └─ 기타 → 500 + safe message
    ↓
    {"detail": "..."} + X-Correlation-ID
```

## 프론트엔드 아키텍처

### 라우팅 (TanStack Router)

파일 기반 라우팅, 생성된 라우트 트리: `src/routeTree.gen.ts` (자동 생성).

- `__root.tsx`: 루트 레이아웃, AppProviders 감싸기
- `index.tsx`: 홈 페이지 (인증 상태 표시)
- `auth/login.tsx`, `auth/signup.tsx`: 인증 페이지
- `sample/*`: 샘플 페이지 (대시보드, 채팅, 사용자 등)

### Feature 슬라이스 (도메인별)

`src/features/auth/`
- `components/`: LoginForm, SignupForm (Zod 폼 검증)
- `hooks/`: useAuthMutation (TanStack Query)
- `store/`: useAuthStore (Zustand) — isAuthenticated, user
- `lib/`: mock-auth-api.ts (현재 mock 상태)
- `types/`: AuthUser, LoginRequest, TokenResponse
- `schema/`: Zod 스키마 (이메일, 비밀번호 검증)

### 상태 관리

- **서버 상태**: TanStack Query (useQuery, useMutation)
- **클라이언트 전역 상태**: Zustand store (useAuthStore)

### UI 컴포넌트

`src/components/ui/`
- Radix UI + shadcn 스타일 프리미티브
- `button.tsx`, `input.tsx`, `modal/`, etc.
- CVA (class-variance-authority)로 변형 관리
- Tailwind CSS (Vite 플러그인)

### 프로바이더 (AppProviders)

`src/providers/app-providers.tsx`
- QueryClientProvider (TanStack Query)
- 향후: 인증 provider, 테마 provider 등

## 비동기 모델

### 백엔드 (FastAPI)

- 핸들러/서비스/리포지토리 모두 `async def`
- AsyncSession + asyncpg (비동기 DB 드라이버)
- Redis: redis-py의 async 클라이언트
- 라이프사이클: `@asynccontextmanager` — startup/shutdown 로직

### 프론트엔드 (React)

- TanStack Query: `useQuery`, `useMutation` (React hooks)
- async/await는 백엔드 API 호출에서만 (fetch, axios)

## 제공자 전환 (Provider Switching)

LLM 제공자는 `LLM_PROVIDER` 환경 변수로만 결정:

```bash
# OpenAI
LLM_PROVIDER=openai
LLM_DEFAULT_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...

# Anthropic
LLM_PROVIDER=anthropic
LLM_DEFAULT_MODEL=claude-3-5-sonnet
ANTHROPIC_API_KEY=sk-ant-...

# 로컬 Ollama
LLM_PROVIDER=ollama
LLM_DEFAULT_MODEL=llama2
OLLAMA_BASE_URL=http://localhost:11434
```

코드 변경 없음 — `core/config.py`의 `LLMSettings`에서 해석, `infra/llm/provider_factory.py`에서 라우팅.

## 배포 단위

- **backend**: Docker 이미지 (api/, Python 3.12, uv)
- **frontend**: Docker 이미지 (web/, Node.js, Vite)
- **인프라**: Docker Compose (PostgreSQL, Redis, Mailpit)

개발: `task dev` (모든 것을 호스트에서 실행)

