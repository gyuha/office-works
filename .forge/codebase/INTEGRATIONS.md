---
last_mapped_commit: b8943aa32230936b80046e2f9b1a4dec458255df
mapped: 2026-06-05
---

# INTEGRATIONS

`office-works` API가 의존하는 외부 시스템과 연동 지점이다. 설정 소스는 `api/.env.example`(템플릿) + `api/src/core/config.py`(`Settings`/`LLMSettings`), 컨테이너 토폴로지는 `api/docker-compose.yml`(dev) + `api/docker-compose.prod.yml`(prod overlay)다.

> 시크릿 주의: `api/.env`는 실제 값을 담은 비예제 파일이다(디스크에 존재). 이 문서에는 어떤 키/토큰/비밀번호 값도 복사하지 않는다 — 값이 필요하면 `api/.env`를 직접 확인하라. `.env.example`은 모두 플레이스홀더다.

---

## 데이터베이스 — PostgreSQL

- 이미지 `postgres:17-alpine` (`api/docker-compose.yml`). dev 포트 바인딩 `127.0.0.1:${POSTGRES_PORT:-5432}:5432`, 볼륨 `postgres_data`, healthcheck `pg_isready`.
- 런타임 접근: SQLAlchemy 2.0 async + **asyncpg** (`postgresql+asyncpg://`). DSN은 `DATABASE_URL` 또는 `POSTGRES_*` 조합 → `Settings.async_database_url` (`api/src/core/config.py`). 엔진은 `api/src/core/database.py`.
- 마이그레이션 접근: Alembic + **psycopg2** (`postgresql+psycopg2://`). `DATABASE_URL_SYNC` 또는 `Settings.sync_database_url`. env.py(`api/alembic/env.py`)가 asyncpg DSN 감지 시 명시적 에러.
- 환경변수: `POSTGRES_HOST`/`PORT`/`USER`/`PASSWORD`/`DB`, `DATABASE_URL`, `DATABASE_URL_SYNC`.
- prod: `app` 컨테이너가 `POSTGRES_HOST: postgres`(서비스명) 사용, `DATABASE_URL`/`DATABASE_URL_SYNC`를 compose가 오버라이드 (`api/docker-compose.prod.yml`).
- 헬스 체크 `/ready`가 `SELECT 1`로 DB 연결 검증 (`api/src/main.py`).

## 캐시 / 상태 저장소 — Redis

- 이미지 `redis:7-alpine` (`api/docker-compose.yml`). dev 포트 `127.0.0.1:${REDIS_PORT:-6379}:6379`, 볼륨 `redis_data`, `redis-server --save 60 1`, healthcheck `redis-cli ping`.
- 클라이언트: `redis.asyncio` (`from_url`, `decode_responses=True`, `max_connections=20`, `api/src/core/redis.py`). 싱글톤, lifespan에서 warm-up ping.
- DSN: `REDIS_URL` 또는 `REDIS_HOST`/`PORT`/`DB` → `Settings.redis_dsn`.
- 용도(코드 확인):
  - JWT 블랙리스트 — 키 prefix `jwt:blacklist:` (`api/src/domains/auth/security.py`), 로그아웃 시 access jti를 token 만료까지 TTL 저장.
  - OAuth state nonce(CSRF) — 키 prefix `oauth:state:`, TTL 600초 (`api/src/domains/auth/router/auth_router.py`).
  - Rate limiting(slowapi), refresh 재사용 탐지, 일반 캐시, SSE fan-out(주석상 용도).
- prod: `app` 컨테이너가 `REDIS_HOST: redis`, `REDIS_URL: redis://redis:6379/${REDIS_DB}`.

## 인증 — JWT (자체 발급)

- python-jose, 알고리즘 HS256(`JWT_ALGORITHM`), 비밀키 `JWT_SECRET_KEY` (`api/src/domains/auth/security.py`).
- access TTL 15분(`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`), refresh TTL 7일(`JWT_REFRESH_TOKEN_EXPIRE_DAYS`).
- refresh 회전 + family revocation(재사용 공격 시 사용자 전체 세션 무효화). refresh는 DB `refresh_tokens`에 SHA-256 해시로 저장(원문 미저장).
- Bearer 헤더 전용(`HTTPBearer`), 쿠키 미사용. `get_current_user`가 서명/만료/type/블랙리스트/사용자 활성 검증.
- RBAC: `require_permission(key)` 의존성 팩토리, `User.has_permission`이 roles→permissions 순회 (예: chat 라우터가 `chat:write` 요구). 모델 `roles`/`permissions`/`role_permissions`/`user_roles` (`api/src/domains/auth/models/auth_models.py`).

## 인증 — 이메일 인증 / 비밀번호 재설정

- `email_verifications` / `password_resets` 테이블에 SHA-256 토큰 해시 저장(원문은 이메일로 발송). 가입 24h, 재설정 1h 만료(이메일 본문 기준).
- 검증 링크 base: `FRONTEND_URL` + `/auth/verify-email/{token}`. 재설정 링크 base: `FRONTEND_RESET_CONFIRM_URL_BASE`(`api/src/domains/auth/email.py`).
- 라우트: `/api/v1/auth/signup`, `/verify-email/{token}`, `/password-reset`, `/password-reset/confirm` (`api/src/domains/auth/router/auth_router.py`).

## 인증 — OAuth2 (Google / Kakao / Naver)

- 라우트: `GET /api/v1/auth/oauth/{provider}/login`, `GET /api/v1/auth/oauth/{provider}/callback`. state nonce는 Redis 저장 + 콜백 검증, 콜백 후 자체 JWT 발급(`oauth_provision_user`). 연동 신원은 `oauth_accounts` 테이블(provider + provider_user_id 유니크).
- 어댑터는 httpx로 토큰 교환/유저인포 호출. callback에서 naver만 `exchange_code(code, state)`(state 필요), 나머지는 `exchange_code(code)`.

| Provider | Auth URL | Token URL | UserInfo URL | env 자격증명 | 어댑터 |
|----------|----------|-----------|--------------|--------------|--------|
| Google | `accounts.google.com/o/oauth2/v2/auth` | `oauth2.googleapis.com/token` | `www.googleapis.com/oauth2/v3/userinfo` | `GOOGLE_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI` | `api/src/domains/auth/oauth/google.py` |
| Kakao | `kauth.kakao.com/oauth/authorize` | `kauth.kakao.com/oauth/token` | `kapi.kakao.com/v2/user/me` | `KAKAO_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI` | `api/src/domains/auth/oauth/kakao.py` |
| Naver | `nid.naver.com/oauth2.0/authorize` | `nid.naver.com/oauth2.0/token` | `openapi.naver.com/v1/nid/me` | `NAVER_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI` | `api/src/domains/auth/oauth/naver.py` |

- Google 스코프 `openid email profile`, `access_type=offline`, `prompt=consent`.
- 콜백 redirect URI 기본 패턴(.env.example): `http://localhost:8000/api/v1/auth/oauth/{provider}/callback`.
- 어댑터 매핑/지원 목록 검증: `_get_oauth_adapter`(`api/src/domains/auth/router/auth_router.py`) — 미지원 provider는 400.

## 메일 — Mailpit (dev) / SMTP (prod)

- dev: `axllent/mailpit:latest` (`api/docker-compose.yml`). SMTP `127.0.0.1:${MAILPIT_SMTP_PORT:-1025}:1025`, Web UI `127.0.0.1:${MAILPIT_UI_PORT:-8025}:8025`. `MP_SMTP_AUTH_ACCEPT_ANY=1`, `MP_SMTP_AUTH_ALLOW_INSECURE=1`, SQLite 영속(`/data/mailpit.db`), healthcheck `/mailpit readyz`.
- 발송: fastapi-mail `ConnectionConfig`/`FastMail`/`MessageSchema` (plain text) (`api/src/domains/auth/email.py`). 설정 조립 `Settings.mail_connection_config` — `USE_CREDENTIALS`는 username 존재 시에만, `VALIDATE_CERTS`는 TLS 활성 시에만.
- env: `MAIL_SERVER`(dev=localhost)/`MAIL_PORT`(dev=1025)/`MAIL_USERNAME`/`MAIL_PASSWORD`/`MAIL_FROM`/`MAIL_FROM_NAME`/`MAIL_STARTTLS`/`MAIL_SSL_TLS`.
- prod: mailpit은 `dev-tools` 프로파일로 제한되어 `--profile prod`에서 제외. `app` 컨테이너가 실제 SMTP(`MAIL_SERVER`/`MAIL_PORT`/`MAIL_STARTTLS` 기본 `smtp.office-works.local:587/true`)로 교체 (`api/docker-compose.prod.yml`).
- `/ready` 헬스 체크가 SMTP 220 배너로 Mailpit 도달성 검증 (`api/src/main.py`).

## LLM 프로바이더 (OpenAI / Anthropic / Gemini / Azure / Ollama)

- 단일 스위치 `LLM_PROVIDER`로 런타임 선택. 추상화: langchain-litellm `ChatLiteLLM`. 유일 생성 지점 `make_chat_litellm`(`api/src/infra/llm/provider_factory.py`), kwargs 조립 `LLMSettings.as_litellm_kwargs`(`api/src/core/config.py`).
- 모델 식별자 형식 `<provider>/<model>`(`LLMSettings.litellm_model`). azure는 `azure/<deployment>`(deployment 없으면 default_model).
- 공통 파라미터: `LLM_DEFAULT_MODEL`, `LLM_TEMPERATURE`(0.0~2.0, 기본 0.7), `LLM_MAX_TOKENS`(기본 2048), `LLM_STREAMING`(기본 true).
- provider enum 검증: `LLMProvider`(openai/anthropic/gemini/azure/ollama), 미지원 값은 명시적 ValueError.

| Provider | env 자격증명 / 엔드포인트 | 비고 |
|----------|---------------------------|------|
| OpenAI(기본) | `OPENAI_API_KEY` | `LLM_DEFAULT_MODEL=gpt-4o-mini` 예시 |
| Anthropic | `ANTHROPIC_API_KEY` | claude 모델 |
| Gemini | `GEMINI_API_KEY` | `gemini/<model>` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY`/`_ENDPOINT`/`_DEPLOYMENT`/`_API_VERSION`(기본 2024-08-01-preview) | `api_base`+`api_version` 전달 |
| Ollama | `OLLAMA_BASE_URL`(기본 `http://localhost:11434`) | API 키 불필요, `api_key="ollama"` sentinel |

- Chat 엔드포인트(`api/src/domains/chat/router/chat_router.py`, prefix `/api/v1/chat`):
  - `POST /chat/complete` — 비스트리밍 완성.
  - `POST /chat/stream` — SSE 스트리밍(sse-starlette `EventSourceResponse`, `[DONE]` sentinel, `event: error`).
  - `GET /chat/provider` — 활성 provider/model 메타(LLM 호출 없음).
  - `POST /chat/conversations`, `GET /chat/conversations`, `GET /chat/conversations/{id}`, `GET .../messages`, `POST .../messages`(SSE + DB 영속, 인증 + `chat:write` 권한). 첫 턴에 LLM로 제목 자동 생성(`_auto_title`).
- 대화/메시지 영속: `conversations`/`messages` 테이블 (`api/src/domains/chat/models/chat_models.py`).

## HTTP / 상관관계 추적

- `CorrelationIdMiddleware`(`api/src/core/middleware.py`) — 요청별 correlation id 생성/바인딩, 응답 헤더 `X-Correlation-ID`(CORS `expose_headers`로 노출).
- CORS: `CORS_ORIGINS`(JSON 배열 또는 콤마구분) → `Settings.cors_origins_list`. `allow_credentials=True`, methods/headers `*`.

## 웹훅

- 인바운드/아웃바운드 웹훅 엔드포인트는 발견되지 않음. 외부 연동은 OAuth provider HTTP 호출과 LLM provider 호출(litellm)에 한정.

## 헬스 / 레디니스

- `GET /health` — `{"status":"ok","env":...}` (Docker HEALTHCHECK, 로드밸런서용).
- `GET /ready` — Postgres(`SELECT 1`) + Redis(ping) + Mailpit(SMTP 220 배너) 실연결 검증, 실패 시 503.

## 컨테이너 토폴로지

- dev (`api/docker-compose.yml`, 모두 `127.0.0.1` 바인딩): postgres 5432, redis 6379, mailpit SMTP 1025 / UI 8025. FastAPI 앱은 컨테이너가 아닌 호스트에서 `uv run uvicorn`(핫리로드)로 실행.
- prod (`api/docker-compose.yml` + `api/docker-compose.prod.yml`, `--profile prod`): postgres + redis + `app`(Dockerfile `runtime` 타겟). mailpit 제외, `restart: always`, `env_file: .env.prod`, 컨테이너 간 서비스명 통신, `app` healthcheck `curl /health`.

## 프론트엔드 → 백엔드 연동 상태

- 현재 **미연동**. 프론트엔드 인증은 mock API(`web/src/features/auth/lib/mock-auth-api.ts`)를 사용 — `setTimeout` 지연 + 하드코딩 분기(`fail@example.com`/`taken@example.com`)로 응답을 시뮬레이션하며 실제 HTTP 호출이 없다.
- React Query Provider만 구성됨(`web/src/providers/app-providers.tsx`, `QueryClientProvider`). API base URL/HTTP 클라이언트 설정은 발견되지 않음. dev 서버 포트 3000(`web/vite.config.ts`).
