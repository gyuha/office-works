# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Spring Boot WebFlux API(`api/`) + React SPA(`web/`) 모노레포. 현재 목표는 메뉴별 접근 권한 관리(RBAC) 추가 — `PROJECT.md` 참고.

## 명령어

### API (`api/` 디렉토리, Task 사용)

```bash
# 인프라 기동 후 로컬 서버 실행
task run

# 앱만 재시작 (Docker는 이미 실행 중일 때)
task run:local

# 전체 검증 (테스트 + JaCoCo 60% + Checkstyle + SpotBugs)
task check

# 테스트만
task test

# 단일 테스트 클래스 실행
./gradlew test --tests "com.example.bootstrap.account.application.service.AuthServiceTest"

# 정적 분석만
task lint

# Docker 인프라 (PostgreSQL 15432, Redis 16379)
task docker:infra:up
task docker:infra:down
```

### 프론트엔드 (`web/` 디렉토리)

```bash
pnpm dev          # 개발 서버 (port 3000)
pnpm build        # tsc + vite build
pnpm typecheck    # tsc --noEmit
pnpm lint         # Biome 검사
pnpm lint:fix     # Biome 자동 수정
```

## 아키텍처

### API 레이어 구조

도메인별 패키지 분리 후 레이어 적용:

```
{domain}/controller → application/service → domain/model + repository → infrastructure
global/ (security, exception, response, cache, config)
```

- `account/` — 인증, 계정 관리, OAuth2
- `ai/` — OpenAI 채팅 (동기/SSE)
- `batch/` — 만료 토큰 정리
- `global/` — 횡단 관심사 (JWT, Redis, 예외, 응답 envelope)

모든 DB 접근은 R2DBC Reactive (`Mono`/`Flux`). JDBC는 Flyway 마이그레이션 + Spring Batch 전용.

### 프론트엔드 구조

Feature-Sliced Design 변형:

- `routes/` — TanStack Router 파일 기반 라우팅
- `features/{domain}/` — 도메인 슬라이스 (components, hooks, store, schema)
- `components/ui/` — shadcn/ui 기반 UI 프리미티브
- `stores/` — Zustand 전역 클라이언트 상태
- `providers/` — React Query, 인증 등 Provider 래핑

## 핵심 패턴

### API — 반드시 따를 것

**Reactive 에러 처리:**
```java
return repository.findByEmail(email)
        .switchIfEmpty(Mono.error(new BusinessException(ErrorCode.AUTH_004)))
        .flatMap(account -> ...);
```

**DTO는 Java record, 엔티티는 수동 getter/setter (Lombok 금지):**
```java
public record LoginRequest(String email, String password) {}
```

**생성자 주입만 사용 (`@Autowired` 필드 주입 금지):**
```java
public AuthService(final AccountRepository repo, final PasswordEncoder encoder) { ... }
```

**모든 API 응답은 `ApiResponse<T>` envelope:**
```java
ApiResponse.success("메시지", data)
ApiResponse.error("AUTH_001", "message")
```

**에러 코드 형식:** `DOMAIN_NNN` (예: `AUTH_001`, `ACCOUNT_002`, `MENU_001`)

**블로킹 코드는 `Schedulers.boundedElastic()`으로 격리.**

**Flyway 마이그레이션:** V1, V2 절대 수정 금지. 신규는 `V3__` 이후로 추가.

### 프론트엔드 — 반드시 따를 것

**파일명:** `kebab-case` (예: `use-auth-mutation.ts`, `login-form.tsx`)

**Biome 설정:** 2 spaces, 100자 줄 길이, single quotes, trailing commas ES5

**Zod 폼 검증, 메시지는 한국어:**
```typescript
z.string().email('유효한 이메일 주소를 입력해주세요')
```

**서버 상태 = TanStack Query, 클라이언트 전역 상태 = Zustand**

## 테스트 패턴

**단위 테스트 (`*Test.java`):** `@ExtendWith(MockitoExtension.class)`, Spring context 없음, `@BeforeEach`에서 대상 클래스 수동 생성

**통합 테스트 (`*IT.java`):** `@SpringBootTest + @Import(TestcontainersConfig.class)`, PostgreSQL/Redis는 Testcontainers

**Reactive 테스트:** `StepVerifier.create(...).assertNext(...).verifyComplete()`

**테스트 메서드 명명:** `methodUnderTest_scenario_expectation` (예: `login_withValidCredentials_returnsTokenResponse`)

**JaCoCo 60% 라인 커버리지 필수** — `./gradlew check`가 강제 적용. 엔티티(`domain/model/`), 설정(`config/`), 응답 envelope(`global/response/`)은 제외됨.

## 환경 설정

API 로컬 실행 시 필요한 환경변수 (`task run:local`이 자동 설정):
- `R2DBC_URL`, `JDBC_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`
- `OPENAI_API_KEY` (없으면 `placeholder-key` 기본값)
- `SPRING_PROFILES_ACTIVE=local`

설정 파일: `api/src/main/resources/application-local.yml` (로컬), `application-prod.yml` (프로덕션)

## 주의 사항

- `web/src/features/auth/lib/mock-auth-api.ts` — 프론트엔드 인증이 현재 mock API 사용 중. 실 API 미연동 상태.
- `AccountController.deleteMe()`에서 Authorization 헤더 직접 파싱 (`substring(7)`) — null 체크 없는 취약 패턴.
- `users.role` 컬럼은 레거시 코드 호환성을 위해 유지. RBAC용 `roles` 테이블과 병행.
- ADMIN bypass는 JWT `authorities` 클레임으로만 판정 (DB 재조회 금지).
