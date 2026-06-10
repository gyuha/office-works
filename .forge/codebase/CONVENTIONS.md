---
last_mapped_commit: 7813838ac56097621569a9ce37a8afe4f10f0b54
mapped: 2026-06-11
---

# 코드 컨벤션 (CONVENTIONS)

API(`api/`)와 웹(`web/`)의 실제 코드에서 확인된 스타일·패턴만 기록한다.

## API (`api/`)

### 정적 분석 — ruff + mypy strict

설정은 모두 `api/pyproject.toml`에 있다.

- **ruff**: `line-length = 100`, `target-version = "py312"`, 포맷은 double quote + space indent + LF (`[tool.ruff.format]`). lint select는 `E,W,F,I,N,UP,B,C4,SIM,ANN,S,T20,PT,RUF` — 타입 어노테이션(`ANN`), 보안(`S` bandit), print 금지(`T20`), pytest 스타일(`PT`)까지 강제한다. `B008`은 ignore(FastAPI `Depends` 기본값 호출 패턴 허용). `tests/**`, `alembic/**`, `scripts/**`에는 per-file-ignores로 완화 적용.
- **mypy**: `strict = true`, `python_version = "3.14"`, 플러그인 `pydantic.mypy` + `sqlalchemy.ext.mypy.plugin`. 완화 항목은 `disallow_any_generics = false`, `warn_return_any = false` 두 개뿐. langchain/litellm/passlib 등 스텁 없는 라이브러리는 `ignore_missing_imports` override.
- 실행: `task lint`(ruff check + mypy), `task format`, `task typecheck` (`api/Taskfile.yml`).

### 레이어 구조와 모듈 관례

`api/src/`는 flat 레이아웃(`PYTHONPATH=src`, 톱레벨 패키지 prefix 없음). 도메인마다 동일한 레이어를 반복한다 — 예: `api/src/domains/users/`의 `router/`, `service/`, `repository/`, `schemas/` 하위 패키지.

```
router → service → repository → models
schemas (Pydantic v2 DTO)
```

- 모든 모듈은 `from __future__ import annotations`로 시작하고 모듈 docstring을 가진다(예: `api/src/domains/users/router/user_router.py`는 라우트 표를 docstring에 명시).
- 파일 내 구획은 `# ---------------------------------------------------------------------------` 주석 + 섹션 제목으로 나눈다(코드베이스 전반에서 일관).

### Pydantic v2 스키마 (`schemas/`)

DTO는 도메인별 `schemas/` 모듈에 둔다(예: `api/src/domains/users/schemas/user_schemas.py`).

- 네이밍: `XxxCreate`(생성 요청) / `XxxUpdate`(부분 업데이트, 전 필드 optional) / `XxxResponse`(단건) / `XxxListResponse`(페이지네이션 envelope) / `XxxStatsResponse`(통계) — 해당 파일 docstring에 명문화돼 있다.
- 입력 정규화는 `@field_validator(..., mode="before")`로 처리: email은 `strip().lower()`, 필수 텍스트는 strip 후 빈 문자열 거부(`user_schemas.py`의 `normalize_email`, `strip_required_text`).
- 제약은 `Field(min_length=..., max_length=...)`로 선언적으로 건다.

### 비동기 일관성

핸들러·서비스·리포지토리는 전부 `async def`. DB는 SQLAlchemy 2.0 async(`AsyncSession` + asyncpg). 동기 드라이버(psycopg2)는 Alembic 전용(`DATABASE_URL_SYNC`).

### DI — FastAPI `Depends` + 생성자 주입

라우터마다 `_get_service` 헬퍼가 세션을 받아 서비스를 per-request로 조립한다 (`api/src/domains/users/router/user_router.py:53`):

```python
async def _get_service(
    session: AsyncSession = Depends(get_async_session),
) -> UserDirectoryService:
    return UserDirectoryService(UserDirectoryRepository(session))
```

인증 게이트는 두 단계: 읽기 엔드포인트는 `Depends(get_current_user)`, 쓰기 엔드포인트는 추가로 `dependencies=[Depends(require_permission("users:write"))]` (둘 다 `api/src/domains/auth/security.py`). 정적 경로(`/me`, `/stats`, `/export`)는 `/{user_id}`보다 먼저 선언해 섀도잉을 피한다.

### 에러 처리 — `AppError` 계층

`api/src/core/exceptions.py`에 정의. 응답 envelope나 `DOMAIN_NNN` 코드 체계는 **없다**.

- `AppError(message, status_code)`가 베이스. 서브클래스가 status code를 보유: `NotFoundError`(404), `ConflictError`(409), `UnauthorizedError`(401), `ForbiddenError`(403).
- 서비스 레이어가 raise → 라우터에서 변환. `user_router.py`는 `_app_error_to_http(exc)` 헬퍼로 `HTTPException(status_code=exc.status_code, detail=exc.message)`을 만든다. 라우터에서 `HTTPException` 직접 raise도 허용.
- `register_exception_handlers(app)`가 `HTTPException`/`RequestValidationError`/`Exception` 핸들러를 일괄 등록 — 응답은 `{"detail": ...}` JSON + `X-Correlation-ID` 헤더, 422는 Pydantic 에러를 `_sanitize_validation_errors`로 정리해 반환.

```
서비스: raise ConflictError(...) → 라우터 _app_error_to_http → HTTPException
                                          ↓
        register_exception_handlers → {"detail": ...} + X-Correlation-ID
```

### Prefixed string ID (최근 리팩토링 — 커밋 7813838)

`api/src/core/ids.py`. 모든 aggregate 테이블의 PK는 Stripe 스타일 `접두사_소문자ULID` 문자열이다 (예: `usr_01hx3k2m8q9v4t6w0y7z5b2c3d`).

- 접두사 상수가 한 곳에 모여 있다: `USER="usr"`, `ROLE="rol"`, `PERMISSION="prm"`, `REFRESH_TOKEN="rft"`, `EMAIL_VERIFICATION="evf"`, `PASSWORD_RESET="pwr"`, `OAUTH_ACCOUNT="oau"`, `CONVERSATION="cnv"`, `MESSAGE="msg"`, `POSITION="pos"`, `EMPLOYMENT_TYPE="emp"`, `GRADE="grd"`, `WORK_SETTINGS="wks"`, `LEAVE_SETTINGS="lvs"`, `COMPANY_INFO="cmp"`.
- 컬럼 폭은 `ID_LENGTH = 40` (String). 생성은 `generate_id(prefix)`, 모델 선언은 `id: Mapped[str] = id_column(USER)` (예: `api/src/domains/auth/models/auth_models.py:167`, `api/src/domains/chat/models/chat_models.py:43`).

### 설정·로깅

- 설정은 pydantic-settings `Settings`(`api/src/core/config.py`), `get_settings()`는 `@lru_cache(maxsize=1)`. LLM 설정은 `LLM_` prefix.
- 로깅은 structlog — `logger = structlog.get_logger(__name__)` 패턴, JSON 구조적 로깅 + `correlation_id` 바인딩 (`api/src/main.py`, `api/src/domains/auth/router/auth_router.py` 등).

### Alembic

- 기존 리비전 수정 금지. 신규는 `task revision`(autogenerate).
- 리비전 id는 ≤32자 (`alembic_version.version_num`이 varchar(32) — `api/CLAUDE.md`에 명문화). 현재 리비전 파일은 `api/alembic/versions/`에 `0001_initial_schema` ~ `0011_user_memo` 형식으로 번호 prefix를 쓴다.

## 웹 (`web/`)

### Biome (`web/biome.json`)

- 포맷: space indent 2, `lineWidth: 100`, `quoteStyle: 'single'`, `trailingCommas: 'es5'`. `organizeImports` 활성.
- linter는 recommended 룰셋. ignore: `node_modules`, `dist`, `src/routeTree.gen.ts`, `src/client`(생성물).
- 실행: `pnpm lint` / `pnpm lint:fix` / `pnpm format` (`web/package.json`).

### 파일명 — kebab-case

전 영역 kebab-case (예: `web/src/features/auth/hooks/use-auth-mutation.ts`, `web/src/components/ui/alert-dialog.tsx`, `web/src/lib/api-client.ts`). features/auth는 역할 접미사 변형을 쓴다: `auth.schema.ts`, `auth.store.ts` (kebab-case + `.schema`/`.store` 점 접미사). office 쪽 스토어는 `sidebar-store.ts`처럼 하이픈 접미사 — 두 변형이 공존한다.

### 디렉토리 구조 (Feature-Sliced 변형)

- `web/src/routes/` — TanStack Router 파일 기반 라우팅 (`__root.tsx`, `_app/app.$screenId.tsx`, `auth/login.tsx` 등). `src/routeTree.gen.ts`는 생성물.
- `web/src/features/{domain}/` — `components/`, `hooks/`, `store/`, `schema/`, `types/`, `lib/` 슬라이스 (현재 `auth`, `office`).
- `web/src/components/ui/` — shadcn 스타일 프리미티브 (아래 참조).
- `web/src/stores/` — 전역 Zustand 스토어 (`modal-store.ts`).
- `web/src/providers/app-providers.tsx` — React Query 등 Provider 래핑.
- `web/src/client/` — **hey-api 생성물, 손편집 금지** (`web/openapi-ts.config.ts` 주석 + ADR-0004 `.forge/adr/0004-frontend-openapi-generated-client-heyapi.md`). 재생성은 루트 `Taskfile.yml`의 `task gen-api` (FastAPI OpenAPI export → codegen).
- path alias는 `@/*` → `./src/*` (`web/tsconfig.json`).

### UI 프리미티브 — cva + cn

`web/src/components/ui/`는 shadcn 스타일(`web/components.json`, style `base-nova`, Base UI + Radix 기반, 아이콘 lucide). variant는 `class-variance-authority`의 `cva`로 선언하고 클래스 병합은 `cn()`(`web/src/lib/utils.ts` — `clsx` + `tailwind-merge`)을 쓴다. 예: `web/src/components/ui/button.tsx`의 `buttonVariants = cva(...)` + `VariantProps`.

### 폼 검증 — Zod, 메시지는 한국어

`web/src/features/auth/schema/auth.schema.ts`:

```typescript
email: z.string().email('유효한 이메일 주소를 입력해주세요'),
```

react-hook-form + `@hookform/resolvers` 조합으로 사용한다.

### 상태 관리

- **서버 상태 = TanStack Query.** 변이 훅은 feature의 `hooks/`에 둔다(`web/src/features/auth/hooks/use-auth-mutation.ts` — `useMutation` + `onSuccess`에서 `navigate`/`toast`). API 연동 화면은 hey-api가 생성한 query options를 직접 import한다: `web/src/features/office/screens/members.tsx`가 `@/client/@tanstack/react-query.gen`에서 가져와 `useQuery`/`useMutation`/`useQueryClient`와 조합.
- **클라이언트 전역 상태 = Zustand.** `create<State>()(...)` 패턴, 영속화는 `persist` 미들웨어(`web/src/features/auth/store/auth.store.ts` — storage key `'om-auth'`). 셀렉터로 구독: `useAuthStore((state) => state.setUser)`.

### 주의

- `web/src/features/auth/lib/mock-auth-api.ts` — 프론트 인증은 아직 mock API를 호출한다(실 API 미연동).
- 토스트는 `sonner`(`toast.success('가입이 완료되었습니다!')`), 사용자 노출 문자열은 한국어.
