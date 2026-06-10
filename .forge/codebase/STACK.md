---
last_mapped_commit: 7813838ac56097621569a9ce37a8afe4f10f0b54
mapped: 2026-06-11
---

# STACK — 기술 스택

FastAPI 백엔드(`api/`) + React SPA(`web/`) 모노레포. 루트 `Taskfile.yml`이 두 패키지를 오케스트레이션한다(`task api:*`, `task web:*`, 통합 `task gen-api` 등).

## 언어 / 런타임

| 영역 | 언어/런타임 | 근거 |
|------|------------|------|
| 백엔드 | Python **3.14** (`requires-python = ">=3.14"`) | `api/pyproject.toml` |
| 프론트엔드 | TypeScript 5.9.3 (lock 기준) / Node `>=18.17.0` | `web/package.json`, `web/pnpm-lock.yaml` |
| 패키지 매니저 | 백엔드 **uv** (`api/uv.lock`), 프론트 **pnpm 10.28.2** (`packageManager` 필드) | `api/pyproject.toml`, `web/package.json` |

참고: `api/Dockerfile`의 기본 `PYTHON_VERSION=3.14`이지만, `api/Taskfile.yml`의 `prod-build`와 `api/docker-compose.prod.yml`의 app 빌드는 `PYTHON_VERSION: "3.12"`를 넘긴다(로컬 개발 핀과 프로덕션 이미지 버전이 불일치). Ruff `target-version`도 `py312`다.

## 백엔드 프레임워크 / 핵심 의존성 (`api/pyproject.toml`, 버전은 uv.lock 해석값)

- **FastAPI** `fastapi[standard]>=0.115.0` (lock: 0.136.1) + **uvicorn** `>=0.30.0` (lock: 0.46.0) — 앱 팩토리는 `api/src/main.py`, 라우터는 `/api/v1` prefix
- **Pydantic v2** `>=2.9.0` (lock: 2.12.5) + **pydantic-settings** `>=2.5.0` (lock: 2.14.1) + `email-validator`
- **SQLAlchemy 2.0 async** `sqlalchemy[asyncio]>=2.0.36` (lock: 2.0.49) + **Alembic** `>=1.14.0` (lock: 1.18.4)
  - 런타임 드라이버: **asyncpg** `>=0.30.0` (lock: 0.31.0) / Alembic 전용 동기 드라이버: **psycopg2-binary** (lock: 2.9.12)
  - **python-ulid** `>=2.7.0` (lock: 3.1.0) — prefix 문자열 PK용 k-sortable ID (`api/src/core/ids.py`)
- 인증/보안: **python-jose[cryptography]** (JWT HS256), **passlib[argon2]** + **argon2-cffi** (비밀번호 해시)
- **redis[hiredis]** `>=5.2.0` (lock: 7.4.0) — JWT 블랙리스트, rate-limit, OAuth state 등 (`api/src/core/redis.py`)
- **httpx** `>=0.27.0` — OAuth 토큰/유저인포 교환용 HTTP 클라이언트
- **fastapi-mail** `>=1.4.2` (lock: 1.6.4) — 이메일 발송 (dev=Mailpit)
- **structlog** (lock: 25.5.0) — JSON 구조적 로깅 + `correlation_id` 바인딩 (`api/src/core/logging.py`, `middleware.py`)
- **slowapi** `0.1.9` — rate limiting
- LLM/채팅: **sse-starlette** (lock: 3.4.2), **langchain** (lock: 1.2.18), **langchain-litellm** (lock: 0.5.1), **litellm** (lock: 1.83.14), **tenacity** (lock: 9.1.4) — 어댑터는 `api/src/infra/llm/provider_factory.py`

dev 그룹(`[dependency-groups].dev`, uv `default-groups`로 기본 설치): pytest 9 + pytest-asyncio + pytest-cov, **fakeredis** (lock: 2.35.1), **ruff** (lock: 0.15.12), **mypy** strict (lock: 2.0.0), pre-commit, detect-secrets, sqlalchemy[mypy]·types-passlib·types-python-jose 스텁.

## 백엔드 소스 구조

`api/src/`는 flat 레이아웃(`PYTHONPATH=src`로 `core`/`domains`/`infra`를 톱레벨 import; Taskfile이 env로 설정).

```
api/src/
├── main.py            # create_app 앱 팩토리, lifespan, /api/v1 라우터 등록
├── core/              # config.py, database.py, redis.py, exceptions.py, ids.py, logging.py, middleware.py
├── domains/
│   ├── auth/          # JWT+OAuth2+이메일 인증 (oauth/, security.py, email.py 포함)
│   ├── chat/          # LLM 채팅 (동기 + SSE 스트리밍)
│   ├── users/         # 사용자 디렉토리 (working tree: memo·employment_type 추가 중)
│   ├── org/           # 조직 설정 싱글톤 (work/leave/company) + positions/grades 등
│   └── shared/        # 도메인 공용 base 엔티티·이벤트·타입
└── infra/llm/         # provider_factory.py — ChatLiteLLM 생성 단일 지점
```

Alembic 리비전은 `api/alembic/versions/0001_initial_schema.py` ~ `0011_user_memo.py` 총 11개(`0010_user_employment_type.py`, `0011_user_memo.py`는 working tree에만 있는 미커밋 신규 리비전). 리비전 id는 32자 이하 제약(`alembic_version.version_num`이 varchar(32)).

## 프론트엔드 프레임워크 / 핵심 의존성 (`web/package.json`, 버전은 pnpm-lock 해석값)

- **React 19** (lock: 19.2.6) + **react-dom**
- **TanStack Router** `^1.95.0` (lock: 1.169.2) — 파일 기반 라우팅(`web/src/routes/`), `@tanstack/router-plugin`의 Vite 플러그인이 `web/src/routeTree.gen.ts` 생성 + `autoCodeSplitting`
- **TanStack Query** `^5.75.0` (lock: 5.100.9) — 서버 상태; hey-api 생성 `web/src/client/@tanstack/react-query.gen.ts`와 연동
- **TanStack Table** 8.21.3
- **Zustand** (lock: 5.0.13) + **immer** — 클라이언트 전역 상태 (`web/src/stores/`, feature별 `store/`)
- **Tailwind CSS v4** (lock: 4.3.0, `@tailwindcss/vite` 플러그인 방식) + `tw-animate-css`, `tailwind-merge`, `class-variance-authority`, `clsx` — shadcn 스타일 UI 프리미티브(`web/src/components/ui/`, `web/components.json`)
- **Radix UI / Base UI**: `radix-ui`, `@radix-ui/react-*`, `@base-ui/react`, `cmdk`, `lucide-react`, `sonner`
- **Tiptap v3** `@tiptap/react` + `@tiptap/starter-kit` 3.26.0 — 리치 텍스트 에디터(working tree 신규 `web/src/components/ui/rich-text-editor.tsx`; `.forge/adr/0007-tiptap-default-rich-text-editor.md`), sanitize는 `isomorphic-dompurify`
- 폼/검증: **react-hook-form** (lock: 7.75.0) + `@hookform/resolvers` + **Zod** (lock: 3.25.76, 에러 메시지 한국어)
- 기타: `i18next`/`react-i18next`, `date-fns`, `react-day-picker`, `recharts`, `motion`, `@faker-js/faker`(샘플 데이터), `@fontsource-variable/inter`
- **@hey-api/client-fetch** `0.13.1` — 생성된 API 클라이언트의 fetch 런타임

## 빌드 / 개발 도구

### 백엔드 — Task + uv

`api/Taskfile.yml`이 정식 진입점(`api/Justfile`은 동일 명령 미러). 주요 태스크: `dev`(install+infra+migrate+seed+uvicorn 핫리로드), `serve`, `infra`/`infra-down`, `test`/`test-unit`/`test-integration`, `lint`(ruff check + mypy), `format`, `typecheck`, `migrate`/`revision`/`downgrade`, `seed`(`api/scripts/seed.py` — idempotent upsert), `smoke-test`(`api/scripts/smoke_test.py`), `prod-up`/`prod-build` 등.

- **Ruff**: line-length 100, double quotes, lint 셀렉트 E/W/F/I/N/UP/B/C4/SIM/ANN/S/T20/PT/RUF (`api/pyproject.toml [tool.ruff]`)
- **mypy**: `strict = true`, `python_version = 3.14`, pydantic·sqlalchemy 플러그인
- **pytest**: `asyncio_mode = auto`, 마커 `unit`/`integration`/`e2e` + `--strict-markers`, 커버리지 70% 강제(`--cov-fail-under=70`)
- pre-commit + detect-secrets(`task secrets-baseline`)

### 프론트엔드 — pnpm + Vite + Biome

- **Vite 6** (lock: 6.4.2, `web/vite.config.ts`) — 플러그인: `tanstackRouter`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths`. dev 서버 포트 3000
- 빌드: `pnpm build` = `tsc -b && vite build`, 타입체크 `pnpm typecheck` = `tsc --noEmit`
- **Biome 1.9.4** (`web/biome.json`): 2 spaces, lineWidth 100, single quotes, trailingCommas es5; `src/routeTree.gen.ts`·`src/client`(생성물)은 ignore
- 코드젠: `@hey-api/openapi-ts` 0.98.1 (`web/openapi-ts.config.ts`) — 루트 `task gen-api`로 실행

빌드 흐름:

```
[api] FastAPI app.openapi() → api/openapi.json → [web] hey-api codegen → web/src/client/* (손편집 금지)
```

## 설정 방식 (Configuration)

- **pydantic-settings** 기반 단일 `Settings` 클래스(`api/src/core/config.py`) — `.env` 파일 로드(`cp .env.example .env`), `get_settings()`가 `lru_cache` 싱글톤. 모듈 레벨 `settings` 싱글톤도 export.
- LLM 설정은 별도 `LLMSettings`(env prefix `LLM_`; provider 자격증명은 alias로 prefix 없는 `OPENAI_API_KEY` 등). `settings.llm.as_litellm_kwargs()`가 `ChatLiteLLM` kwargs를 조립.
- 파생 프로퍼티: `async_database_url`(asyncpg DSN), `sync_database_url`(psycopg2 DSN — Alembic), `redis_dsn`, `cors_origins_list`(JSON 배열·콤마 구분 둘 다 허용), `mail_connection_config`(fastapi-mail kwargs).
- 시크릿류는 `SecretStr` 타입. 환경 구분은 `APP_ENV`(development/staging/production) enum.
- 프론트는 `import.meta.env.VITE_API_BASE_URL` 단일 환경변수(기본 `http://localhost:8000`) — `web/src/lib/hey-api.ts`.
- 프로덕션은 `.env.prod` + `api/docker-compose.prod.yml` overlay(서비스명 기반 DSN을 environment로 강제 주입).

## 컨테이너 / 배포

- `api/Dockerfile` — multi-stage(uv-binary → builder → runtime), 런타임 이미지는 dev 도구 제외, uv.lock 기반 재현 빌드
- 로컬 dev는 앱을 호스트에서 `uv run uvicorn`으로 실행하고 인프라만 docker compose(`api/docker-compose.yml`)로 기동
- 프로덕션은 `--profile prod` + `api/docker-compose.prod.yml` overlay(app 서비스 정의는 prod overlay에만 존재, mailpit은 `dev-tools` 프로파일로 제외)
