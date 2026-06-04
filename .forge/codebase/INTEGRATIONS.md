---
last_mapped_commit: 494e665f81fbd274fdf9d64df89b97a66a3839b3
mapped: 2026-06-05
---

# 외부 연동 및 서비스

애플리케이션이 통합하는 외부 서비스, 데이터베이스, 인증 제공자, 캐시, 메시지 브로커 등을 정리합니다.

## 데이터베이스

### PostgreSQL

- **버전**: 16-alpine
- **목적**: R2DBC (반응형 런타임) + JDBC (Flyway, Spring Batch) 공유
- **연결**:
  - R2DBC: `r2dbc:postgresql://host:port/database`
    - 설정: `api/src/main/resources/application.yml` (`spring.r2dbc`)
    - 로컬: `localhost:15432` (Docker Compose 포트)
    - 풀: 초기 5, 최대 20, 유휴 타임아웃 30분
  - JDBC: `jdbc:postgresql://host:port/database`
    - 설정: `api/src/main/resources/application.yml` (`spring.datasource`)
    - 로컬: `localhost:15432`
    - HikariCP: 최대 5, 최소 유휴 2, 연결 타임아웃 30초
- **마이그레이션**: Flyway (JDBC 전용)
  - 위치: `api/src/main/resources/db/migration`
  - 설정: `api/src/main/resources/application.yml` (`spring.flyway`)
  - 환경별 계정 분리 지원: `FLYWAY_USER` / `FLYWAY_PASSWORD` (DDL) vs `DB_USERNAME` / `DB_PASSWORD` (DML)
  - baseline-on-migrate: false, validate-on-migrate: true, clean-disabled: true
- **Docker Compose 서비스명**: `postgres`
  - 환경변수: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `PGDATA`

### R2DBC 데이터 액세스

- **라이브러리**: `org.springframework.boot:spring-boot-starter-data-r2dbc`
- **드라이버**: `org.postgresql:r2dbc-postgresql`
- **엔티티 관리**: Spring Data R2DBC 저장소 (자동 생성)
- **도메인 모델**: `api/src/main/java/com/example/bootstrap/account/domain/model/` 및 `ai/domain/model/`
  - Account, RefreshToken, SocialAccount 등 리액티브 리포지토리

---

## 캐시 및 세션

### Redis

- **버전**: 7-alpine
- **목적**: JWT 토큰 블랙리스트, 일반 캐싱
- **연결**:
  - 설정: `api/src/main/resources/application.yml` (`spring.data.redis`)
  - 로컬: `localhost:16379` (Docker Compose 포트)
  - Lettuce 풀: max-active 8, max-idle 8, min-idle 2
- **JWT 블랙리스트**:
  - 서비스: `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtBlacklistService.java`
  - 키 패턴: `jwt:blacklist:<token>` (TTL = 토큰 남은 유효 시간)
  - 자동 만료: Redis TTL 기반
- **Docker Compose 서비스명**: `redis`
  - 명령: `redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru`
  - 영속성: AOF (Append-Only File)

---

## 인증 및 권한

### JWT (JSON Web Tokens)

- **라이브러리**: JJWT 0.12.6
  - `io.jsonwebtoken:jjwt-api:0.12.6` (API)
  - `io.jsonwebtoken:jjwt-impl:0.12.6` (구현)
  - `io.jsonwebtoken:jjwt-jackson:0.12.6` (Jackson 통합)
- **알고리즘**: HS256 (HMAC SHA-256)
- **토큰 종류**:
  - **Access Token**: 30분 유효기간, claims: userId, email, role, type="access"
  - **Refresh Token**: 14일 유효기간, claims: userId, type="refresh"
- **저장소**: Refresh Token은 PostgreSQL `refresh_tokens` 테이블에 저장
- **생성/검증**: `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtTokenProvider.java`
- **설정**:
  - `api/src/main/resources/application.yml`:
    - `jwt.secret` (환경변수: `JWT_SECRET`, 기본: 32문자 개발용)
    - `jwt.access-token-expiry`: 1800초
    - `jwt.refresh-token-expiry`: 1209600초
- **엔드포인트**:
  - 인증 없이 접근: `POST /api/v1/auth/**`
  - 다른 모든 API: 인증 필수

### OAuth2 소셜 로그인

- **클라이언트 주도 흐름**: 프론트엔드가 provider 토큰 획득 → 백엔드에 전달 → 사용자 정보 조회 → JWT 발급
- **구현 위치**: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/`

#### Google OAuth2

- **라이브러리**: Spring WebClient (자동 구성)
- **Userinfo 엔드포인트**: `https://www.googleapis.com/oauth2/v3/userinfo`
- **헤더**: `Authorization: Bearer <access_token>`
- **응답 필드 매핑**:
  - `sub` → providerId
  - `email` → email
  - `name` → nickname
  - `picture` → profileImageUrl
- **핸들러 클래스**: `GoogleOAuth2Handler.java`
  - 공통 로직 상속: `AbstractOAuth2Handler.java`

#### Kakao OAuth2

- **라이브러리**: Spring WebClient
- **Userinfo 엔드포인트**: `https://kapi.kakao.com/v2/user/me`
- **헤더**: `Authorization: Bearer <access_token>`
- **응답 매핑**:
  - `id` (long) → providerId
  - `kakao_account.email` → email (nullable)
  - `kakao_account.profile.nickname` → nickname
  - `kakao_account.profile.profile_image_url` → profileImageUrl
- **핸들러 클래스**: `KakaoOAuth2Handler.java`

#### Microsoft Teams OAuth2 (연구 진행 중)

- **상태**: v1.1 마일스톤에서 연구 단계
  - Git 커밋: `f47a610` ("docs: start milestone v1.1 Microsoft Teams 소셜 로그인")
  - 상세 분석: `e36de42` ("docs: add v1.1 research (Microsoft OAuth2 — 4 agents + summary)")
- **예상 구현**: 유사한 OAuth2 핸들러 패턴 (GoogleOAuth2Handler, KakaoOAuth2Handler 참조)

### 소셜 계정 관리

- **엔티티**: `SocialAccount`
  - 필드: userId (Account FK), provider, providerId
  - 저장소: `SocialAccountRepository` (R2DBC)
- **신규 사용자 흐름**:
  1. provider userinfo 조회
  2. providerId로 SocialAccount 검색 → 없으면 신규 Account 생성
  3. Account + SocialAccount 저장
  4. JWT 토큰 발급
- **기존 사용자**: providerId로 기존 SocialAccount 조회 → Account 로드 → JWT 발급
- **엔드포인트**: `POST /api/v1/auth/social` (provider, accessToken 전달)

### Spring Security WebFlux

- **설정**: `api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java`
  - CSRF 비활성화 (Stateless)
  - HTTP Basic/FormLogin 비활성화
  - JWT 필터: `JwtAuthenticationFilter`
  - 역할 기반 접근 제어 (RBAC): USER, ADMIN
- **인증 진입점**: 401 Unauthorized
- **접근 거부 핸들러**: `ApiAccessDeniedHandler.java`
- **공개 엔드포인트**:
  - Actuator: `/actuator/health/**`, `/actuator/info`, `/actuator/prometheus`
  - Swagger: `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`, `/webjars/**`
  - 인증 API: `POST /api/v1/auth/**`
- **관리자 전용**: `/api/v1/admin/**` (ADMIN 역할)
- **인증 필수**: `/api/menus/**`, 기타 모든 API

---

## AI 및 생성형 모델

### OpenAI API

- **라이브러리**: Spring AI 1.0.0
  - `spring-ai-bom:1.0.0` (BOM)
  - `spring-ai-starter-model-openai`
- **모델**: `gpt-4o-mini`
  - 설정: `api/src/main/resources/application.yml` (`spring.ai.openai.chat.options.model`)
- **API 키**: 환경변수 `OPENAI_API_KEY`
  - 기본값 (개발): `placeholder-key`
  - 운영 환경: 실제 API 키 주입
- **엔드포인트**: `https://api.openai.com/v1/chat/completions`
- **통합 모드**:
  - **동기**: `ChatClient.call().content()`
    - 서비스: `AiChatService#chat(ChatRequest)`
    - 실행: `Schedulers.boundedElastic()` (비동기 이벤트 루프 격리)
    - 경로: `POST /api/v1/ai/chat`
  - **스트리밍 (SSE)**: `ChatClient.stream().content()`
    - 서비스: `AiChatService#stream(ChatRequest)`
    - 응답: 네이티브 `Flux<String>` (토큰 단위 텍스트)
    - 경로: `POST /api/v1/ai/stream` (예상)
- **설정 클래스**: `api/src/main/java/com/example/bootstrap/global/config/AiConfig.java`
  - Bean: `ChatClient` (Spring Boot 자동 구성 `ChatClient.Builder` 사용)
  - 테스트 모킹 용이: Mock 주입 지원

---

## 모니터링 및 관찰성

### Actuator

- **엔드포인트**: `/actuator`
  - 노출 범위 (프로파일별):
    - **local**: `*` (모든 엔드포인트)
    - **prod**: `health,info,prometheus` (최소)
- **헬스 체크**:
  - R2DBC, Redis, DiskSpace 프로브 활성화
  - 상세도: local에서 항상 표시, prod에서 인가된 요청만 표시
- **라이브니스/레디니스 프로브**: 활성화

### Prometheus

- **이미지**: `prom/prometheus:v2.53.0`
- **포트**: `9090`
- **설정**: `docker/prometheus/prometheus.yml`
  - 보존 기간: 15일
- **메트릭 수집**:
  - Spring Boot 앱 (`/actuator/prometheus`) 자동 스크래핑
  - `io.micrometer:micrometer-registry-prometheus` 라이브러리

### Grafana

- **이미지**: `grafana/grafana:11.1.0`
- **포트**: `3000`
- **기본 사용자**: admin / admin (환경변수 `GF_ADMIN_USER`, `GF_ADMIN_PASSWORD`)
- **프로비저닝**: `docker/grafana/provisioning/` (readonly)
- **프로비저닝 대상**:
  - Datasources: Prometheus (`http://prometheus:9090`)
  - Dashboards: 커스텀 대시보드 (저장소 내 정의 예상)

---

## 국제화 (i18n)

- **메시지 저장소**: `classpath:i18n/messages`
- **기본 언어**: 한국어 (ko)
- **인코딩**: UTF-8
- **구현**: Spring MessageSource (백엔드), i18next (프론트엔드)

---

## CORS

- **설정**: `api/src/main/resources/application.yml` (`cors.allowed-origins`)
- **환경변수**: `CORS_ALLOWED_ORIGINS`
- **기본값** (로컬): `http://localhost:3000,http://localhost:5173`
- **구현**: Spring Security 필터 (또는 커스텀 CorsConfigurationSource)

---

## Docker 인프라

### Docker Compose 서비스

**파일**: `api/docker-compose.yml`

#### 서비스 정의

1. **postgres** (PostgreSQL 16)
   - 포트: 5432 (외부: `DB_HOST_PORT`, 기본 5432)
   - 환경: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
   - 볼륨: `postgres_data:/var/lib/postgresql/data`
   - 헬스체크: `pg_isready` (10초 간격, 5번 재시도)

2. **redis** (Redis 7)
   - 포트: 6379 (외부: `REDIS_HOST_PORT`, 기본 6379)
   - 명령: AOF 활성화, 256MB 메모리 제한, LRU 제거 정책
   - 볼륨: `redis_data:/data`
   - 헬스체크: `redis-cli ping` (10초 간격)

3. **app** (Spring Boot)
   - 빌드: `Dockerfile`에서 생성
   - 포트: 8080
   - 환경: R2DBC_URL, JDBC_URL, DB_USERNAME, DB_PASSWORD, REDIS_HOST, REDIS_PORT, JWT_SECRET, OPENAI_API_KEY, CORS_ALLOWED_ORIGINS
   - 의존성: postgres, redis (healthy 상태 대기)

4. **prometheus** (Prometheus v2.53.0)
   - 포트: 9090
   - 설정: `docker/prometheus/prometheus.yml`
   - 볼륨: `prometheus_data:/prometheus`

5. **grafana** (Grafana 11.1.0)
   - 포트: 3000
   - 환경: 관리자 자격증명, 사용자 가입 비활성화
   - 볼륨: 프로비저닝 설정 (readonly), `grafana_data:/var/lib/grafana`

### Named Volumes

- `postgres_data` — PostgreSQL 영속성
- `redis_data` — Redis 영속성
- `prometheus_data` — 시계열 메트릭 저장
- `grafana_data` — Grafana 설정 및 대시보드

### Networks

- `bootstrap-net` (bridge) — 컨테이너 간 통신

---

## 로깅

- **로거**: Logback (Spring Boot 기본)
- **포맷**:
  - **로컬**: 컬러 콘솔, 상세 SQL 로깅 (R2DBC 쿼리/매개변수)
    - 설정: `api/src/main/resources/logback-local.xml`
    - 레벨: DEBUG (bootstrap, r2dbc.postgresql, spring.r2dbc)
  - **운영**: JSON stdout (Logstash 호환)
    - 설정: `api/src/main/resources/logback-prod.xml`
    - 라이브러리: `net.logstash.logback:logstash-logback-encoder:8.1`
    - 레벨: INFO
- **클래스별 레벨**:
  - `root`: INFO
  - `com.example.bootstrap`: DEBUG (로컬), INFO (운영)
  - `io.r2dbc.postgresql.*`: DEBUG (로컬 전용)
  - `org.flywaydb`: INFO

---

## 외부 저장소

### Maven Repository

- **중앙 저장소**: `mavenCentral()`
- **Spring 마일스톤**: `https://repo.spring.io/milestone`
- **Spring 스냅샷**: `https://repo.spring.io/snapshot`

