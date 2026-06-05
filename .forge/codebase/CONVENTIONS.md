---
last_mapped_commit: 5c5103df2b3695a9b8bd62b9c5701f2988b8e0ab
mapped: 2026-06-05
---

# CONVENTIONS — 코드 스타일·네이밍·패턴

검증 출처: `api/pyproject.toml`, `api/Taskfile.yml`, `web/biome.json`, 실제 `api/src/**`·`web/src/**` 코드. 문서가 아닌 실제 파일에서 추출한 규칙이다.

## API (Python / FastAPI)

### 린터·포매터 설정 (`api/pyproject.toml`)

**Ruff**:
- Target: Python 3.12
- Line length: 100
- Quote style: double quotes (`"`)
- 활성 rule set: `E`, `W`, `F`, `I`(isort), `N`(naming), `UP`, `B`, `C4`, `SIM`, `ANN`, `S`(bandit), `T20`, `PT`, `RUF`
- 테스트 완화: `S101`(assert 허용), `ANN`(타입 어노테이션 면제), `T20`(print 허용), `PT011`

**mypy**:
- `strict = true`
- `mypy_path = ["src"]`
- 완화: `disallow_any_generics = false`, `warn_return_any = false`
- 서드파티 무시: `fastapi_mail`, `passlib`, `jose`, `alembic`, `redis`, `slowapi`, `langchain*`, `litellm`

실행: `task lint`(ruff check + mypy), `task format`(ruff format + ruff check --fix), `task typecheck`(mypy만).

### 네이밍

| 대상 | 규칙 | 예 |
|------|------|-----|
| 모듈/패키지 | `snake_case` | `auth_service.py`, `oauth/` |
| 서비스 클래스 | `{Domain}Service` | `AuthService`, `ChatService` |
| 리포지토리 | `{Domain}Repository` | `AuthRepository` |
| Pydantic DTO | `{Entity}{Action}Request|Response` | `LoginRequest`, `SignupResponse` |
| ORM 모델 | declarative 단수 | `User`, `RefreshToken` |
| 예외 | `{Error}Error` | `NotFoundError`, `ConflictError` |
| 함수/메서드 | `snake_case`, async prefix 없음 | `async def login()` |
| 상수 | `UPPER_SNAKE_CASE` | `JWT_ALGORITHM` |
| 프라이빗 헬퍼 | leading underscore | `_get_service` |

### 핵심 패턴 (반드시 따를 것)

**DTO·검증은 Pydantic v2** (`{domain}/schemas/`). `field_validator(mode="before")`로 정규화, `model_config = {"from_attributes": True}`로 ORM 매핑. 응답 DTO는 절대 시크릿(`hashed_password` 등)을 포함하지 않는다.

```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
```

**비동기 일관성** — DB는 `AsyncSession`(asyncpg), 모든 핸들러·서비스·리포지토리는 `async def`. 블로킹 호출 금지(이벤트 루프 차단).

**의존성 주입** — FastAPI `Depends` + 서비스 생성자 주입. 라우터에 `_get_service` 헬퍼를 두고 repo/redis/mail을 조립한다.

```python
async def _get_service(
    session: AsyncSession = Depends(get_async_session),
    redis: Redis = Depends(get_redis_dep),
) -> AuthService:
    return AuthService(AuthRepository(session), redis, ...)
```

코어 의존성: `get_async_session`, `get_redis_dep`, `get_settings`(LRU 캐시), `get_auth_email_service`.

**에러 처리** — 서비스/리포에서 `core/exceptions.py`의 `AppError` 계층을 raise. `register_exception_handlers`가 HTTP 응답으로 변환한다. 응답 envelope나 `DOMAIN_NNN` 코드 체계는 **없다** — 핸들러는 `{"detail": ...}` JSON + `X-Correlation-ID` 헤더를 반환한다. 라우터에서 `fastapi.HTTPException` 직접 raise도 허용.

```python
raise ConflictError(f"An account with email '{email}' already exists.")  # 409
raise UnauthorizedError("Invalid email or password.")                    # 401
raise NotFoundError("User")                                              # 404
raise ForbiddenError(...)                                                # 403
```

**불가능 시나리오에 `assert` 금지** — 프로덕션 코드는 명시적 예외를 raise한다(테스트는 `assert` 자유). 

**설정은 pydantic-settings `Settings`** (`core/config.py`) — `get_settings()`로 주입, `.env` 로드, LLM 설정은 `LLM_` prefix. `SecretStr`로 비밀값 보관.

**로깅은 structlog** — JSON 구조적 로깅. 이벤트명 + 키워드 컨텍스트(`logger.info("signup_completed", user_id=...)`). `correlation_id`는 미들웨어가 자동 바인딩.

**라우터 등록** — `main.py` 앱 팩토리에서 도메인 라우터는 `/api/v1` prefix, `health_router`만 루트. 엔드포인트는 `response_model` 명시, 생성은 `201`.

**모듈 헤더** — 각 모듈 상단에 `from __future__ import annotations`.

**Alembic** — 기존 리비전 수정 금지. 신규는 `task revision`(autogenerate).

## 프론트엔드 (React 19 / TypeScript)

### Biome 설정 (`web/biome.json`)

- Indent: 2 spaces
- Line width: 100
- Quote style: single quotes (`'`)
- Trailing commas: ES5
- organize imports: enabled, linter: recommended

실행: `pnpm lint`(검사), `pnpm lint:fix`(자동 수정), `pnpm typecheck`(tsc --noEmit).

### 네이밍

| 대상 | 규칙 | 예 |
|------|------|-----|
| 파일명 | `kebab-case` | `login-form.tsx`, `use-auth-mutation.ts` |
| 컴포넌트 | `PascalCase` | `function LoginForm()` |
| 훅 | `use` prefix camelCase | `useAuthStore` |
| 타입/인터페이스 | `PascalCase` | `AuthUser`, `LoginInput` |
| 변수/함수 | `camelCase` | `handleSubmit` |

### 핵심 패턴

**폼 검증은 Zod, 메시지는 한국어** + React Hook Form + `zodResolver`.

```typescript
z.string().email('유효한 이메일 주소를 입력해주세요')
```

**서버 상태 = TanStack Query** (`useMutation`/`useQuery`), **클라이언트 전역 상태 = Zustand** (`features/{domain}/store/*.store.ts`).

**UI 프리미티브** — `components/ui/`에 Radix/Base UI + `class-variance-authority`(cva) 기반 shadcn 스타일. `forwardRef` + `VariantProps`.

**라우팅** — TanStack Router 파일 기반(`routes/`), `createFileRoute`로 정의.

**타입 임포트** — `import type { ... }`로 타입 전용 임포트 분리.

**애니메이션** — `motion/react`(`motion.div`, `AnimatePresence`).

## 크로스커팅

- 환경 변수: API는 `api/.env`(pydantic-settings + python-dotenv), 없으면 `task install`/`task dev`가 `.env.example`에서 자동 복사.
- 인프라: `task infra`(PostgreSQL 5432 / Redis 6379 / Mailpit 1025, 모두 `127.0.0.1` 바인딩).
- pre-commit: `ruff check + mypy` (`task pre-commit-install`).
