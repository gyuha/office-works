---
last_mapped_commit: 5c5103df2b3695a9b8bd62b9c5701f2988b8e0ab
mapped: 2026-06-05
---

# 디렉토리 구조 (Office Works)

## 모노레포 루트

```
260605-teams-login/
├── api/                   FastAPI 백엔드 (Python 3.12, uv)
├── web/                   React SPA (Node.js, pnpm, Vite)
├── .git/
├── .github/
├── .forge/
│   └── codebase/
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md   (이 파일)
├── CLAUDE.md              루트 레벨 프로젝트 가이드
├── Taskfile.yml           Task 러너 (api 명령어)
├── docker-compose.yml     PostgreSQL, Redis, Mailpit
├── .gitignore
├── .env.example
└── README.md
```

## 백엔드 (`api/`)

```
api/
├── Taskfile.yml           Task 러너 — dev, serve, test, lint, migrate, revision
├── Justfile               Task 복제본 (선택적)
├── pyproject.toml         Python 프로젝트 설정 (Python 3.12+, uv, pytest 설정)
├── uv.lock                의존성 잠금 파일
├── .env.example           환경 변수 템플릿
├── src/                   애플리케이션 소스 (PYTHONPATH=src)
│   ├── __init__.py
│   ├── __main__.py        직접 실행 진입점 (python -m app)
│   ├── main.py            FastAPI 앱 팩토리
│   │                      - create_app(): 미들웨어, 라우터 등록
│   │                      - lifespan: 시작/종료 로직
│   │                      - _register_routers(): 동적 라우터 로딩
│   │
│   ├── core/              횡단 관심사 (config, DB, Redis, 예외, 미들웨어, 로깅)
│   │   ├── __init__.py
│   │   ├── config.py      Pydantic Settings
│   │   │                  - AppEnv, LLMProvider enums
│   │   │                  - LLMSettings (제공자별 설정)
│   │   │                  - Settings (전체 앱 설정)
│   │   │                  - get_settings()
│   │   │
│   │   ├── database.py    SQLAlchemy 2.0 async
│   │   │                  - Base (ORM declarative base)
│   │   │                  - engine, SessionLocal
│   │   │                  - get_async_session() (FastAPI Depends)
│   │   │
│   │   ├── redis.py       Redis 연결 풀
│   │   │                  - get_redis_client() (싱글톤)
│   │   │                  - get_redis_dep() (FastAPI Depends)
│   │   │
│   │   ├── middleware.py  CorrelationIdMiddleware
│   │   │                  - UUID 생성, X-Correlation-ID 헤더
│   │   │                  - structlog 컨텍스트 바인딩
│   │   │
│   │   ├── exceptions.py  AppError 계층 및 예외 핸들러
│   │   │                  - NotFoundError, ConflictError, UnauthorizedError, ForbiddenError
│   │   │                  - register_exception_handlers()
│   │   │
│   │   └── logging.py     structlog 설정 (JSON 구조적 로깅)
│   │
│   ├── domains/           도메인 경계 (비순환 의존성 — shared만 import 가능)
│   │   │
│   │   ├── shared/        공유 커널 (도메인 공용 기반)
│   │   │   ├── __init__.py
│   │   │   ├── base.py    Entity, AggregateRoot, ValueObject
│   │   │   ├── events.py  DomainEvent, DomainEventBus
│   │   │   └── types.py   UserId, ConversationId, MessageId, PermissionKey (NewType)
│   │   │
│   │   ├── auth/          인증 도메인
│   │   │   ├── __init__.py
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   └── auth_models.py    ORM 모델 (User, Role, Permission, RefreshToken, etc.)
│   │   │   │                         - User: email, hashed_password, is_verified, is_active
│   │   │   │                         - RefreshToken: jti, family_id, rotated_at, replaced_by_jti
│   │   │   │                         - EmailVerification, PasswordReset
│   │   │   │                         - OAuthAccount (Google, Kakao, Naver)
│   │   │   │                         - role_permissions, user_roles (M:N 테이블)
│   │   │   │
│   │   │   ├── repository/
│   │   │   │   ├── __init__.py
│   │   │   │   └── auth_repository.py  AuthRepository (DB I/O 계층)
│   │   │   │                           - get_user_by_id(), get_user_by_email()
│   │   │   │                           - create_user(), mark_user_verified()
│   │   │   │                           - refresh_token_* CRUD
│   │   │   │                           - transaction() context manager
│   │   │   │
│   │   │   ├── schemas/
│   │   │   │   ├── __init__.py
│   │   │   │   └── auth_schemas.py   Pydantic DTO (요청/응답)
│   │   │   │                         - SignupRequest, LoginRequest, TokenResponse
│   │   │   │                         - UserResponse, OAuthLoginURLResponse, etc.
│   │   │   │
│   │   │   ├── service/
│   │   │   │   ├── __init__.py
│   │   │   │   └── auth_service.py    AuthService (비즈니스 로직)
│   │   │   │                          - signup(), verify_email(), login()
│   │   │   │                          - refresh(), logout()
│   │   │   │                          - password_reset_request(), password_reset_confirm()
│   │   │   │                          - OAuth2 헬퍼
│   │   │   │
│   │   │   ├── router/
│   │   │   │   ├── __init__.py
│   │   │   │   └── auth_router.py      FastAPI APIRouter (HTTP 엔드포인트)
│   │   │   │                           - POST /signup, /verify-email, /login, /refresh, /logout
│   │   │   │                           - POST /password-reset, /password-reset/confirm
│   │   │   │                           - GET /me, /oauth/{provider}/login, /oauth/{provider}/callback
│   │   │   │                           - _get_service() DI 헬퍼
│   │   │   │
│   │   │   ├── security.py             JWT 및 비밀번호 관리
│   │   │   │                           - hash_password(), verify_password() (argon2)
│   │   │   │                           - create_access_token(), create_refresh_token() (JWT)
│   │   │   │                           - decode_token()
│   │   │   │                           - get_current_user() (Bearer 검증)
│   │   │   │                           - get_current_access_token_context()
│   │   │   │                           - require_permission()
│   │   │   │                           - blacklist_jti() (Redis)
│   │   │   │
│   │   │   ├── email.py                이메일 발송
│   │   │   │                           - AuthEmailSender
│   │   │   │                           - send_verification_email()
│   │   │   │                           - send_password_reset_email()
│   │   │   │
│   │   │   └── oauth/                  OAuth2 제공자 어댑터
│   │   │       ├── __init__.py
│   │   │       ├── google.py           Google OAuth2
│   │   │       ├── kakao.py            Kakao OAuth2
│   │   │       └── naver.py            Naver OAuth2
│   │   │
│   │   └── chat/          LLM 채팅 도메인 (hexagonal architecture)
│   │       ├── __init__.py
│   │       ├── models/
│   │       │   ├── __init__.py
│   │       │   └── chat_models.py      ORM 모델 (Conversation, Message)
│   │       │
│   │       ├── repository/
│   │       │   ├── __init__.py
│   │       │   └── chat_repository.py  ChatRepository (DB I/O)
│   │       │                           - create_conversation(), get_conversation()
│   │       │                           - create_message(), get_messages_for_conversation()
│   │       │
│   │       ├── schemas/
│   │       │   ├── __init__.py
│   │       │   └── chat_schemas.py     Pydantic DTO
│   │       │                           - ChatRequest, MessageResponse, ConversationResponse
│   │       │
│   │       ├── service/
│   │       │   ├── __init__.py
│   │       │   └── chat_service.py     ChatService (비즈니스 로직)
│   │       │                           - complete(): 비스트리밍 응답
│   │       │                           - stream(): 스트리밍 async generator
│   │       │                           - TYPE_CHECKING 블록 — infra 클래스 격리
│   │       │
│   │       ├── router/
│   │       │   ├── __init__.py
│   │       │   └── chat_router.py      FastAPI APIRouter
│   │       │                           - POST /complete, /stream
│   │       │                           - GET /provider (현재 LLM 제공자)
│   │       │
│   │       ├── ports.py                Hexagonal architecture 포트 정의
│   │       │                           - LLMClientProtocol (runtime_checkable)
│   │       │                           - LLMClientFactoryProtocol
│   │       │                           - AbstractLLMPort (ABC)
│   │       │
│   │       ├── container.py            DI 컨테이너 (infra와 domain 브릿지)
│   │       │                           - get_llm_factory()
│   │       │                           - get_chat_service()
│   │       │
│   │       ├── llm_client.py           LLMClient 어댑터 (AbstractLLMPort 구현)
│   │       │                           - ChatLiteLLM을 래핑
│   │       │                           - ainvoke(), astream()
│   │       │                           - DefaultLLMClientFactory
│   │       │
│   │       └── llm_factory.py          LLMClient 팩토리 헬퍼
│   │                                   - factory 인스턴스 생성
│   │
│   └── infra/             인프라 어댑터 (외부 라이브러리 & 서비스 통합)
│       ├── __init__.py
│       └── llm/           LangChain-LiteLLM 어댑터
│           ├── __init__.py
│           └── provider_factory.py     LLM 제공자별 ChatLiteLLM 인스턴스 생성
│                                       - make_chat_litellm()
│                                       - OpenAI, Anthropic, Gemini, Azure, Ollama 라우팅
│
├── tests/                 pytest (unit + integration)
│   ├── conftest.py        pytest 픽스처 (AsyncClient, 임시 DB 등)
│   ├── test_*.py          테스트 파일 (마커: unit, integration, e2e)
│   └── ...
│
├── alembic/               Alembic 마이그레이션 (동기 psycopg2)
│   ├── versions/
│   │   └── 0001_initial_schema.py      첫 번째 마이그레이션 (유일)
│   ├── env.py             마이그레이션 환경 설정
│   ├── script.py.mako
│   └── alembic.ini        Alembic 구성
│
└── .ruff.toml             Ruff 린터 설정 (E501 = 88 문자, 엄격 모드)
```

### 주요 파일 경로

| 용도 | 경로 |
|------|------|
| 앱 팩토리 | `api/src/main.py` |
| 전역 설정 | `api/src/core/config.py` |
| DB 설정 | `api/src/core/database.py` |
| 예외 처리 | `api/src/core/exceptions.py` |
| 인증 라우터 | `api/src/domains/auth/router/auth_router.py` |
| 인증 서비스 | `api/src/domains/auth/service/auth_service.py` |
| 인증 보안 | `api/src/domains/auth/security.py` |
| 채팅 라우터 | `api/src/domains/chat/router/chat_router.py` |
| 채팅 서비스 | `api/src/domains/chat/service/chat_service.py` |
| LLM 포트 | `api/src/domains/chat/ports.py` |
| 채팅 DI | `api/src/domains/chat/container.py` |
| LLM 어댑터 | `api/src/infra/llm/provider_factory.py` |
| Task 러너 | `api/Taskfile.yml` |

### 명령어 (Task)

```bash
cd api/

task dev                # 인프라 기동 + 마이그레이션 + FastAPI 핫리로드 (8000)
task serve              # 앱만 재시작 (인프라 스킵)
task infra              # Docker 컨테이너 기동
task infra-down         # Docker 컨테이너 중지

task test               # pytest (전체, 커버리지 70% 강제)
task test-unit          # pytest -m unit
task test-integration   # pytest -m integration

task lint               # ruff check + mypy
task format             # ruff format + ruff check --fix
task typecheck          # mypy --strict

task migrate            # alembic upgrade head
task revision           # autogenerate 리비전 생성
```

## 프론트엔드 (`web/`)

```
web/
├── package.json           pnpm 의존성 (React 19, Vite, TanStack)
├── pnpm-lock.yaml
├── tsconfig.json          TypeScript 설정 (strict mode)
├── tsconfig.app.json      앱 TypeScript 설정
├── vite.config.ts         Vite 설정 (TanStack Router, Tailwind)
├── biome.json             Biome 포맷 (2 spaces, 100자 줄)
├── .env.example
├── index.html             HTML 진입점
│
├── src/
│   ├── main.tsx           React 앱 마운트 (createRoot)
│   ├── vite-env.d.ts      Vite 타입 정의
│   ├── routeTree.gen.ts   TanStack Router 생성 파일 (자동)
│   │
│   ├── routes/            TanStack Router (파일 기반 라우팅)
│   │   ├── __root.tsx      루트 레이아웃 (RootComponent)
│   │   │                  - AppProviders 감싸기
│   │   │                  - Outlet, Modal, Toaster 렌더링
│   │   │                  - RouterDevtools (dev)
│   │   │
│   │   ├── index.tsx       홈 페이지 (/)
│   │   │                  - 인증 상태 표시
│   │   │                  - 로그인/회원가입 링크
│   │   │
│   │   ├── auth/
│   │   │   ├── login.tsx   로그인 페이지 (/auth/login)
│   │   │   └── signup.tsx  회원가입 페이지 (/auth/signup)
│   │   │
│   │   ├── sample.tsx      샘플 페이지 래퍼 (SampleLayout)
│   │   ├── sample/
│   │   │   ├── index.tsx   샘플 홈
│   │   │   ├── dashboard.tsx, chats.tsx, users.tsx, tasks.tsx, etc.
│   │   │   └── settings/
│   │   │       ├── index.tsx
│   │   │       ├── account.tsx, profile.tsx, appearance.tsx, etc.
│   │   │
│   │   └── test/
│   │       └── modal.tsx   모달 테스트 페이지
│   │
│   ├── features/           Feature 슬라이스 (도메인별)
│   │   └── auth/           인증 feature
│   │       ├── components/
│   │       │   ├── login-form.tsx    LoginForm (Zod 검증, React Hook Form)
│   │       │   └── signup-form.tsx   SignupForm
│   │       │
│   │       ├── hooks/
│   │       │   ├── use-auth-mutation.ts    useAuthMutation (TanStack Query)
│   │       │   └── ...
│   │       │
│   │       ├── store/
│   │       │   └── auth.store.ts     Zustand store (useAuthStore)
│   │       │                         - isAuthenticated, user
│   │       │                         - setUser(), clearUser()
│   │       │
│   │       ├── lib/
│   │       │   └── mock-auth-api.ts  Mock API (현재 backend 미연동)
│   │       │
│   │       ├── types/
│   │       │   └── auth.ts           TypeScript 타입 (AuthUser, LoginRequest, etc.)
│   │       │
│   │       └── schema/
│   │           └── auth.schema.ts    Zod 스키마 (이메일, 비밀번호 검증)
│   │
│   ├── components/         공유 컴포넌트
│   │   ├── dev/            개발 전용
│   │   ├── layout/
│   │   │   └── sidebar.tsx, header.tsx (샘플 레이아웃)
│   │   │
│   │   ├── ui/             UI 프리미티브 (Radix + shadcn 스타일)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal/
│   │   │   │   ├── modal-manager.tsx (포탈 관리)
│   │   │   │   └── modal-context.tsx (Context)
│   │   │   ├── sonner.tsx  (토스트 UI)
│   │   │   └── ...
│   │   │
│   │   └── theme-toggle.tsx 라이트/다크 모드 토글
│   │
│   ├── hooks/              공유 커스텀 훅
│   │   └── use-theme.ts    테마 관리
│   │
│   ├── lib/                유틸리티
│   │   ├── api-client.ts   axios / fetch 헬퍼
│   │   └── ...
│   │
│   ├── providers/          React Provider 래핑
│   │   └── app-providers.tsx   QueryClientProvider (TanStack Query)
│   │                           - 향후: 인증, 테마 등 추가
│   │
│   ├── stores/             Zustand 전역 상태
│   │   └── app.store.ts    애플리케이션 전역 상태 (필요 시)
│   │
│   ├── styles/             CSS
│   │   ├── globals.css     Tailwind + 글로벌 스타일
│   │   └── ...
│   │
│   └── sample/             샘플 앱 데이터 & 컴포넌트 (본격 개발 전 레퍼런스)
│       ├── apps/
│       ├── auth/
│       ├── chats/
│       ├── dashboard/
│       ├── errors/
│       ├── help-center/
│       ├── i18n/           국제화 (en, ko)
│       ├── layout/
│       ├── settings/
│       ├── tasks/
│       ├── users/
│       └── ...
│
├── .vscode/               VSCode 설정 (선택적)
└── public/                정적 자산
```

### 주요 파일 경로

| 용도 | 경로 |
|------|------|
| Vite 설정 | `web/vite.config.ts` |
| TypeScript 설정 | `web/tsconfig.json` |
| 루트 레이아웃 | `web/src/routes/__root.tsx` |
| 홈 페이지 | `web/src/routes/index.tsx` |
| 로그인 페이지 | `web/src/routes/auth/login.tsx` |
| 회원가입 페이지 | `web/src/routes/auth/signup.tsx` |
| 인증 store | `web/src/features/auth/store/auth.store.ts` |
| 인증 mutation hook | `web/src/features/auth/hooks/use-auth-mutation.ts` |
| 로그인 폼 | `web/src/features/auth/components/login-form.tsx` |
| App 프로바이더 | `web/src/providers/app-providers.tsx` |
| Tailwind 설정 | `web/tailwind.config.js` |

### 명령어 (pnpm)

```bash
cd web/

pnpm dev           # 개발 서버 (3000)
pnpm build         # tsc -b + vite build (dist/)
pnpm preview       # 빌드 미리보기
pnpm typecheck     # tsc --noEmit
pnpm lint          # Biome 검사
pnpm lint:fix      # Biome 자동 수정
```

## 명명 규칙

### 백엔드 (Python)

- **파일명**: `snake_case` (예: `auth_repository.py`, `email.py`)
- **클래스명**: `PascalCase` (예: `AuthService`, `User`, `NotFoundError`)
- **함수명**: `snake_case` (예: `get_user_by_email()`, `create_access_token()`)
- **상수**: `UPPER_SNAKE_CASE` (예: `ACCESS_TOKEN_EXPIRE_MINUTES`, `EMAIL_VERIFY_EXPIRE_HOURS`)

### 프론트엔드 (TypeScript/React)

- **파일명**: `kebab-case` (예: `login-form.tsx`, `use-auth-mutation.ts`, `auth.store.ts`)
- **컴포넌트**: `PascalCase` (예: `LoginForm`, `SignupForm`, `Button`)
- **훅명**: `use` prefix (예: `useAuthStore`, `useAuthMutation`, `useTheme`)
- **상수**: `UPPER_SNAKE_CASE` 또는 `camelCase` (일관성 유지)

## 계층별 책임

### 라우터 (Router)

- HTTP 요청 파싱 (요청 DTO → Pydantic)
- 응답 직렬화 (응답 DTO → JSON)
- 인증 검증 (Bearer 토큰, 권한)
- 예외를 HTTP 응답으로 변환 (AppError → JSONResponse)

### 서비스 (Service)

- 비즈니스 로직 (조건부 처리, 유효성 검증)
- 리포지토리 호출 조율
- 외부 서비스 호출 (이메일, OAuth, LLM)
- AppError 예외 발생

### 리포지토리 (Repository)

- SQL 쿼리 (SELECT, INSERT, UPDATE, DELETE)
- 트랜잭션 관리
- 데이터 모델 캐싱 (selectinload, joinedload)

### 모델 (Model)

- SQLAlchemy ORM 클래스
- 테이블 스키마 정의
- 관계 정의 (FK, M:N)

## 에러 처리 패턴

### 백엔드

```python
# 라우터에서
try:
    tokens = await svc.login(email, password)
except AppError:
    raise  # register_exception_handlers가 처리

# 서비스에서
raise NotFoundError("User")          # 404
raise ConflictError("Email exists")  # 409
raise UnauthorizedError("Invalid")   # 401
raise ForbiddenError("No permission")# 403
```

### 프론트엔드

```typescript
// useMutation에서
const mutation = useMutation({
  mutationFn: (data) => api.login(data),
  onError: (error) => {
    // API 에러 처리
    console.error(error.response?.data?.detail);
  },
  onSuccess: (data) => {
    // 성공 처리
    useAuthStore.setState({ user: data.user });
  },
});
```

## 환경 설정

### 백엔드 (`.env`)

```
APP_ENV=development
APP_DEBUG=true
HOST=0.0.0.0
PORT=8000
WORKERS=1
LOG_LEVEL=INFO
LOG_FORMAT=json

DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/office_works
DATABASE_URL_SYNC=postgresql+psycopg2://user:pass@localhost:5432/office_works

REDIS_URL=redis://localhost:6379/0

JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

LLM_PROVIDER=openai
LLM_DEFAULT_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...

MAIL_SERVER=localhost
MAIL_PORT=1025
MAIL_FROM=noreply@office-works.com
```

### 프론트엔드 (`.env`)

```
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=Office Works
```

## Docker Compose (인프라)

```
docker-compose.yml
├── postgres:16      (5432)
├── redis:7          (6379)
└── mailpit:latest   (SMTP 1025, UI 8025)
```

개발: `task infra` 또는 `docker-compose up`

