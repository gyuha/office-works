---
last_mapped_commit: 7813838ac56097621569a9ce37a8afe4f10f0b54
mapped: 2026-06-11
---

# INTEGRATIONS — 외부 서비스 / 연동 지점

백엔드가 통신하는 외부 시스템과, 프론트-백엔드 사이의 코드젠 계약을 정리한다. 시크릿 값은 환경변수 **이름**만 표기한다.

연동 전체 그림:

```
web (Vite:3000) ──hey-api fetch──▶ api (FastAPI:8000, /api/v1)
                                     ├─▶ PostgreSQL 17 (asyncpg / Alembic은 psycopg2)
                                     ├─▶ Redis 7 (토큰 블랙리스트·OAuth state 등)
                                     ├─▶ SMTP (dev=Mailpit:1025, prod=실서버)
                                     ├─▶ OAuth 프로바이더 (Google/Kakao/Naver/Microsoft)
                                     └─▶ LLM 프로바이더 (litellm 라우팅: openai/anthropic/gemini/azure/ollama)
```

## 1. PostgreSQL

- 컨테이너: `postgres:17-alpine` (`api/docker-compose.yml`), 호스트 바인딩 `127.0.0.1:5432`, named volume `postgres_data`, `pg_isready` healthcheck.
- 런타임 접근: SQLAlchemy 2.0 async + **asyncpg** (`api/src/core/database.py`의 `get_async_session`). DSN은 `DATABASE_URL` 또는 `POSTGRES_HOST`/`POSTGRES_PORT`/`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`에서 조립(`Settings.async_database_url`, `api/src/core/config.py`).
- 마이그레이션: Alembic은 **psycopg2** 동기 드라이버(`DATABASE_URL_SYNC` / `Settings.sync_database_url`). 리비전은 `api/alembic/versions/`(0001~0011; `0010_user_employment_type.py`·`0011_user_memo.py`는 미커밋 working tree 리비전).
- 시드: `api/scripts/seed.py`(`task seed`) — 조직설정 캐노니컬 데이터셋을 natural key 기준 idempotent upsert(`pg_insert ... on conflict` 사용). users/oauth_accounts/refresh_tokens는 시드 대상에서 제외.
- 프로덕션: `api/docker-compose.prod.yml`이 컨테이너 내부 통신용 DSN(`@postgres:5432`)을 environment로 강제 주입.

## 2. Redis

- 컨테이너: `redis:7-alpine` (`api/docker-compose.yml`), `127.0.0.1:6379`, named volume `redis_data`, `--save 60 1` 영속화.
- 클라이언트: `redis[hiredis]` async — `api/src/core/redis.py`의 `get_redis_client` / `get_redis_dep`(FastAPI `Depends`) / `close_redis_client`(lifespan). DSN은 `REDIS_URL` 또는 `REDIS_HOST`/`REDIS_PORT`/`REDIS_DB`(`Settings.redis_dsn`).
- 용도(코드 근거): JWT access 토큰 jti 블랙리스트(`api/src/domains/auth/service/auth_service.py`의 `blacklist_jti`), OAuth state, rate-limit, SSE fanout 용도로 의존성 선언(`api/pyproject.toml`의 redis 의존성 주석).
- 테스트는 **fakeredis** 스텁으로 대체(실 Redis 불필요, `integration` 마커 테스트 제외).

## 3. 이메일 — Mailpit(dev) / SMTP(prod)

- 발송 라이브러리: **fastapi-mail** — `Settings.mail_connection_config`(`api/src/core/config.py`)가 `ConnectionConfig` kwargs를 조립. 관련 env: `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_FROM_NAME`, `MAIL_STARTTLS`, `MAIL_SSL_TLS`. `MAIL_USERNAME`이 비어 있으면 `USE_CREDENTIALS=False`(Mailpit 익명 SMTP 대응).
- dev: `axllent/mailpit` 컨테이너(`api/docker-compose.yml`) — SMTP `127.0.0.1:1025`, 웹 UI `127.0.0.1:8025`, 메일은 SQLite(`MP_DATABASE`)로 영속.
- prod: mailpit 서비스는 `dev-tools` 프로파일로 제한되어 `--profile prod`에서 제외(`api/docker-compose.prod.yml`); 실제 SMTP 값은 `.env.prod`.
- 발송 로직: `api/src/domains/auth/email.py`(회원가입 이메일 인증, 비밀번호 재설정 — 재설정 링크 base는 `FRONTEND_RESET_CONFIRM_URL_BASE`).
- 라이브 검증 태스크: `task test-mailpit-signup`(`RUN_MAILPIT_INTEGRATION=1` 필요).

## 4. OAuth2 프로바이더

구현 위치: `api/src/domains/auth/oauth/` — 프로바이더별 모듈이 인가/토큰/유저인포 엔드포인트를 가진다. 콜백 경로는 `/api/v1/auth/oauth/{provider}/callback`. 토큰 교환 HTTP 클라이언트는 httpx.

| 프로바이더 | 모듈 | 외부 엔드포인트 | env (이름만) |
|-----------|------|----------------|--------------|
| Google | `api/src/domains/auth/oauth/google.py` | `accounts.google.com/o/oauth2/v2/auth`, `oauth2.googleapis.com/token`, `www.googleapis.com/oauth2/v3/userinfo` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Kakao | `api/src/domains/auth/oauth/kakao.py` | `kauth.kakao.com/oauth/authorize`, `kauth.kakao.com/oauth/token`, `kapi.kakao.com/v2/user/me` | `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI` |
| Naver | `api/src/domains/auth/oauth/naver.py` | `nid.naver.com/oauth2.0/authorize`, `nid.naver.com/oauth2.0/token`, `openapi.naver.com/v1/nid/me` | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_REDIRECT_URI` |
| Microsoft | `api/src/domains/auth/oauth/microsoft.py` | `login.microsoftonline.com/{tenant}/...` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `MICROSOFT_REDIRECT_URI` |

참고: 루트 `CLAUDE.md`는 Google/Kakao/Naver 3종만 언급하지만 코드와 `Settings`에는 Microsoft도 구현·설정되어 있다.

## 5. LLM 프로바이더 (`api/src/infra/llm/`)

- 단일 진입점: `api/src/infra/llm/provider_factory.py`의 `make_chat_litellm()` — 앱에서 `ChatLiteLLM()`을 호출하는 유일한 지점(테스트는 이 심볼을 패치). langchain-litellm 어댑터 경유로 litellm이 프로바이더 라우팅.
- 설정: `LLMSettings`(`api/src/core/config.py`, env prefix `LLM_`). `LLM_PROVIDER` 하나만 바꾸면 프로바이더 전환. `litellm_model` 프로퍼티가 `<provider>/<model>` 식별자를 조립(azure는 deployment명, ollama는 `api_base` + sentinel key).
- 지원 프로바이더와 env: openai(`OPENAI_API_KEY`), anthropic(`ANTHROPIC_API_KEY`), gemini(`GEMINI_API_KEY`), azure(`AZURE_OPENAI_API_KEY`/`AZURE_OPENAI_ENDPOINT`/`AZURE_OPENAI_DEPLOYMENT`/`AZURE_OPENAI_API_VERSION`), ollama(`OLLAMA_BASE_URL` — 키 불필요). 생성 파라미터: `LLM_DEFAULT_MODEL`, `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, `LLM_STREAMING`.
- 소비자: `domains/chat/` — 동기 응답 + sse-starlette 기반 SSE 토큰 스트리밍. 일시 오류 재시도는 tenacity.

## 6. 프론트엔드 ↔ 백엔드 — hey-api 생성 클라이언트

OpenAPI 스냅샷 기반 코드젠 계약(ADR-0004, `web/openapi-ts.config.ts` 주석):

```
FastAPI app.openapi() ──task gen-api──▶ api/openapi.json ──@hey-api/openapi-ts──▶ web/src/client/*
```

- 설정: `web/openapi-ts.config.ts` — input `../api/openapi.json`, output `web/src/client/`, 플러그인 `@hey-api/client-fetch`(runtimeConfigPath `./src/lib/hey-api`) + `@tanstack/react-query`.
- 생성물: `web/src/client/types.gen.ts`, `sdk.gen.ts`, `client.gen.ts`, `@tanstack/react-query.gen.ts` — **손편집 금지**, Biome ignore 대상. 재생성은 루트 `task gen-api`(export → codegen).
- 런타임 설정: `web/src/lib/hey-api.ts`의 `createClientConfig`가 `baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'` 주입. Bearer 토큰 첨부·401 처리는 `web/src/lib/api-client.ts`의 request/response 인터셉터.
- 주의: 프론트 인증 자체는 아직 `web/src/features/auth/lib/mock-auth-api.ts` mock 사용 중(`web/src/features/auth/hooks/use-auth-mutation.ts`에서 참조) — 실 인증 API 미연동. 반면 office 도메인 화면(`web/src/features/office/screens/members.tsx` 등)은 생성 클라이언트로 실 API를 호출한다.

## 7. Docker 인프라 정리

`api/docker-compose.yml`(base, local dev infra 전용) + `api/docker-compose.prod.yml`(prod overlay). 기동/대기는 `task infra` → `api/scripts/wait_for_services.sh`(healthcheck 폴링, 타임아웃 60s).

| 서비스 | 이미지 | 호스트 포트(모두 127.0.0.1) | 비고 |
|--------|--------|------------------------------|------|
| postgres | `postgres:17-alpine` | 5432 | volume `postgres_data` |
| redis | `redis:7-alpine` | 6379 | volume `redis_data` |
| mailpit | `axllent/mailpit:latest` | 1025(SMTP) / 8025(UI) | prod에서는 제외(`dev-tools` 프로파일) |
| app (prod 전용) | `api/Dockerfile` target `runtime` | 8000 | `--profile prod`에서만 정의/기동, `.env.prod` 사용 |

로컬 dev에서 FastAPI는 컨테이너가 아니라 호스트에서 `uv run uvicorn`(핫리로드)으로 실행되며, 인프라 3종만 컨테이너다. 헬스 체크 엔드포인트: `/health`(liveness), `/ready`(PostgreSQL+Redis+Mailpit readiness — `task ready`).
