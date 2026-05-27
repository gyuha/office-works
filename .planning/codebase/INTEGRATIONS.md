# External Integrations

**Analysis Date:** 2026-05-27

## APIs & External Services

**AI / LLM:**
- OpenAI - Chat completion via Spring AI
  - SDK/Client: `org.springframework.ai:spring-ai-starter-model-openai` (Spring AI 1.0.0)
  - Auth: `OPENAI_API_KEY` environment variable
  - Model: `gpt-4o-mini` (configured in `api/src/main/resources/application.yml`)
  - Entry point: `api/src/main/java/com/example/bootstrap/ai/application/service/AiChatService.java`
  - Controller: `api/src/main/java/com/example/bootstrap/ai/controller/AiChatController.java`
  - ChatClient bean: `api/src/main/java/com/example/bootstrap/global/config/AiConfig.java`

**Social OAuth2 (backend):**
- Google OAuth2 - Social login
  - Handler: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/GoogleOAuth2Handler.java`
  - Base class: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/AbstractOAuth2Handler.java`
- Kakao OAuth2 - Social login (Korean platform)
  - Handler: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/KakaoOAuth2Handler.java`
  - Shared response: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/AuthTokenResponse.java`
  - User info: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/SocialUserInfo.java`

## Data Storage

**Primary Database:**
- PostgreSQL 16 (Alpine) - Main relational store
  - R2DBC connection (reactive runtime): `R2DBC_URL` env var (default `r2dbc:postgresql://localhost:5432/bootstrap`)
  - JDBC connection (Flyway migrations + Spring Batch): `JDBC_URL` env var (default `jdbc:postgresql://localhost:5432/bootstrap`)
  - Credentials: `DB_USERNAME`, `DB_PASSWORD` env vars
  - R2DBC pool: initial 5, max 20, idle timeout 30m
  - JDBC HikariCP pool: max 5, min idle 2
  - ORM/Client: Spring Data R2DBC (reactive) + plain JDBC for Flyway/Batch
  - Config: `api/src/main/java/com/example/bootstrap/global/config/R2dbcConfig.java`, `JdbcConfig.java`
  - Docker image: `postgres:16-alpine` at port 5432 (see `api/docker-compose.yml`)

**Schema Migrations:**
- Flyway (JDBC-based, separate from R2DBC runtime)
  - Migration files: `api/src/main/resources/db/migration/`
  - V1: `V1__init.sql` - Initial schema
  - V2: `V2__batch_schema.sql` - Spring Batch metadata tables
  - Supports separate migration account: `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD` env vars
  - `clean-disabled: true` in all environments (safety guard)

**Caching / Session Store:**
- Redis 7 (Alpine) - JWT blacklist and application caching
  - Connection: `REDIS_HOST` + `REDIS_PORT` env vars (default `localhost:6379`)
  - Client: Spring Data Redis Reactive (Lettuce driver)
  - Pool: max-active 8, max-idle 8, min-idle 2, timeout 2000ms
  - Memory limit: 256MB with `allkeys-lru` eviction policy (Docker config)
  - Persistence: AOF enabled in Docker (`--appendonly yes`)
  - Utility: `api/src/main/java/com/example/bootstrap/global/cache/RedisCacheUtil.java`
  - JWT blacklist: `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtBlacklistService.java`
  - Docker image: `redis:7-alpine` at port 6379

**File Storage:**
- Local filesystem only — no external object storage (S3, GCS, etc.) detected

## Authentication & Identity

**Auth Provider:**
- Custom JWT implementation (no third-party auth provider like Auth0/Cognito)
  - Library: `io.jsonwebtoken:jjwt-api:0.12.6`
  - Secret: `JWT_SECRET` env var (minimum 32 chars required in production)
  - Access token expiry: 1800 seconds (30 minutes)
  - Refresh token expiry: 1,209,600 seconds (14 days)
  - Blacklist via Redis
  - Implementation: `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtTokenProvider.java`
  - Filter: `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java`
  - Properties: `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtProperties.java`

- Social login: Google + Kakao OAuth2 (see above)
  - Custom handler pattern via `AbstractOAuth2Handler`

**Password Hashing:**
- BCrypt (`BCryptPasswordEncoder`) — configured in `api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java`

**Frontend Auth State:**
- Zustand store: `web/src/features/auth/store/auth.store.ts`
- Currently uses mock API (`web/src/features/auth/lib/mock-auth-api.ts`) — real backend API integration pending
- Mutations: `web/src/features/auth/hooks/use-auth-mutation.ts`

## Monitoring & Observability

**Metrics Collection:**
- Micrometer + Prometheus registry
  - Endpoint: `GET /actuator/prometheus`
  - Config: `management.endpoints.web.exposure.include: health,info,prometheus` (production)
  - Prometheus scrape config: `api/docker/prometheus/prometheus.yml`
  - Docker image: `prom/prometheus:v2.53.0` at port 9090 (local compose)
  - Retention: 15 days

**Dashboards:**
- Grafana
  - Docker image: `grafana/grafana:11.1.0` at port 3000 (local compose)
  - Provisioning: `api/docker/grafana/provisioning/`
  - Admin credentials: `GF_ADMIN_USER` / `GF_ADMIN_PASSWORD` env vars
  - Sign-up disabled

**Health Checks:**
- Spring Boot Actuator — `GET /actuator/health`
  - Probes enabled (Kubernetes readiness/liveness)
  - R2DBC health indicator enabled
  - Redis health indicator enabled
  - Disk space health indicator enabled

**Error Tracking:**
- No external error tracking service detected (no Sentry, Datadog, etc.)

**Logging:**
- Local profile: colored console via `api/src/main/resources/logback-local.xml`
- Production profile: JSON stdout via Logstash encoder (`logback-prod.xml`)
  - Library: `net.logstash.logback:logstash-logback-encoder:8.1`
  - Suitable for log aggregation pipelines (ELK, Datadog, etc.)

## API Documentation

**Swagger / OpenAPI:**
- Library: `org.springdoc:springdoc-openapi-starter-webflux-ui:2.8.8`
- URL: `/swagger-ui.html` (local profile only)
- API docs: `/v3/api-docs/**`
- Disabled in production (`application-prod.yml`)
- Config: `api/src/main/java/com/example/bootstrap/global/config/OpenApiConfig.java`

## CI/CD & Deployment

**Containerization:**
- Docker multi-stage build (`api/Dockerfile`)
- Docker Compose for local development stack (`api/docker-compose.yml`)
  - Services: PostgreSQL, Redis, App, Prometheus, Grafana

**CI Pipeline:**
- No CI configuration file detected (no Jenkinsfile, `.github/workflows/`, `.gitlab-ci.yml`)
- Gradle `check` task runs: tests → JaCoCo report → coverage verification (60% minimum)

**Hosting:**
- Not configured — no deployment manifests (Kubernetes, Helm, ECS, etc.) detected

## Environment Configuration

**Required environment variables (production):**
- `R2DBC_URL` - Reactive PostgreSQL connection string
- `JDBC_URL` - JDBC PostgreSQL connection string (Flyway + Batch)
- `DB_USERNAME` - Database runtime user
- `DB_PASSWORD` - Database runtime password
- `FLYWAY_URL` / `FLYWAY_USER` / `FLYWAY_PASSWORD` - Dedicated migration account (optional, falls back to DB_*)
- `REDIS_HOST` - Redis hostname
- `REDIS_PORT` - Redis port
- `JWT_SECRET` - JWT signing key (>= 32 chars)
- `OPENAI_API_KEY` - OpenAI API key
- `CORS_ALLOWED_ORIGINS` - Comma-separated allowed origins
- `SERVER_PORT` - HTTP port (default 8080)
- `GF_ADMIN_USER` / `GF_ADMIN_PASSWORD` - Grafana admin credentials

**Secrets location:**
- All secrets via environment variables injected at runtime
- No secret manager integration detected
- `.env` files used locally (listed in `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- None detected — no webhook endpoint handlers found

**Outgoing:**
- None detected — no outbound webhook dispatch code found

---

*Integration audit: 2026-05-27*
