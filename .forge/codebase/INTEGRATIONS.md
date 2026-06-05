---
last_mapped_commit: 5c5103df2b3695a9b8bd62b9c5701f2988b8e0ab
mapped: 2026-06-05
---

# 외부 통합 (Integrations)

## 데이터베이스

### PostgreSQL

**위치**: Docker 컨테이너 (docker-compose.yml)

**접근**:
- **로컬 개발**: `postgresql+asyncpg://app:app@localhost:5432/app_db` (asyncpg 드라이버)
- **Alembic 마이그레이션**: `postgresql+psycopg2://app:app@localhost:5432/app_db` (psycopg2)
- 환경변수: `DATABASE_URL` (async), `DATABASE_URL_SYNC` (Alembic)
- 대체: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB 조합

**마이그레이션**:
- 파일: `api/alembic/` (env.py, alembic.ini, versions/)
- 현재 버전: 1개 (`0001_initial_schema.py`)
- 명령어: `task migrate` (upgrade head), `task revision` (autogenerate)
- SQLAlchemy + Alembic (RBAC 미구현)

---

## 캐시 & 메시지 브로커

### Redis

**위치**: Docker 컨테이너 (docker-compose.yml)

**접근**:
- **URL**: `redis://localhost:6379/0` (기본값)
- 환경변수: `REDIS_URL` 또는 REDIS_HOST, REDIS_PORT, REDIS_DB 조합
- 라이브러리: redis-py >= 5.2.0 (async, hiredis 최적화)

**용도**:
1. **JWT 블랙리스트**: 로그아웃 토큰 무효화 (jti 키, TTL = token expiry)
2. **리프레시 토큰 재사용 탐지**: 부정 로그인 방지 (Redis key/value 저장)
3. **OAuth 상태 nonce**: 임시 저장 (짧은 TTL)
4. **레이트 제한**: slowapi Redis 백엔드 (per-user / per-IP)
5. **일반 캐시**: 애플리케이션 캐싱
6. **SSE fan-out**: 실시간 메시지 pub/sub 채널

**접근 코드**:
- `api/src/core/redis.py` — Redis 싱글톤 클라이언트 (`get_redis_client()`, `get_redis_dep`)
- DI: FastAPI `Depends(get_redis_dep)` 또는 `await get_redis_client()`

**헬스 체크**:
- Startup: `lifespan` 컨텍스트에서 `redis.ping()` 호출
- Readiness: `/ready` 엔드포인트 Redis 상태 확인

---

## 인증 및 OAuth

### OAuth2 제공자

#### Google

**설정 파일**: `api/src/domains/auth/oauth/google.py`

**환경변수**:
- `GOOGLE_CLIENT_ID`: Google Cloud 프로젝트 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: 클라이언트 시크릿
- `GOOGLE_REDIRECT_URI`: http://localhost:8000/api/v1/auth/oauth/google/callback

**흐름**:
1. 프론트엔드가 Google 로그인 시작
2. 백엔드 라우터: GET `/api/v1/auth/oauth/google` → Google authz 엔드포인트로 리디렉트
3. Google 콜백 → GET `/api/v1/auth/oauth/google/callback?code=...&state=...`
4. 백엔드: 토큰 교환, 사용자 프로필 조회, User 레코드 생성/업데이트
5. JWT 반환 (access + refresh)

**통합 코드**:
- 라우터: `api/src/domains/auth/router/` (google.py)
- 서비스: `api/src/domains/auth/service/auth_service.py` (oauth_login 메서드)
- 리포지토리: `api/src/domains/auth/repository/auth_repository.py`

#### Kakao

**설정 파일**: `api/src/domains/auth/oauth/kakao.py`

**환경변수**:
- `KAKAO_CLIENT_ID`: REST API 키 (https://developers.kakao.com/console/app)
- `KAKAO_CLIENT_SECRET`: 클라이언트 시크릿
- `KAKAO_REDIRECT_URI`: http://localhost:8000/api/v1/auth/oauth/kakao/callback

**흐름**: Google과 동일 (Kakao 엔드포인트 사용)

#### Naver

**설정 파일**: `api/src/domains/auth/oauth/naver.py`

**환경변수**:
- `NAVER_CLIENT_ID`: Naver 앱 클라이언트 ID (https://developers.naver.com/apps/#/list)
- `NAVER_CLIENT_SECRET`: 클라이언트 시크릿
- `NAVER_REDIRECT_URI`: http://localhost:8000/api/v1/auth/oauth/naver/callback

**흐름**: Google과 동일 (Naver 엔드포인트 사용)

### OAuth 상태 관리

**위치**: `api/src/domains/auth/oauth/` 각 제공자 모듈

**Redis 저장소**:
- 키 패턴: `oauth_state:{state_value}` (short TTL, 예: 5분)
- 용도: CSRF 방지, 상태 검증

---

## 메일

### SMTP 서버

**로컬 개발**:
- **Mailpit** (Docker)
- SMTP 포트: `localhost:1025`
- 웹 UI: `http://localhost:8025` (발송된 메일 확인)
- 설정: MAIL_USERNAME/PASSWORD 불필요 (익명 SMTP)

**프로덕션**:
- 환경변수로 실제 SMTP 서버 주입:
  - `MAIL_SERVER`: smtp.provider.com
  - `MAIL_PORT`: 587 또는 465
  - `MAIL_USERNAME`: apikey 또는 이메일
  - `MAIL_PASSWORD`: API 키 또는 비밀번호
  - `MAIL_STARTTLS`: true (포트 587)
  - `MAIL_SSL_TLS`: false (STARTTLS 사용 시)
- 프로덕션 설정 파일: `api/.env.prod.example`

**라이브러리**:
- fastapi-mail >= 1.4.2
- `api/src/domains/auth/email.py` — 템플릿 & 발송 로직

**사용 사례**:
1. **이메일 인증**: 회원가입 후 검증 링크 발송
2. **비밀번호 재설정**: 재설정 토큰 및 링크 메일 발송

**환경변수**:
- `MAIL_SERVER`: localhost (개발) 또는 SMTP 호스트 (프로덕션)
- `MAIL_PORT`: 1025 (Mailpit) 또는 587/465 (SMTP)
- `MAIL_USERNAME`: "" (Mailpit) 또는 apikey (프로덕션)
- `MAIL_PASSWORD`: "" (Mailpit) 또는 API 키 (프로덕션)
- `MAIL_FROM`: noreply@office-works.example.com
- `MAIL_FROM_NAME`: Office Works
- `MAIL_STARTTLS`: false (Mailpit) 또는 true (SMTP)
- `MAIL_SSL_TLS`: false (개발)

**접근 코드**:
- 설정: `api/src/core/config.py` (Settings.mail_connection_config)
- 서비스: `api/src/domains/auth/email.py`

---

## LLM 제공자

### 다중 제공자 지원 (LangChain + LiteLLM)

**아키텍처**:
- 인프라 레이어: `api/src/infra/llm/provider_factory.py` (`make_chat_litellm()`)
- 도메인 인터페이스: `api/src/domains/chat/ports.py` (LLMClientProtocol)
- 서비스: `api/src/domains/chat/service/chat_service.py`

**환경변수**:
- `LLM_PROVIDER`: openai | anthropic | gemini | azure | ollama
- `LLM_DEFAULT_MODEL`: 모델 식별자 (예: gpt-4o-mini, claude-3-5-sonnet-20241022)
- `LLM_TEMPERATURE`: 0.0–2.0 (기본값 0.7)
- `LLM_MAX_TOKENS`: 최대 출력 토큰 (기본값 2048)
- `LLM_STREAMING`: true | false (SSE 스트리밍 활성화, 기본값 true)

### OpenAI (기본값)

**환경변수**:
- `LLM_PROVIDER=openai`
- `LLM_DEFAULT_MODEL=gpt-4o-mini`
- `OPENAI_API_KEY=sk-...`

**모델 문자열**: `openai/gpt-4o-mini`

**통합 코드**:
- `api/src/core/config.py` (LLMSettings, as_litellm_kwargs 메서드)
- `api/src/infra/llm/provider_factory.py` (ChatLiteLLM 생성)

### Anthropic

**환경변수**:
- `LLM_PROVIDER=anthropic`
- `LLM_DEFAULT_MODEL=claude-3-5-sonnet-20241022`
- `ANTHROPIC_API_KEY=sk-ant-...`

**모델 문자열**: `anthropic/claude-3-5-sonnet-20241022`

### Google Gemini

**환경변수**:
- `LLM_PROVIDER=gemini`
- `LLM_DEFAULT_MODEL=gemini-1.5-flash`
- `GEMINI_API_KEY=AIza...`

**모델 문자열**: `gemini/gemini-1.5-flash`

### Azure OpenAI

**환경변수**:
- `LLM_PROVIDER=azure`
- `LLM_DEFAULT_MODEL=gpt-4o` (배포명이 비어있을 경우 폴백)
- `AZURE_OPENAI_API_KEY=...`
- `AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/`
- `AZURE_OPENAI_DEPLOYMENT=my-deployment-name`
- `AZURE_OPENAI_API_VERSION=2024-08-01-preview`

**모델 문자열**: `azure/my-deployment-name` (배포명)

### Ollama (로컬)

**환경변수**:
- `LLM_PROVIDER=ollama`
- `LLM_DEFAULT_MODEL=llama3.2`
- `OLLAMA_BASE_URL=http://localhost:11434`
- API 키 불필요

**모델 문자열**: `ollama/llama3.2`

---

## 스트리밍 & WebSocket

### Server-Sent Events (SSE)

**라이브러리**: sse-starlette >= 2.1.0

**용도**: LLM 채팅 스트리밍 응답

**엔드포인트**:
- POST `/api/v1/chat/stream` — 스트리밍 응답 (Content-Type: text/event-stream)

**구현**:
- 라우터: `api/src/domains/chat/router/chat_router.py`
- 서비스: `api/src/domains/chat/service/chat_service.py`

---

## 구조적 로깅

### structlog

**라이브러리**: structlog >= 24.4.0

**포맷**:
- 개발: `LOG_FORMAT=console` (인간 친화적)
- 프로덕션: `LOG_FORMAT=json` (머신 파싱 가능)

**레벨**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- 환경변수: `LOG_LEVEL` (기본값 INFO)

**바인딩**:
- `correlation_id`: 모든 요청 추적 (CorrelationIdMiddleware)
- 커스텀 필드: service, action, status 등

**설정 파일**:
- `api/src/core/logging.py` (configure_logging 함수)
- `api/src/core/middleware.py` (CorrelationIdMiddleware)

**접근**:
```python
import structlog
logger = structlog.get_logger(__name__)
logger.info("message", key="value")  # JSON 또는 console 형식
```

---

## 레이트 제한

### slowapi

**라이브러리**: slowapi >= 0.1.9

**백엔드**: Redis (redis-py)

**키 함수**: authenticated user ID (user:{id}) 또는 remote IP

**설정**:
- `api/src/main.py` (Limiter 정의, _get_user_key 함수)
- 라우터에서 `@limiter.limit("...")`로 per-route 적용

---

## 헬스 체크

### 엔드포인트

1. **라이브니스**: GET `/health`
   - 응답: `{"status": "alive"}`
   - 즉시 응답 (의존성 확인 안 함)

2. **레디니스**: GET `/ready`
   - 응답: `{"status": "ready", "postgres": "ok", "redis": "ok"}`
   - PostgreSQL + Redis 연결 확인

**구현**:
- 라우터: `api/src/domains/shared/router/` 또는 main.py

**Docker HEALTHCHECK**:
- Dockerfile HEALTHCHECK: `curl -f http://localhost:${PORT}/health || exit 1`
- Interval: 30s, Timeout: 10s, Retries: 3, Start Period: 30s

---

## 프론트엔드 API 클라이언트 (현황)

**상태**: Mock API 사용 중 (실제 API 미연동)

**파일**: `web/src/features/auth/lib/mock-auth-api.ts`

**마이그레이션 필요**:
- 실제 백엔드 API 엔드포인트 호출로 전환
- TanStack Query 쿼리 설정 (useAuthMutation)
- 에러 처리, 토큰 관리, 리디렉션 로직 구현

---

## 환경별 구성

### 개발 (Local)

**파일**: `.env.example` 복사 후 수정

**인프라**:
- Postgres + Redis + Mailpit (Docker)
- FastAPI 호스트 실행 (uv run uvicorn)

**명령어**: `task dev`

### 프로덕션

**파일**: `.env.prod.example` 복사 후 수정

**인프라**:
- Postgres + Redis (Docker 또는 관리형 서비스)
- FastAPI 컨테이너 (docker-compose.prod.yml, --profile prod)
- Mailpit 제외 (실제 SMTP 서버 사용)

**명령어**: `task prod-up`

---

## CI/CD 고려사항

### Docker 빌드

**이미지 태그**: `office-works:latest` (dev) 또는 `office-works:prod` (production)

**빌드 명령어**:
```bash
docker build --target runtime -t office-works:prod \
  --build-arg PYTHON_VERSION="3.12" .
```

### 마이그레이션

**프로덕션 컨테이너**:
```bash
docker run --rm --env-file .env.prod office-works:latest \
  /runtime-venv/bin/alembic upgrade head
```

### 테스트

**로컬**: `task test` (pytest, 커버리지 70% 강제)

**CI**: pre-commit hooks (ruff, mypy) + pytest (asyncio, markers)

---

## 시크릿 관리

**파일**:
- `.env.example` (템플릿, 안전함)
- `.env` (로컬 개발용, .gitignore)
- `.env.prod` (프로덕션용, .gitignore)
- `.env.prod.example` (템플릿)

**스캔 도구**:
- detect-secrets >= 1.5.0 (pre-commit hook)
- 기준선: `.secrets.baseline`

**주요 시크릿**:
- SECRET_KEY, JWT_SECRET_KEY (openssl rand -hex 32)
- POSTGRES_PASSWORD, REDIS credentials (필요시)
- OAuth 클라이언트 시크릿 (Google, Kakao, Naver)
- LLM API 키 (OpenAI, Anthropic, Gemini, Azure 등)
- MAIL_PASSWORD (SMTP)

