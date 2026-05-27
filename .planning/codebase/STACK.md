# Technology Stack

**Analysis Date:** 2026-05-27

## Languages

**Primary:**
- TypeScript 5.8.3 - Frontend (`web/src/`)
- Java 21 (LTS) - Backend API (`api/src/main/java/`)

**Secondary:**
- SQL - Database migrations (`api/src/main/resources/db/migration/`)

## Runtime

**Frontend:**
- Node.js >= 18.17.0 (required by engines field in `web/package.json`)

**Backend:**
- JVM (Eclipse Temurin 21 JRE Alpine in production Docker image)
- Spring Boot embedded Netty server (via WebFlux, not Tomcat)

## Package Manager

**Frontend:**
- pnpm 10.28.2
- Lockfile: `web/pnpm-lock.yaml` (present)
- Workspace config: `web/pnpm-workspace.yaml`

**Backend:**
- Gradle 9.5.1 (via wrapper at `api/gradle/wrapper/gradle-wrapper.properties`)
- Build file: `api/build.gradle`
- Version properties: `api/gradle.properties`

## Frameworks

**Frontend Core:**
- React 19.0.0 - UI rendering (`web/src/main.tsx`)
- TanStack Router 1.95.0 - File-based routing with auto code splitting (`web/src/routes/`)
- TanStack Query 5.75.0 - Server state management and data fetching (`web/src/providers/app-providers.tsx`)
- TanStack Table 8.21.3 - Table/data grid component

**Backend Core:**
- Spring Boot 3.4.5 - Application framework (`api/build.gradle`)
- Spring WebFlux - Reactive HTTP layer (Netty server, non-blocking)
- Spring Security - Authentication/authorization (`api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java`)
- Spring Batch - Background job processing (`api/src/main/java/com/example/bootstrap/global/config/BatchConfig.java`)
- Spring AI 1.0.0 - OpenAI integration (`api/src/main/java/com/example/bootstrap/global/config/AiConfig.java`)
- Spring Data R2DBC - Reactive database access
- Spring Data Redis Reactive - Reactive Redis access

**Frontend UI:**
- Tailwind CSS 4.0.0 - Utility-first CSS (via `@tailwindcss/vite` plugin)
- Radix UI / Base UI - Headless component primitives
- Lucide React 0.487.0 - Icon library
- Recharts 3.8.1 - Charting library
- Motion 11.18.0 - Animation library
- Sonner 2.0.3 - Toast notifications
- cmdk 1.1.1 - Command palette component
- react-day-picker 10.0.0 - Date picker

**Frontend Forms:**
- React Hook Form 7.55.0 - Form state management
- Zod 3.24.2 - Schema validation and type inference
- `@hookform/resolvers` 4.1.3 - Zod ↔ RHF bridge

**Frontend State:**
- Zustand 5.0.3 - Client-side global state (`web/src/stores/`)
- Immer 11.1.4 - Immutable state helpers

**Frontend i18n:**
- i18next 26.0.10 + react-i18next 17.0.7 - Internationalization
- Default locale: Korean (`ko`), fallback: English (`en`)
- Translation files: `web/src/sample/i18n/locales/`

## Build / Dev Tools

**Frontend:**
- Vite 6.0.0 - Dev server and bundler (`web/vite.config.ts`)
- `@vitejs/plugin-react` 4.3.4 - React fast refresh
- `@tanstack/router-plugin` 1.95.0 - Route tree code generation
- `vite-tsconfig-paths` 5.1.4 - Path alias resolution
- TypeScript ESNext target, `ES2022` lib, strict mode
- Path alias: `@/*` → `./src/*`

**Backend:**
- Gradle Wrapper 9.5.1 - Build automation
- Docker multi-stage build (`api/Dockerfile`): `eclipse-temurin:21-jdk-alpine` builder → `eclipse-temurin:21-jre-alpine` runtime
- JVM flags: `-XX:+UseContainerSupport`, `-XX:MaxRAMPercentage=75.0`

## Code Quality Tools

**Frontend:**
- Biome 1.9.4 - Linter + formatter (`web/biome.json`)
  - Indent: 2 spaces
  - Line width: 100
  - Quote style: single
  - Trailing commas: ES5

**Backend:**
- Checkstyle 10.23.0 - Java style enforcement (`api/config/checkstyle/checkstyle.xml`)
- SpotBugs 6.1.7 (plugin) / 4.9.3 (tool) - Static bug analysis (`api/config/spotbugs/exclude.xml`)
- JaCoCo 0.8.12 - Code coverage (60% line coverage minimum enforced in `./gradlew check`)
- MapStruct 1.6.3 - Compile-time DTO mapper generation
- Lombok - Boilerplate reduction

**Test Tools:**
- Backend: JUnit 5 + Spring Boot Test + Reactor Test + Testcontainers (PostgreSQL, Redis, R2DBC)
- Frontend: Vitest (inferred from `*.test.ts` files under `web/src/sample/`)

## Key Dependencies

**Critical:**
- `io.jsonwebtoken:jjwt-api:0.12.6` - JWT token creation/validation (`api/.../global/security/jwt/`)
- `org.flywaydb:flyway-core` + `flyway-database-postgresql` - Database schema migrations (`api/src/main/resources/db/migration/`)
- `org.springframework.ai:spring-ai-starter-model-openai` - OpenAI ChatClient integration
- `org.postgresql:r2dbc-postgresql` - Reactive PostgreSQL driver
- `net.logstash.logback:logstash-logback-encoder:8.1` - JSON structured logging in production (`api/src/main/resources/logback-prod.xml`)
- `org.springdoc:springdoc-openapi-starter-webflux-ui:2.8.8` - Swagger UI (local only)
- `io.micrometer:micrometer-registry-prometheus` - Prometheus metrics endpoint

**Infrastructure:**
- `org.springframework.boot:spring-boot-starter-data-redis-reactive` - Redis for JWT blacklist + caching
- `org.springframework.boot:spring-boot-starter-batch` - Background batch jobs
- `org.springframework.boot:spring-boot-starter-actuator` - Health, metrics, info endpoints

## Configuration

**Backend Environment:**
- All secrets injected via environment variables (no hardcoded values in production)
- Active profile selected via `SPRING_PROFILES_ACTIVE` env var
- Key env vars: `R2DBC_URL`, `JDBC_URL`, `DB_USERNAME`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET`, `OPENAI_API_KEY`, `CORS_ALLOWED_ORIGINS`, `SERVER_PORT`
- Flyway supports separate migration credentials: `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD`

**Backend Config Files:**
- `api/src/main/resources/application.yml` - Base config with env var defaults
- `api/src/main/resources/application-local.yml` - Local profile (all actuator endpoints exposed, Swagger enabled, SQL debug logging)
- `api/src/main/resources/application-prod.yml` - Prod profile (Swagger disabled, JSON logging, minimal actuator exposure)

**Frontend Environment:**
- Dev server port: 3000 (`web/vite.config.ts`)
- Build: `tsc -b && vite build`
- TypeScript strict mode enabled with `noUnusedLocals` and `noUnusedParameters`

## Platform Requirements

**Development:**
- Node.js >= 18.17.0, pnpm >= 10.0.0
- Java 21 JDK
- Docker (for `docker compose up` with PostgreSQL 16, Redis 7, Prometheus, Grafana)
- Gradle Wrapper handles Java build toolchain automatically

**Production:**
- Docker container: `eclipse-temurin:21-jre-alpine`
- JVM memory: up to 75% of container RAM
- Healthcheck: `GET /actuator/health`
- Ports: 8080 (API), 9090 (Prometheus), 3000 (Grafana in local compose)

---

*Stack analysis: 2026-05-27*
