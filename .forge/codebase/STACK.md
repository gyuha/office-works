---
last_mapped_commit: 5c5103df2b3695a9b8bd62b9c5701f2988b8e0ab
mapped: 2026-06-05
---

# 기술 스택 (Tech Stack)

## 개요

모노레포 아키텍처: **FastAPI 백엔드** (`api/`) + **React 19 SPA** (`web/`)

---

## 백엔드 (`api/`)

### 언어 & 런타임

- **Python**: 3.12 (최소 요구사항; 3.14는 langchain `pydantic.v1` 비호환)
- **패키지 관리자**: uv (astral-sh/uv, 버전 0.6.13)
- **빌드 시스템**: hatchling (PEP 517 빌드백엔드)
- **테스트 러너**: pytest >= 8.3.0 (asyncio_mode=auto)

### 웹 프레임워크

- **FastAPI**: >= 0.115.0
  - 라우터: `/api/v1` prefix + health 엔드포인트 (루트)
  - 미들웨어: CorrelationIdMiddleware (로그 추적) + CORS
  - 예외 핸들러: AppError 계층 → HTTP 응답 (DOMAIN_NNN 코드 없음; 단순 `{"detail": ...}` + `X-Correlation-ID`)
- **Uvicorn**: >= 0.30.0 (ASGI 서버)
- **python-multipart**: >= 0.0.12 (폼 데이터/파일 업로드)

### 데이터베이스

- **PostgreSQL**: 17 (Docker 인프라)
- **SQLAlchemy**: >= 2.0.36 (비동기 전용)
  - 드라이버: **asyncpg** >= 0.30.0 (런타임 비동기)
  - 드라이버: **psycopg2-binary** >= 2.9.9 (Alembic 마이그레이션용 동기)
- **Alembic**: >= 1.14.0 (마이그레이션)
  - 마이그레이션 버전: 1개 (`0001_initial_schema`)
  - RBAC 스키마는 계획 단계(미구현)

### 캐시 & 메시지 큐

- **Redis**: 7 (Docker 인프라)
- **redis-py**: >= 5.2.0 (hiredis 최적화)
  - JWT 블랙리스트 (jti + TTL)
  - 리프레시 토큰 재사용 탐지
  - OAuth 상태 nonce (단기 TTL)
  - 레이트 제한 (slowapi)
  - 일반 캐시 + SSE fan-out pub/sub

### 인증 & 보안

- **JWT**: python-jose >= 3.3.0 (HS256/RS256)
  - 알고리즘: HS256 (기본)
  - Access token TTL: 15분 (환경변수 설정 가능)
  - Refresh token TTL: 7일 (재사용 탐지 활성화)
- **비밀번호**: passlib >= 1.7.4 + argon2-cffi >= 23.1.0
- **이메일 인증**: 구현됨
- **OAuth2**:
  - Google (GOOGLE_CLIENT_ID/SECRET, 콜백: `/api/v1/auth/oauth/google/callback`)
  - Kakao (KAKAO_CLIENT_ID/SECRET, 콜백: `/api/v1/auth/oauth/kakao/callback`)
  - Naver (NAVER_CLIENT_ID/SECRET, 콜백: `/api/v1/auth/oauth/naver/callback`)

### 메일

- **fastapi-mail**: >= 1.4.2
  - 로컬 개발: Mailpit (SMTP @ localhost:1025, UI @ localhost:8025)
  - 프로덕션: 환경변수 주입 (MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_STARTTLS, MAIL_SSL_TLS)

### 레이트 제한

- **slowapi**: >= 0.1.9 (Redis 기반)
  - 키 함수: authenticated user ID 또는 remote IP

### LLM & 채팅

- **langchain**: >= 0.3.0
- **langchain-core**: >= 0.3.0 (Runnable, BaseMessage 등)
- **langchain-community**: >= 0.3.0
- **langchain-litellm**: >= 0.2.0 (다중 provider 어댑터)
- **litellm**: >= 1.50.0 (provider 라우팅)
  - 지원 provider: openai, anthropic, gemini, azure, ollama
  - 모델 문자열 형식: `<provider>/<model>` (예: `openai/gpt-4o-mini`)
- **tenacity**: >= 8.5.0 (재시도 로직)
- **sse-starlette**: >= 2.1.0 (Server-Sent Events 스트리밍)

### HTTP 클라이언트

- **httpx**: >= 0.27.0 (OAuth 플로우)

### 로깅 & 관찰성

- **structlog**: >= 24.4.0
  - 포맷: JSON (프로덕션) 또는 console (개발)
  - 바인딩: correlation_id
  - 레벨: DEBUG, INFO, WARNING, ERROR, CRITICAL

### 검증 & 설정

- **Pydantic**: >= 2.9.0 (DTO, 요청/응답 스키마)
- **pydantic-settings**: >= 2.5.0 (환경변수 로드)
- **email-validator**: >= 2.2.0 (EmailStr 지원)

### 코드 품질

- **Ruff**: >= 0.8.0 (린터 + 포매터)
  - 대상 버전: py312
  - 줄 길이: 100
  - 따옴표: double (포매팅), single (import organize 제외)
  - 린트 규칙: E, W, F, I, N, UP, B, C4, SIM, ANN, S, T20, PT, RUF
  - 무시: ANN401 (동적 kwargs), S101 (assert), B008 (FastAPI DI)
- **mypy**: >= 1.13.0 (엄격 모드, src/ 경로)
  - 플러그인: pydantic.mypy, sqlalchemy.ext.mypy.plugin
  - strict=true, disallow_any_generics=false, warn_return_any=false
- **pre-commit**: >= 4.0.0 (git hook)
- **detect-secrets**: >= 1.5.0 (시크릿 스캔)

### 테스트

- **pytest**: >= 8.3.0
  - asyncio_mode: auto
  - 마커: unit (I/O 없음), integration (DB/Redis), e2e (실행 서버)
  - 커버리지 강제: 70% (pytest --cov-fail-under=70)
- **pytest-asyncio**: >= 0.24.0
- **pytest-cov**: >= 5.0.0
- **fakeredis**: >= 2.26.0 (Redis 스텁, 단위 테스트용)
- **anyio**: >= 4.6.0 (비동기 테스트 헬퍼)

### 타입 스텁

- **sqlalchemy[mypy]**: >= 2.0.36
- **types-passlib**: >= 1.7.7
- **types-python-jose**: >= 3.3.0

---

## 프론트엔드 (`web/`)

### 언어 & 런타임

- **JavaScript/TypeScript**: ES2022 target
- **Node.js**: >= 18.17.0 (engines)
- **pnpm**: >= 10.0.0 (패키지 관리자, pinned @ 10.28.2)
- **TypeScript**: 5.8.3
  - 모드: strict (noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch)
  - JSX: react-jsx
  - 경로 별칭: `@/*` → `src/*`

### 빌드 & 번들링

- **Vite**: 6.0.0
  - 포트: 3000
  - 플러그인:
    - TanStack Router (파일 기반 라우팅, auto code-splitting)
    - React Plugin (@vitejs/plugin-react)
    - Tailwind CSS Vite (@tailwindcss/vite)
    - vite-tsconfig-paths
- **tsc**: TypeScript 컴파일러 (tsc -b && vite build)

### 프레임워크 & 상태 관리

- **React**: 19.0.0
  - JSX Automatic Runtime
- **React DOM**: 19.0.0
- **TanStack Router**: 1.95.0 (파일 기반 라우팅)
  - 라우트 트리: `src/routes/` → `src/routeTree.gen.ts` 자동생성
  - 개발자 도구: @tanstack/react-router-devtools
- **TanStack Query (React Query)**: 5.75.0 (서버 상태)
- **TanStack Table**: 8.21.3 (테이블 라이브러리)
- **Zustand**: 5.0.3 (클라이언트 전역 상태)
- **Immer**: 11.1.4 (상태 업데이트 헬퍼)

### 폼 & 검증

- **react-hook-form**: 7.55.0
- **@hookform/resolvers**: 4.1.3 (검증 resolver)
- **Zod**: 3.24.2 (스키마 검증, 메시지 한국어)
- **@hookform/devtools**: 4.4.0 (개발 도구)

### UI & 스타일링

- **Tailwind CSS**: 4.0.0
  - @tailwindcss/vite 플러그인
- **Radix UI / Base UI**:
  - @base-ui/react: 1.4.1 (기초 컴포넌트)
  - @radix-ui/react-label: 2.1.8
  - @radix-ui/react-slot: 1.2.0
  - radix-ui: 1.4.3 (프리미티브)
- **class-variance-authority (cva)**: 0.7.1 (UI 계층)
- **Lucide React**: 0.487.0 (아이콘)
- **Motion**: 11.18.0 (애니메이션)
- **Sonner**: 2.0.3 (토스트 알림)
- **tailwind-merge**: 2.6.0 (Tailwind 클래스 병합)
- **tw-animate-css**: 1.4.0 (Tailwind 애니메이션)
- **clsx**: 2.1.1 (조건부 클래스명)

### 폼 & 날짜

- **react-day-picker**: 10.0.0 (달력 컴포넌트)
- **date-fns**: 4.1.0 (날짜 유틸)

### 국제화

- **i18next**: 26.0.10 (다국어)
- **react-i18next**: 17.0.7

### 차트

- **recharts**: 3.8.1

### 기타

- **@radix-ui/react-icons**: 1.3.2
- **react-focus-lock**: 2.13.7 (포커스 관리)
- **@faker-js/faker**: 10.4.0 (더미 데이터)
- **@fontsource-variable/inter**: 5.1.1 (폰트)
- **cmdk**: 1.1.1 (커맨드 팔렛)

### 코드 품질

- **Biome**: 1.9.4 (린터 + 포매터)
  - 인덴트: 2 spaces
  - 줄 길이: 100자
  - 따옴표: single
  - Trailing commas: es5
  - Import organization: enabled

---

## 인프라

### Docker

- **기본 이미지**: python:3.12-slim-bookworm (런타임), python:3.12-slim-bookworm (빌드)
- **uv**: 0.6.13 (pinned, BuildKit cache mount)
- **다단계 빌드**:
  1. uv-binary 스테이지 (uv 바이너리 공여)
  2. builder 스테이지 (/runtime-venv 생성, 휠 빌드, bytecode 컴파일)
  3. runtime 스테이지 (venv + alembic만, 개발 도구 제외)

### Docker Compose

**파일**: `api/docker-compose.yml` (로컬 개발), `api/docker-compose.prod.yml` (프로덕션 오버레이)

#### 서비스

- **postgres:17-alpine**
  - 포트: 127.0.0.1:5432:5432
  - 환경변수: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, PGDATA
  - 볼륨: postgres_data
  - 헬스 체크: pg_isready
- **redis:7-alpine**
  - 포트: 127.0.0.1:6379:6379
  - 명령어: redis-server --save 60 1 --loglevel warning
  - 볼륨: redis_data
  - 헬스 체크: redis-cli ping
- **mailpit** (로컬 개발만)
  - SMTP 포트: 127.0.0.1:1025:1025
  - UI 포트: 127.0.0.1:8025:8025
- **app** (프로덕션 프로필에서만, docker-compose.prod.yml 정의)

### 작업 자동화

**Taskfile.yml** (Task runner v3, https://taskfile.dev)

핵심 작업:
- `task dev` — 전체 스택 (infra + 마이그레이션 + FastAPI 핫리로드)
- `task serve` — FastAPI만 (infra 스킵)
- `task infra` / `task infra-down` — 컨테이너 관리
- `task test` / `task test-unit` / `task test-integration` — pytest
- `task lint` / `task format` / `task typecheck` — 코드 품질
- `task migrate` / `task revision` — Alembic 마이그레이션

---

## 코드베이스 레이아웃

### 백엔드 소스 (`api/src/`)

```
src/
├── main.py                  # FastAPI 앱 팩토리 (create_app)
├── core/                    # 횡단 관심사
│   ├── config.py           # Settings, LLMSettings (pydantic)
│   ├── database.py         # SQLAlchemy 엔진, 세션, Base
│   ├── redis.py            # Redis 클라이언트 싱글톤
│   ├── exceptions.py       # AppError 계층, 핸들러 등록
│   ├── logging.py          # structlog 설정
│   └── middleware.py       # CorrelationIdMiddleware
├── domains/                 # 비즈니스 로직
│   ├── auth/               # 인증 도메인
│   │   ├── models/         # ORM 모델 (User, etc)
│   │   ├── schemas/        # Pydantic DTO (LoginRequest, etc)
│   │   ├── repository/     # 데이터 접근 계층
│   │   ├── service/        # 비즈니스 로직
│   │   ├── router/         # FastAPI 라우터
│   │   ├── oauth/          # Google, Kakao, Naver 플로우
│   │   ├── security.py     # JWT 토큰 유틸
│   │   └── email.py        # 이메일 템플릿 & 발송
│   ├── chat/               # LLM 채팅 도메인
│   │   ├── models/         # Conversation, Message
│   │   ├── schemas/        # ChatRequest, ChatResponse
│   │   ├── repository/
│   │   ├── service/        # LLMClient 통합
│   │   ├── router/         # 동기 + SSE 스트리밍 엔드포인트
│   │   └── ports.py        # LLMClientProtocol 인터페이스
│   └── shared/             # 공용 베이스
│       ├── models/         # Base 엔티티, Timestamp mixin
│       ├── events.py       # 도메인 이벤트
│       └── types.py        # 공용 타입
└── infra/                   # 외부 어댑터
    └── llm/                # LangChain-LiteLLM 팩토리
        └── provider_factory.py  # make_chat_litellm()

```

PYTHONPATH=src (Taskfile 자동 설정) → `core`, `domains`, `infra` 톱레벨 import 가능

### 프론트엔드 소스 (`web/src/`)

```
src/
├── routes/                  # TanStack Router 파일 기반 라우팅
├── features/               # 도메인 슬라이스
│   └── auth/              # 인증 피처
│       ├── components/    # 로그인, 가입 폼
│       ├── hooks/         # useAuthMutation 등
│       ├── schema/        # Zod 검증
│       ├── store/         # Zustand 스토어
│       ├── types/         # TypeScript 타입
│       └── lib/           # mock-auth-api.ts (현재 mock)
├── components/            # UI 컴포넌트
│   ├── ui/               # Radix/shadcn 프리미티브
│   ├── layout/           # 레이아웃 컴포넌트
│   └── dev/              # 개발 도구
├── stores/               # Zustand 전역 상태
├── hooks/                # 커스텀 React hook
├── providers/            # React Context Provider (Query, Auth 등)
├── lib/                  # 유틸 함수
├── styles/               # CSS/Tailwind
└── sample/               # 예제 & smoke 테스트

```

파일 규칙: kebab-case (예: `use-auth-mutation.ts`, `login-form.tsx`)

---

## 환경 설정

### API 환경변수 (`.env.example` 참고)

주요 섹션:

- **Application**: APP_ENV, APP_DEBUG, SECRET_KEY, FRONTEND_URL, CORS_ORIGINS
- **Server**: HOST, PORT, WORKERS
- **PostgreSQL**: DATABASE_URL (async), DATABASE_URL_SYNC (Alembic)
  - 또는 POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- **Redis**: REDIS_URL 또는 REDIS_HOST, REDIS_PORT, REDIS_DB
- **JWT**: JWT_SECRET_KEY, JWT_ALGORITHM (HS256), JWT_ACCESS_TOKEN_EXPIRE_MINUTES (15), JWT_REFRESH_TOKEN_EXPIRE_DAYS (7)
- **OAuth**: GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI, KAKAO_*, NAVER_*
- **Email**: MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM, MAIL_STARTTLS, MAIL_SSL_TLS
- **LLM**: LLM_PROVIDER (openai|anthropic|gemini|azure|ollama), LLM_DEFAULT_MODEL, LLM_TEMPERATURE (0.7), LLM_MAX_TOKENS (2048), LLM_STREAMING (true)
  - 제공자별: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, AZURE_OPENAI_*, OLLAMA_BASE_URL
- **Observability**: LOG_LEVEL (DEBUG|INFO|WARNING|ERROR|CRITICAL), LOG_FORMAT (json|console)

---

## 의존성 관리

- **런타임 의존성**: `pyproject.toml` [project].dependencies
- **개발 의존성**: `pyproject.toml` [dependency-groups].dev (PEP 735, uv 네이티브)
- **uv 설정**: tool.uv (default-groups=["dev"])
- **패키지 소스**: tool.uv.sources (프라이빗 PyPI 등)
- **빌드**: hatchling (tool.hatch.build.targets)

---

## 버전 및 라이선스

- **프로젝트 버전**: 0.1.0 (Alpha)
- **라이선스**: MIT
- **개발 상태**: Alpha (Development Status :: 3)
