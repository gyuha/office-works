# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

FastAPI 백엔드(`api/`) + React SPA(`web/`) 모노레포 — 프로젝트명 `office-works`.

`api/`는 Python 3.14 / uv 기반 FastAPI 서버로, 인증(JWT + OAuth2 + 이메일 인증)과 LLM 채팅 프록시 도메인을 제공한다. `web/`는 React 19 + TanStack Router SPA다.

## 명령어

### API (`api/` 디렉토리, [Task](https://taskfile.dev) 사용)

`Taskfile.yml`이 정식 진입점이다(`Justfile`도 있지만 Taskfile과 동일 명령을 미러링). 모든 Python 실행은 `uv run` 경유, `PYTHONPATH=src`는 Taskfile이 자동 설정한다.

```bash
# 인프라(Postgres/Redis/Mailpit) 기동 + 마이그레이션 + FastAPI 핫리로드
task dev

# 앱만 재시작 (인프라/마이그레이션 스킵)
task serve

# 인프라 컨테이너만 기동/중지
task infra
task infra-down

# 테스트 (커버리지 70% 강제 — pytest addopts의 --cov-fail-under=70)
task test
task test-unit          # 마커 unit 만
task test-integration   # 마커 integration 만 (인프라 필요)

# 단일 테스트
uv run pytest "tests/test_config.py::TestMailSettings::test_mail_from_uses_project_slug"

# 정적 분석 (ruff check + mypy strict)
task lint
task format             # ruff format + ruff check --fix
task typecheck          # mypy 만

# Alembic 마이그레이션
task migrate            # upgrade head
task revision           # autogenerate 리비전 생성 (대화형)

# 시드 (조직설정 캐노니컬 데이터셋 upsert — idempotent, migrate 후)
task seed
```

> 전체 검증은 단일 `check` 태스크가 없다 — `task lint && task test`로 수행한다(커버리지 게이트는 pytest가 강제).

### 프론트엔드 (`web/` 디렉토리)

```bash
pnpm dev          # 개발 서버 (port 3000)
pnpm build        # tsc -b + vite build
pnpm typecheck    # tsc --noEmit
pnpm lint         # Biome 검사
pnpm lint:fix     # Biome 자동 수정
```

## 아키텍처

### API 레이어 구조

`src/`는 flat 레이아웃이다(패키지 prefix 없음, `PYTHONPATH=src`로 `core`/`domains`/`infra`를 톱레벨 import). 도메인별로 레이어를 적용한다:

```
{domain}/router → service → repository → models
{domain}/schemas (Pydantic 요청/응답 DTO)
core/ (config, database, redis, exceptions, logging, middleware)
infra/ (llm — provider_factory 등 외부 어댑터)
```

- `domains/auth/` — 회원가입·이메일 인증·로그인·토큰 회전·OAuth2(Google/Kakao/Naver). `oauth/`, `security`, `email` 모듈 포함
- `domains/chat/` — LLM 채팅 (동기 + SSE 스트리밍)
- `domains/shared/` — 도메인 공용 베이스(엔티티 base, 이벤트, 타입)
- `core/` — 횡단 관심사 (설정, DB 세션, Redis, 예외 핸들러, 구조적 로깅, 미들웨어)

라우터는 `main.py`의 앱 팩토리에서 `/api/v1` prefix로 등록된다(`health_router`만 루트). 미들웨어는 `CorrelationIdMiddleware` + CORS.

DB 접근은 **SQLAlchemy 2.0 async**(`AsyncSession` + asyncpg). Alembic 마이그레이션은 동기 드라이버(psycopg2)를 사용한다.

요청 흐름:

```
요청 → CorrelationIdMiddleware → 라우터(/api/v1) → 서비스 → 리포지토리 → DB
                                      ↓ AppError 발생
                          register_exception_handlers → {"detail": ...} + X-Correlation-ID
```

### 프론트엔드 구조

Feature-Sliced Design 변형:

- `routes/` — TanStack Router 파일 기반 라우팅
- `features/{domain}/` — 도메인 슬라이스 (components, hooks, store, schema)
- `components/ui/` — Radix/Base UI + cva 기반 UI 프리미티브(shadcn 스타일)
- `stores/` — Zustand 전역 클라이언트 상태
- `providers/` — React Query, 인증 등 Provider 래핑

## 핵심 패턴

### API — 반드시 따를 것

**DTO·검증은 Pydantic v2(`schemas/`):**
```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
```

**비동기 일관성 — DB는 `AsyncSession`, 핸들러/서비스는 `async def`:**
```python
async def login(self, email: str, password: str) -> dict[str, Any]:
    user = await self._repo.find_by_email(email)
    ...
```

**의존성 주입은 FastAPI `Depends` + 서비스 생성자 주입:**
```python
async def _get_service(
    session: AsyncSession = Depends(get_async_session),
    redis: Redis = Depends(get_redis_dep),
) -> AuthService:
    return AuthService(AuthRepository(session), redis, ...)
```

**에러 처리는 `core/exceptions.py`의 `AppError` 계층을 raise** — 서비스에서 던지고, `register_exception_handlers`가 HTTP 응답으로 변환한다. 응답 envelope나 `DOMAIN_NNN` 코드 체계는 **없다**; 핸들러는 `{"detail": ...}` JSON + `X-Correlation-ID` 헤더를 반환한다.
```python
raise ConflictError(f"An account with email '{email}' already exists.")  # 409
raise UnauthorizedError("Invalid email or password.")                    # 401
raise NotFoundError("User")                                              # 404
raise ForbiddenError(...)                                                # 403
# 라우터에서 fastapi.HTTPException 직접 raise 도 허용
```

**설정은 pydantic-settings `Settings`(`core/config.py`)** — `get_settings()`로 주입, `.env` 로드. LLM 설정은 `LLM_` prefix.

**로깅은 structlog** — JSON 구조적 로깅 + `correlation_id` 바인딩.

**Alembic 마이그레이션:** `0001_initial_schema` 등 기존 리비전 수정 금지. 신규는 `task revision`(autogenerate)으로 추가.

### 프론트엔드 — 반드시 따를 것

**파일명:** `kebab-case` (예: `use-auth-mutation.ts`, `login-form.tsx`)

**Biome 설정:** 2 spaces, 100자 줄 길이, single quotes, trailing commas ES5

**Zod 폼 검증, 메시지는 한국어:**
```typescript
z.string().email('유효한 이메일 주소를 입력해주세요')
```

**서버 상태 = TanStack Query, 클라이언트 전역 상태 = Zustand**

## 테스트 패턴

**프레임워크:** pytest (`asyncio_mode = auto` — async 테스트에 데코레이터 불필요). 파일 `test_*.py`, 클래스 `Test*`, 함수 `test_*`.

**마커:** `unit`(I/O 없음), `integration`(DB/Redis 접근), `e2e`(기동 서버 대상). `--strict-markers` 적용.

**테스트 메서드 명명:** `test_methodUnderTest_scenario_expectation` (예: `test_mail_from_uses_project_slug`, `login_withValidCredentials_returnsTokenResponse` 스타일).

**Redis는 `fakeredis`로 스텁**, 단위 테스트는 `@BeforeEach` 없이 대상 객체를 직접 생성한다.

**커버리지 70% 강제** — pytest `addopts`의 `--cov-fail-under=70`이 적용(대상 `src`, `alembic/`·`tests/`·`migrations/` 제외).

## 환경 설정

`cp .env.example .env` 후 값 채움(`task install`/`task dev`가 없으면 자동 복사). 주요 변수:

- `APP_ENV`, `APP_DEBUG`, `SECRET_KEY`, `FRONTEND_URL`, `CORS_ORIGINS`, `HOST`/`PORT`/`WORKERS`
- `DATABASE_URL` (`postgresql+asyncpg://...` — 앱 런타임), `DATABASE_URL_SYNC` (`postgresql+psycopg2://...` — Alembic)
- `POSTGRES_*`, `REDIS_URL`/`REDIS_HOST`/`REDIS_PORT`/`REDIS_DB`
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`(HS256), `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`(15), `JWT_REFRESH_TOKEN_EXPIRE_DAYS`(7)
- OAuth2: `GOOGLE_*`, `KAKAO_*`, `NAVER_*` (콜백 base는 `/api/v1/auth/oauth/{provider}/callback`)
- LLM(`LLM_` prefix): `LLM_PROVIDER`, `LLM_DEFAULT_MODEL`, `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`/`GEMINI_API_KEY`/`AZURE_OPENAI_*`/`OLLAMA_BASE_URL`
- 메일(dev=Mailpit): `MAIL_SERVER`(localhost), `MAIL_PORT`(1025), `MAIL_FROM`

Docker 인프라(`task infra`, 모두 `127.0.0.1` 바인딩): PostgreSQL 5432, Redis 6379, Mailpit SMTP 1025 / UI 8025.

## 주의 사항

- `web/src/features/auth/lib/mock-auth-api.ts` — 프론트엔드 인증이 현재 mock API 사용 중. 실 API 미연동 상태.
- **Python 3.14로 개발할 것**(`requires-python = ">=3.14"`). 과거 langchain `pydantic.v1`이 3.14에서 깨졌으나 의존성 갱신으로 해소됨(전체 테스트 642 passed on 3.14, 실패 12건은 stale Makefile 테스트로 무관). `.python-version`은 `api/.gitignore`가 무시하므로 버전 핀은 `pyproject.toml`의 `requires-python`이 담당한다.
- `Taskfile.yml`이 정식 진입점이며 `PYTHONPATH=src`를 전역 설정한다. `Justfile`은 동일 명령을 미러링하나 보조용이다.
- 마이그레이션은 `0001_initial_schema` 하나뿐 — pyproject가 언급하는 RBAC는 아직 스키마에 미구현(계획 단계).
- `api/CLAUDE.md`는 Ouroboros 스펙-우선 워크플로우 문서로, 이 스택 설명과 무관하다.
