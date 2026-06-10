---
last_mapped_commit: 7813838ac56097621569a9ce37a8afe4f10f0b54
mapped: 2026-06-11
---

# ARCHITECTURE — office-works

FastAPI 백엔드(`api/`) + React 19 SPA(`web/`) 모노레포. 백엔드는 도메인별 레이어드 아키텍처, 프론트엔드는 Feature-Sliced 변형 + OpenAPI 코드젠 클라이언트를 사용한다. 이 문서는 워킹 트리 기준이다(미커밋 변경 포함: `users.employment_type`/`users.memo` 컬럼, members→users 병합 후속, Tiptap 리치텍스트 에디터).

## 1. API 레이어 구조

`api/src/`는 flat 레이아웃이다 — 톱레벨 패키지 prefix 없이 `PYTHONPATH=src`로 `core` / `domains` / `infra` / `main`을 직접 import한다(`api/Taskfile.yml`이 전역 설정).

각 도메인은 동일한 4-레이어 구조를 따른다:

```
domains/{domain}/router/    → HTTP 엔드포인트 (APIRouter, Depends 조립)
domains/{domain}/service/   → 비즈니스 로직 (생성자 주입, AppError raise)
domains/{domain}/repository/→ DB 접근 (AsyncSession 쿼리)
domains/{domain}/models/    → SQLAlchemy ORM 엔티티 (core.database.Base 상속)
domains/{domain}/schemas/   → Pydantic v2 요청/응답 DTO
```

- **횡단 관심사**는 `api/src/core/` — `config.py`(pydantic-settings `Settings`), `database.py`, `redis.py`, `exceptions.py`, `logging.py`(structlog), `middleware.py`, `ids.py`
- **외부 어댑터**는 `api/src/infra/` — `infra/llm/provider_factory.py`(LLM provider 추상화)

## 2. 앱 팩토리 (`api/src/main.py`)

`create_app()`이 FastAPI 인스턴스를 조립한다:

1. `lifespan` 컨텍스트 — startup에서 `configure_logging()` + Redis 커넥션 풀 워밍(`core/redis.py::get_redis_client` + ping), shutdown에서 `close_redis_client()`
2. **rate limiter** — slowapi `Limiter` 모듈 전역 인스턴스(`main.limiter`, key는 인증 사용자 ID 또는 remote IP). 라우터들이 import해서 per-route 제한 적용
3. **미들웨어** (바깥→안): `CorrelationIdMiddleware`(`api/src/core/middleware.py`) → `CORSMiddleware`(`X-Correlation-ID` expose)
4. `register_exception_handlers(application)` — `api/src/core/exceptions.py`
5. `_register_routers()` — 도메인 라우터 등록

라우터 등록 현황(모두 `/api/v1` prefix, try/except ImportError로 점진 등록):

| 도메인 | import 경로 | prefix |
|--------|------------|--------|
| health | `main.py` 내 인라인 `health_router` (`/health`, `/ready`) | 루트 (prefix 없음) |
| auth | `domains/auth/router` | `/api/v1/auth` |
| chat | `domains/chat/router` | `/api/v1/chat` |
| users | `domains/users/router` | `/api/v1/users` |
| org | `domains/org/router` (집계 라우터) | `/api/v1/...` |

`domains/org/router/__init__.py`는 4개 서브 라우터(`position_router`, `employment_type_router`, `grade_router`, `config_router`)를 하나의 `APIRouter()`로 묶어 export한다.

모듈 레벨 `app = create_app()`이 uvicorn 진입점이다. `/ready`는 Postgres·Redis·Mailpit SMTP를 실제 네트워크 체크한다(전부 ok가 아니면 503).

## 3. 요청 흐름 / 에러 처리

요청은 미들웨어 → 라우터 → 서비스 → 리포지토리 → DB 순으로 흐르고, 서비스에서 던진 `AppError`는 예외 핸들러가 HTTP 응답으로 변환한다. 응답 envelope나 `DOMAIN_NNN` 에러 코드 체계는 **없다**.

```
요청 → CorrelationIdMiddleware → 라우터(/api/v1) → 서비스 → 리포지토리 → DB(AsyncSession)
                                      ↓ AppError raise
                  register_exception_handlers → {"detail": ...} + X-Correlation-ID 헤더
```

`AppError` 계층(`api/src/core/exceptions.py`, 각자 `status_code` 보유):

- `NotFoundError`(404), `ConflictError`(409), `UnauthorizedError`(401), `ForbiddenError`(403)
- 라우터에서 `fastapi.HTTPException` 직접 raise도 허용 (예: `domains/users/router/user_router.py`)

## 4. 의존성 주입 패턴

FastAPI `Depends` + 서비스 생성자 주입. 각 라우터 모듈에 `_get_service` 헬퍼가 있고, 세션/Redis를 받아 서비스를 조립한다.

- DB 세션: `core.database.get_async_session` — `AsyncSession` yield (SQLAlchemy 2.0 async + asyncpg). 엔진/세션 팩토리는 `api/src/core/database.py`에서 1회 생성
- Redis: `core.redis.get_redis_dep` (모듈 싱글톤 `get_redis_client` 래핑)
- 설정: `core.config.settings` 모듈 전역 + `get_settings()`
- 인증 가드: `domains/auth/security.py`의 `get_current_user`(읽기 게이트) / `require_permission("users:write")`(쓰기 게이트) — `domains/users/router/user_router.py`에서 사용 패턴 확인 가능

예시 (`api/src/domains/users/router/user_router.py`):

```python
async def _get_service(
    session: AsyncSession = Depends(get_async_session),
) -> UserDirectoryService:
    ...
# 핸들러: service: UserDirectoryService = Depends(_get_service),
#         _current_user: User = Depends(get_current_user)
```

## 5. 도메인 현황

| 도메인 | 내용 | 비고 |
|--------|------|------|
| `domains/auth/` | 회원가입·이메일 인증·로그인·토큰 회전·비밀번호 재설정·OAuth2 | `oauth/`(google/kakao/naver/microsoft), `security.py`, `email.py` 포함. 모델: `Permission`, `Role`, `User`, `RefreshToken`, `EmailVerification`, `PasswordReset`, `OAuthAccount` (`api/src/domains/auth/models/auth_models.py`) |
| `domains/users/` | 직원 디렉토리(구 members 도메인 병합) | **자체 models 없음** — `domains.auth.models.User`를 공유. 라우트: list/stats/me/export(CSV)/{id} 읽기 + create/patch/soft-delete 쓰기 |
| `domains/chat/` | LLM 채팅 (동기 + SSE 스트리밍) | `container.py`(DI 컨테이너), `ports.py`, `llm_client.py`, `llm_factory.py` — `infra/llm/provider_factory.py` 경유 |
| `domains/org/` | 조직 설정 | 마스터: `Position`/`EmploymentType`/`Grade`, 싱글톤: `WorkSettings`/`LeaveSettings`/`CompanyInfo` (`api/src/domains/org/models/org_models.py`). 라우터/서비스/리포지토리가 엔티티별로 분리 |
| `domains/shared/` | 도메인 공용 | `base.py`(엔티티 base), `events.py`, `types.py` |

**ID 체계** (`api/src/core/ids.py`): 모든 aggregate 테이블 PK는 Stripe 스타일 prefixed string — `{prefix}_{ULID}` (예: `usr_01hx...`). prefix 상수: `USER="usr"`, `ROLE="rol"`, `PERMISSION="prm"`, `REFRESH_TOKEN="rft"`, `EMAIL_VERIFICATION="evf"`, `PASSWORD_RESET="pwr"`, `OAUTH_ACCOUNT="oau"` 등. 사용: `id: Mapped[str] = id_column(USER)`.

## 6. Alembic 마이그레이션 체인

`api/alembic/versions/` — 동기 드라이버(psycopg2, `DATABASE_URL_SYNC`) 사용. 리비전 id는 ≤32자 제약(`alembic_version.version_num`이 varchar(32)). 체인은 선형이다:

```
0001_initial_schema
  → 0002_members_table_and_seed
  → 0003_positions_table_and_seed
  → 0004_employment_types            (파일: 0004_employment_types_table_and_seed.py)
  → 0005_grades                      (파일: 0005_grades_table_and_seed.py)
  → 0006_org_config                  (파일: 0006_org_config_singletons.py)
  → 0007_merge_members_into_users
  → 0008_drop_members_table
  → 0009_string_ids
  → 0010_user_employment_type        (미커밋 — users.employment_type VARCHAR(64) nullable, org employment_types의 name 참조)
  → 0011_user_memo                   (미커밋 — users.memo TEXT nullable, Tiptap HTML, ADR-0007)
```

파일명과 리비전 id가 다른 경우가 있음에 주의(0004/0005/0006). 시드는 마이그레이션과 별도로 `api/scripts/seed.py`(`task seed`, idempotent upsert).

## 7. 프론트엔드 아키텍처 (`web/`)

### 부팅 체인

```
web/src/main.tsx → setupApiClient() (인터셉터 등록)
               → RouterProvider(router)  (web/src/lib/router.ts)
routes/__root.tsx → AppProviders (QueryClientProvider) + Modals + Toaster + ThemeToggle
```

- `web/src/providers/app-providers.tsx` — TanStack Query `QueryClient` (mutations retry: false)
- `web/src/routes/__root.tsx` — 루트 레이아웃. `Modals`(zustand 기반 `web/src/stores/modal-store.ts`), sonner `Toaster`, dev 전용 RouterDevtools

### 라우팅 — TanStack Router 파일 기반

`web/src/routes/`가 라우트 트리이고 `web/src/routeTree.gen.ts`로 생성된다.

- `routes/_app.tsx` — 인증 게이트 레이아웃: `beforeLoad`에서 `useAuthStore.getState().isAuthenticated` 검사, 미인증 시 `/login` redirect. `AppShell`(`web/src/features/office/components/app-shell.tsx`) 래핑
- `routes/_app/app.$screenId.tsx` — 동적 스크린 라우트. `web/src/features/office/screens/registry.ts`의 `SCREEN_REGISTRY`(members/teams/settings/projects/approval/attendance)에서 스크린 컴포넌트를 lookup
- `routes/auth/login.tsx`, `routes/auth/signup.tsx`, `routes/auth/callback.tsx`, `routes/login.tsx` — 인증 화면
- `routes/sample/**` — shadcn admin 템플릿 데모(실 기능 아님, `web/src/sample/`과 짝)

### 생성 API 클라이언트 (hey-api)

```
FastAPI app.openapi() → api/openapi.json (스냅샷)
        → 루트 Taskfile `task gen-api` → web 디렉토리 `pnpm openapi-ts`
        → web/src/client/ (sdk.gen.ts, types.gen.ts, @tanstack/react-query.gen.ts ...)
```

- 설정: `web/openapi-ts.config.ts` (input `../api/openapi.json`)
- 런타임 baseUrl: `web/src/lib/hey-api.ts`의 `createClientConfig` (`VITE_API_BASE_URL`, 기본 `http://localhost:8000`)
- 인터셉터: `web/src/lib/api-client.ts::setupApiClient` — 요청에 auth store의 accessToken Bearer 부착, 응답 401이면 `clearUser()` + `/login` 이동(자동 토큰 갱신 없음 — ADR-0004)
- TanStack Query용 query options도 코드젠됨(`web/src/client/@tanstack/react-query.gen.ts`)

### 상태 관리

- 서버 상태: TanStack Query (생성된 query options 사용 — 예: `web/src/features/office/screens/members.tsx`)
- 클라이언트 전역: Zustand — `web/src/features/auth/store/auth.store.ts`(인증/토큰), `web/src/stores/modal-store.ts`(모달), `web/src/features/office/store/sidebar-store.ts`(사이드바)
- 폼: react-hook-form + Zod(한국어 메시지) — `web/src/features/auth/schema/auth.schema.ts`

### 주의

- `web/src/features/auth/lib/mock-auth-api.ts` — 프론트 인증이 아직 mock API 사용(실 API 미연동)
- `web/src/components/ui/rich-text-editor.tsx` — 미커밋 신규 Tiptap 에디터(ADR `.forge/adr/0007-tiptap-default-rich-text-editor.md`), `members.tsx`의 구성원 메모에 사용
