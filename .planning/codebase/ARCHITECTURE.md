<!-- refreshed: 2026-05-27 -->
# Architecture

**Analysis Date:** 2026-05-27

## System Overview

이 프로젝트는 **풀스택 부트스트랩 템플릿**으로, Spring Boot WebFlux 기반 API 서버(`api/`)와 React SPA 프론트엔드(`web/`)로 구성된 모노레포입니다.

```text
┌─────────────────────────────────────────────────────────────────┐
│                     web/ (React SPA)                            │
│  TanStack Router │ React Query │ Zustand │ Tailwind + shadcn/ui │
│  src/routes/     │ src/features/ │ src/stores/ │ src/components/ │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP REST / SSE
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     api/ (Spring Boot WebFlux)                  │
├─────────────────┬──────────────────────┬────────────────────────┤
│  account/       │  ai/                 │  batch/                │
│  controller     │  controller          │  controller            │
│  application/   │  application/service │  application/          │
│  domain/        │                      │                        │
│  infrastructure/│                      │                        │
└────┬────────────┴──────────┬───────────┴────────────────────────┘
     │                       │
     ▼                       ▼
┌──────────────────┐  ┌──────────────────────────────────────────┐
│  Redis           │  │  PostgreSQL                              │
│  - JWT blacklist │  │  - users, refresh_tokens, oauth_accounts │
│  - JWT blacklist │  │  - ai_chat_sessions, ai_chat_messages    │
│  - cache util    │  │  - Spring Batch metadata tables          │
└──────────────────┘  └──────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | 위치 |
|-----------|----------------|------|
| AuthController | 인증 API (register/login/refresh/logout/social) | `api/src/main/java/com/example/bootstrap/account/controller/AuthController.java` |
| AccountController | 내 정보 조회·수정·탈퇴 | `api/src/main/java/com/example/bootstrap/account/controller/AccountController.java` |
| AiChatController | AI 채팅 (동기/SSE 스트리밍) | `api/src/main/java/com/example/bootstrap/ai/controller/AiChatController.java` |
| BatchController | 만료 토큰 정리 배치 트리거 (ADMIN) | `api/src/main/java/com/example/bootstrap/batch/controller/BatchController.java` |
| AuthService | 로그인·토큰 갱신·로그아웃 비즈니스 로직 | `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java` |
| AccountService | 계정 CRUD 비즈니스 로직 | `api/src/main/java/com/example/bootstrap/account/application/service/AccountService.java` |
| AiChatService | Spring AI OpenAI 호출 | `api/src/main/java/com/example/bootstrap/ai/application/service/AiChatService.java` |
| AbstractOAuth2Handler | OAuth2 소셜 로그인 공통 흐름 (템플릿 메서드) | `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/AbstractOAuth2Handler.java` |
| JwtAuthenticationFilter | Bearer 토큰 검증 → SecurityContext 설정 | `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java` |
| JwtBlacklistService | Redis 기반 토큰 블랙리스트 | `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtBlacklistService.java` |
| GlobalExceptionHandler | 전역 예외 → ApiResponse 변환 + i18n | `api/src/main/java/com/example/bootstrap/global/exception/GlobalExceptionHandler.java` |
| RedisCacheUtil | ReactiveRedisTemplate 박막 래퍼 | `api/src/main/java/com/example/bootstrap/global/cache/RedisCacheUtil.java` |
| AppProviders (web) | ReactQueryClientProvider 루트 | `web/src/providers/app-providers.tsx` |
| useAuthStore | Zustand 인증 상태 저장소 | `web/src/features/auth/store/auth.store.ts` |
| useModal | Zustand 모달 스택 저장소 | `web/src/stores/modal-store.ts` |

## Pattern Overview

**API 서버:** 도메인 중심 레이어드 아키텍처 (Layered + Domain-Driven Organization) + Reactive (WebFlux / R2DBC / Reactor)

**프론트엔드:** Feature-Sliced Design 변형 — `features/` 도메인 슬라이스 + `routes/` 파일 기반 라우팅 + `sample/` 데모 섹션 분리

**Key Characteristics:**
- API 전 계층이 `Mono`/`Flux` 논블로킹 파이프라인으로 구현
- 도메인(`account`, `ai`, `batch`)별 패키지 분리 후 `controller → application/service → domain → infrastructure` 순서 레이어 적용
- 모든 API 응답은 `ApiResponse<T>` envelope (`code`, `message`, `data`, `errors`)
- JWT Stateless 인증: Access Token(30분) + Refresh Token Rotation(14일) + Redis 블랙리스트
- 프론트엔드 인증은 현재 mock API(`mockLogin`, `mockSignup`) 구현 — 실 API 연동 전 상태

## Layers (API)

**Controller Layer:**
- Purpose: HTTP 요청 수신, 입력 유효성 검증(`@Valid`), 서비스 위임, 응답 래핑
- Location: `api/src/main/java/com/example/bootstrap/{domain}/controller/`
- Contains: `@RestController`, `@RequestMapping`, Reactor `Mono<ResponseEntity<ApiResponse<T>>>` 반환
- Depends on: Application/Service, global response
- Used by: Spring WebFlux DispatcherHandler

**Application Layer:**
- Purpose: 비즈니스 유스케이스 구현, 도메인 객체 조합
- Location: `api/src/main/java/com/example/bootstrap/{domain}/application/`
- Contains: `service/` (비즈니스 로직), `dto/` (Request/Response 레코드)
- Depends on: Domain repositories, global utilities (JWT, Redis)
- Used by: Controller

**Domain Layer:**
- Purpose: 핵심 엔티티 및 리포지토리 인터페이스 정의
- Location: `api/src/main/java/com/example/bootstrap/{domain}/domain/`
- Contains: `model/` (R2DBC 엔티티), `repository/` (ReactiveCrudRepository 확장 인터페이스)
- Depends on: Spring Data R2DBC
- Used by: Application/Service

**Infrastructure Layer:**
- Purpose: 외부 시스템 연동 구현체
- Location: `api/src/main/java/com/example/bootstrap/{domain}/infrastructure/`
- Contains: OAuth2 핸들러 (`AbstractOAuth2Handler`, `GoogleOAuth2Handler`, `KakaoOAuth2Handler`)
- Depends on: WebClient, Domain repositories, JWT
- Used by: Controller (직접 주입)

**Global Layer:**
- Purpose: 횡단 관심사 — 보안, 예외 처리, 응답 형식, 설정, 캐시
- Location: `api/src/main/java/com/example/bootstrap/global/`
- Contains: `config/`, `exception/`, `response/`, `security/`, `cache/`
- Depends on: Spring Security, Redis
- Used by: 모든 도메인 레이어

## Data Flow

### 인증 요청 흐름 (이메일/비밀번호 로그인)

1. HTTP POST `/api/v1/auth/login` 수신 (`AuthController.login()`)
2. `@Valid` 입력 검증 → `AuthService.login(request)` 위임
3. `AccountRepository.findByEmail()` (R2DBC) → 비밀번호 검증 (BCrypt)
4. `JwtTokenProvider.generateAccessToken()` + `generateRefreshToken()`
5. `RefreshTokenRepository.save()` (R2DBC, PostgreSQL `refresh_tokens` 테이블)
6. `ResponseEntity<ApiResponse<TokenResponse>>` 반환

```
클라이언트 → AuthController → AuthService → AccountRepository (R2DBC/PostgreSQL)
                                          → JwtTokenProvider
                                          → RefreshTokenRepository (R2DBC/PostgreSQL)
              ← ApiResponse<TokenResponse> ←────────────────────────────────────
```

### JWT 인증 필터 흐름

모든 요청은 `JwtAuthenticationFilter`를 통과합니다. 토큰이 없거나 유효하지 않으면 인증 없이 통과하고, `authorizeExchange` 규칙에서 401을 반환합니다.

```
HTTP 요청 → JwtAuthenticationFilter
              ├── Authorization 헤더 없음 → chain.filter() (인증 없이 통과)
              ├── 토큰 파싱 실패 → chain.filter() (인증 없이 통과)
              ├── Redis 블랙리스트 확인 → 블랙리스트 → chain.filter() (인증 없이)
              └── 유효 → ReactiveSecurityContextHolder에 Authentication 설정
                          → chain.filter() → authorizeExchange 규칙 평가
```

### OAuth2 소셜 로그인 흐름

1. 클라이언트가 provider access token을 `POST /api/v1/auth/social/{provider}`로 전송
2. `AuthController.socialLogin()` → provider별 핸들러 선택 (`switch` on path variable)
3. `AbstractOAuth2Handler.authenticate()` → `fetchUserInfo()` (WebClient, provider userinfo API)
4. `SocialAccountRepository.findByProviderAndProviderId()` → 기존/신규 계정 분기
5. 신규: `AccountRepository.save()` + `SocialAccountRepository.save()`
6. JWT 토큰 발급 → `AuthTokenResponse` 반환

### SSE AI 스트리밍 흐름

```
GET /api/v1/ai/chat/stream?message=... → AiChatController.stream()
  → AiChatService.stream() → ChatClient.prompt().stream().content()
  → Flux<String> (text/event-stream) → 클라이언트 실시간 수신
```

**State Management (Web):**
- 서버 상태: TanStack Query (`useMutation`, `useQuery`)
- 클라이언트 인증 상태: Zustand (`useAuthStore` — `web/src/features/auth/store/auth.store.ts`)
- 모달 스택 상태: Zustand (`useModal` — `web/src/stores/modal-store.ts`)

## Key Abstractions

**ApiResponse<T>:**
- Purpose: 모든 API 응답의 통일된 envelope
- 위치: `api/src/main/java/com/example/bootstrap/global/response/ApiResponse.java`
- Pattern: Java record with static factory methods (`success()`, `error()`, `validationError()`)
- 필드: `code`, `message`, `data`, `errors` (null은 JSON 직렬화에서 제외)

**ErrorCode enum:**
- Purpose: 도메인별 에러 코드 + HTTP 상태 매핑
- 위치: `api/src/main/java/com/example/bootstrap/global/exception/ErrorCode.java`
- Pattern: 도메인 접두사 포함 (`AUTH_001`~`AUTH_006`, `ACCOUNT_001`~`ACCOUNT_004`, `AI_001`~`AI_003`, `BATCH_001`~`BATCH_003`, `COMMON_001`~`COMMON_005`)
- i18n 메시지 키와 1:1 매핑

**AbstractOAuth2Handler:**
- Purpose: OAuth2 공급자별 로그인 흐름의 템플릿 메서드 패턴
- 위치: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/AbstractOAuth2Handler.java`
- Pattern: `authenticate()` 공통 흐름, `fetchUserInfo()` abstract 메서드만 override
- 구현체: `GoogleOAuth2Handler.java`, `KakaoOAuth2Handler.java`

**ReactiveCrudRepository 확장:**
- Purpose: R2DBC 기반 논블로킹 데이터 접근
- Pattern: Spring Data 인터페이스 상속, 쿼리 메서드 명명 규칙 사용 (e.g. `findByEmail`, `findByToken`)
- 위치: `api/src/main/java/com/example/bootstrap/{domain}/domain/repository/`

## Entry Points

**API 서버:**
- Location: `api/src/main/java/com/example/bootstrap/BootstrapApplication.java`
- Triggers: JVM 시작 (`SpringApplication.run`)
- Responsibilities: Spring Boot 자동설정 초기화, `@ConfigurationPropertiesScan` 활성화

**프론트엔드:**
- Location: `web/src/main.tsx`
- Triggers: 브라우저 로드
- Responsibilities: React 루트 마운트, TanStack Router Provider 초기화

**라우트 루트:**
- Location: `web/src/routes/__root.tsx`
- Responsibilities: `AppProviders` 래핑, 전역 모달·토스트 마운트, 개발 시 RouterDevtools 노출

## Architectural Constraints

- **Threading:** WebFlux 이벤트 루프 단일 스레드 기반. 블로킹 AI 호출(`AiChatService.chat()`)은 `Schedulers.boundedElastic()`으로 격리. Spring Batch 실행도 동일하게 boundedElastic 격리.
- **Global state:** `LocaleContextHolder` — `GlobalExceptionHandler`에서 요청마다 설정 후 `resetLocaleContext()` 호출로 정리. 스레드 오염 주의.
- **Dual DB connection:** R2DBC (런타임 데이터 접근) + JDBC (Flyway 마이그레이션 + Spring Batch JobRepository) 공존. `batchTransactionManager` 한정자로 JDBC 트랜잭션 매니저 명시.
- **Circular imports:** 없음 (도메인 → 상위 참조 없음)
- **JWT 비밀키:** `application.yml`에 기본값 하드코딩됨 — 프로덕션에서 반드시 `JWT_SECRET` 환경변수로 교체 필요

## Anti-Patterns

### 프론트엔드 Mock API 사용 중

**What happens:** `web/src/features/auth/lib/mock-auth-api.ts`에서 실제 API 호출 없이 750ms 지연 후 하드코딩된 데이터 반환.

**Why it's wrong:** 실제 백엔드 API(`/api/v1/auth/login`, `/api/v1/auth/register`)가 구현되어 있음에도 프론트엔드는 연동이 없다. API 스펙 변경이 프론트엔드에 반영되지 않음.

**Do this instead:** `mock-auth-api.ts`를 실제 `fetch`/`axios` 호출로 교체. `use-auth-mutation.ts`의 `mutationFn`을 실 API 클라이언트로 변경.

### AccountController에서 Authorization 헤더 직접 파싱

**What happens:** `AccountController.deleteMe()`에서 `authorization.substring(7)`로 Bearer 토큰 직접 추출 — null 체크 없음.

**Why it's wrong:** `JwtAuthenticationFilter`를 통과한 요청에는 항상 유효한 Bearer 헤더가 보장되지만, 방어 코드 없이 `substring(7)` 직접 호출은 `AuthController.logout()`의 `startsWith("Bearer ")` 검증 패턴과 불일치.

**Do this instead:** 추출 로직을 유틸리티로 공통화하거나 `AuthController.logout()`과 동일하게 `startsWith` 검증 후 추출.

## Error Handling

**Strategy:** `@RestControllerAdvice` 전역 예외 핸들러 + `BusinessException` 도메인 예외 체계

**Patterns:**
- `BusinessException(ErrorCode)` → `GlobalExceptionHandler.handleBusinessException()` → HTTP 상태 + i18n 메시지
- `WebExchangeBindException` → 필드별 에러 목록 포함 `validationError()` 응답
- `Exception` (미처리) → COMMON_002 (500)
- Reactor 체인 내 에러: `onErrorMap()` 패턴으로 `BusinessException`으로 래핑 (예: `AiChatService`)

## Cross-Cutting Concerns

**Logging:** Logback. 로컬 프로파일: `logback-local.xml` (일반 텍스트), 프로덕션: `logback-prod.xml` (Logstash JSON 인코더)

**Validation:** Controller 파라미터에 `@Valid` 적용 → `WebExchangeBindException` 발생 → `GlobalExceptionHandler` 처리

**Authentication:** `JwtAuthenticationFilter` WebFilter → `ReactiveSecurityContextHolder` → Controller에서 `Authentication.getPrincipal()` (userId Long)으로 접근

**i18n:** `MessageSource` 기반, `Accept-Language` 헤더 자동 감지, 기본 Locale 한국어. 메시지 키: `api/src/main/resources/i18n/`

---

*Architecture analysis: 2026-05-27*
