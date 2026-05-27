# Testing Patterns

**Analysis Date:** 2026-05-27

## Overview

Two separate test suites for two separate codebases:
- **`api/`** — JUnit 5 / Mockito / Testcontainers (Java/Spring)
- **`web/`** — Node.js assertion scripts (no test framework)

---

## API Testing (Java/Spring)

### Test Framework

**Runner:** JUnit 5 (JUnit Platform)
- Dependency: `spring-boot-starter-test` (includes JUnit 5, Mockito, AssertJ)
- Config: `api/build.gradle` (`tasks.named('test') { useJUnitPlatform() }`)

**Assertion Library:** AssertJ
- `assertThat(value).isEqualTo(...)`, `.isInstanceOf(...)`, `.isNotNull()`, `.containsExactly(...)`, `.isBetween(...)`

**Reactive Testing:** Project Reactor `StepVerifier`
- Dependency: `reactor-test`

**Integration Test Infrastructure:** Testcontainers
- PostgreSQL 16 Alpine container
- Redis 7 Alpine container
- Auto-wired via `@ServiceConnection` in `TestcontainersConfig`

**Run Commands:**
```bash
./gradlew test                    # Run all tests
./gradlew test jacocoTestReport   # Run tests + generate coverage report
./gradlew check                   # Run tests + enforce 60% coverage threshold
```

### Test File Organization

**Location:** Mirror the main source tree under `api/src/test/java/`

```
api/src/test/java/com/example/bootstrap/
├── global/
│   ├── TestcontainersConfig.java          # Shared IT infrastructure
│   ├── ActuatorHealthIT.java
│   ├── FlywayMigrationIT.java
│   ├── cache/RedisCacheUtilTest.java
│   ├── exception/
│   │   ├── BusinessExceptionTest.java
│   │   ├── ErrorCodeTest.java
│   │   └── GlobalExceptionHandlerTest.java
│   ├── response/
│   │   ├── ApiResponseTest.java
│   │   └── PageResponseTest.java
│   └── security/jwt/
│       ├── JwtAuthenticationFilterTest.java
│       ├── JwtBlacklistServiceTest.java
│       └── JwtTokenProviderTest.java
├── account/
│   ├── application/service/
│   │   ├── AccountServiceTest.java
│   │   └── AuthServiceTest.java
│   ├── controller/
│   │   ├── AccountControllerIT.java
│   │   └── AuthControllerIT.java
│   └── infrastructure/oauth2/
│       ├── GoogleOAuth2HandlerTest.java
│       └── KakaoOAuth2HandlerTest.java
├── ai/
│   ├── application/service/AiChatServiceTest.java
│   └── controller/AiChatControllerTest.java
└── batch/
    └── application/job/ExpiredTokenCleanupJobTest.java
```

**Naming:**
- Unit tests: `{ClassName}Test.java`
- Integration tests: `{ClassName}IT.java`

### Test Structure

**Unit Test Suite:**
```java
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 단위 테스트")
class AuthServiceTest {

    // Constants at top of class
    private static final String EMAIL = "test@example.com";

    // Mocks declared with @Mock (field injection by Mockito)
    @Mock private AccountRepository accountRepository;
    @Mock private JwtTokenProvider jwtTokenProvider;

    // Subject under test constructed manually in @BeforeEach
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(accountRepository, jwtTokenProvider, ...);
    }

    // Section dividers: // ── sectionName ──────────────────────────
    // Test method naming: methodUnderTest_scenario_expectation

    @Test
    @DisplayName("login: 이메일과 비밀번호가 올바르면 TokenResponse를 반환한다")
    void login_withValidCredentials_returnsTokenResponse() {
        // arrange: stub mocks
        when(accountRepository.findByEmail(EMAIL)).thenReturn(Mono.just(account));
        // act + assert via StepVerifier
        StepVerifier.create(authService.login(new LoginRequest(EMAIL, PASSWORD)))
                .assertNext(response -> assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN))
                .verifyComplete();
    }
}
```

**Integration Test Suite:**
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@ActiveProfiles("local")
@Import(TestcontainersConfig.class)
@DisplayName("AuthController 통합 테스트")
class AuthControllerIT {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    @DisplayName("POST /auth/register — 신규 이메일로 회원가입 시 201과 AccountResponse를 반환한다")
    void register_withNewEmail_returns201AndAccountResponse() {
        webTestClient.post().uri(REGISTER_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.code").isEqualTo("SUCCESS");
    }
}
```

**Patterns:**
- `@BeforeEach void setUp()` for test subject construction
- `@AfterEach void tearDown()` for cleanup (e.g., `LocaleContextHolder.resetLocaleContext()`)
- Section dividers with ASCII comments for logical grouping
- `@DisplayName` on both class and every method — Korean for API behavior, English for pure logic

### Mocking

**Framework:** Mockito (via `MockitoExtension`)

**Patterns:**
```java
// Field injection via @Mock annotation
@Mock private AccountRepository accountRepository;

// Stubbing
when(accountRepository.findByEmail(EMAIL)).thenReturn(Mono.just(account));
when(jwtTokenProvider.isValid(TOKEN)).thenReturn(true);

// Argument matchers
when(mockObj.method(any())).thenReturn(result);
when(mockObj.method(anyString())).thenReturn(result);
when(mockObj.method(anyLong())).thenReturn(result);
when(mockObj.method(eq(specificValue), isNull(), anyString(), any(Locale.class))).thenReturn("msg");

// Verification
verify(repository).delete(entity);
verify(jwtTokenProvider, never()).generateAccessToken(anyLong(), anyString(), anyString());
```

**Helper stub methods (private):**
```java
// Define reusable stub helpers at the bottom of the test class
private void stubSyncCall(final String responseContent) {
    when(chatClient.prompt()).thenReturn(promptSpec);
    when(promptSpec.user(anyString())).thenReturn(promptSpec);
    when(promptSpec.call()).thenReturn(callResponseSpec);
    when(callResponseSpec.content()).thenReturn(responseContent);
}
```

**What to Mock:**
- Repositories (R2DBC): return `Mono.just(entity)` or `Mono.empty()`
- External clients: `JwtTokenProvider`, `PasswordEncoder`, `ChatClient`
- Infrastructure services: `JwtBlacklistService`

**What NOT to Mock:**
- The subject under test itself
- Simple value objects / records / DTOs
- In integration tests: all dependencies — use real containers via Testcontainers

### Reactive Testing with StepVerifier

**Success path:**
```java
StepVerifier.create(authService.login(request))
        .assertNext(response -> {
            assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
        })
        .verifyComplete();
```

**Error path:**
```java
StepVerifier.create(authService.login(request))
        .expectErrorSatisfies(e -> {
            assertThat(e).isInstanceOf(BusinessException.class);
            assertThat(((BusinessException) e).getErrorCode()).isEqualTo(ErrorCode.AUTH_004);
        })
        .verify();
```

**Flux streaming:**
```java
StepVerifier.create(aiChatService.stream(request))
        .expectNext("Hello", ", ", "World", "!")
        .verifyComplete();
```

**Partial emission then error:**
```java
StepVerifier.create(aiChatService.stream(request))
        .expectNext("partial", " response")
        .expectErrorSatisfies(error -> { ... })
        .verify();
```

### Test Fixtures and Factories

**Pattern:** Private static `build*()` helper methods in the test class

```java
private static Account buildAccount(Long id, String email, String password) {
    Account a = new Account();
    a.setId(id);
    a.setEmail(email);
    a.setPassword(password);
    a.setNickname("User");
    a.setRole("USER");
    a.setEmailVerified(true);
    return a;
}

private static RefreshToken buildRefreshToken(Long id, Long userId, String token) {
    RefreshToken rt = new RefreshToken();
    rt.setId(id);
    rt.setUserId(userId);
    rt.setToken(token);
    rt.setExpiredAt(LocalDateTime.now().plusDays(14));
    return rt;
}
```

**Integration Test Data:** Generated inline with `UUID.randomUUID()` to avoid conflicts between test runs:
```java
String uid = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
String email = "reg_" + uid + "@example.com";
```

### Testcontainers Configuration

**Shared config:** `api/src/test/java/com/example/bootstrap/global/TestcontainersConfig.java`

```java
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {

    @Bean
    @ServiceConnection
    public PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
            .withDatabaseName("bootstrap_test")
            .withUsername("bootstrap")
            .withPassword("bootstrap");
    }

    @Bean
    @ServiceConnection
    public RedisContainer redisContainer() {
        return new RedisContainer(DockerImageName.parse("redis:7-alpine"));
    }
}
```

**Usage in IT classes:**
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
@Import(TestcontainersConfig.class)
class SomeControllerIT { ... }
```

**Docker compatibility note:** `jvmArgs '-Dapi.version=1.44'` set globally in `build.gradle` for Docker Engine 29+ compatibility.

### Coverage

**Requirements:** 60% line coverage (enforced by JaCoCo — build fails below threshold)
- Tool: JaCoCo 0.8.12
- Threshold set in `build.gradle`: `minimum = 0.60`

**Exclusions from coverage:**
- `**/*MapperImpl.class` — MapStruct generated
- `**/BootstrapApplication.class` — entry point
- `**/domain/model/**` — R2DBC entity value objects
- `**/config/**` — Spring wiring classes
- `**/global/response/**` — envelope DTOs
- `**/global/exception/code/**` — error code enums

**View Coverage:**
```bash
./gradlew jacocoTestReport
# HTML: api/build/reports/jacoco/test/html/index.html
# XML:  api/build/reports/jacoco/test/jacocoTestReport.xml
```

### Test Types

**Unit Tests (`*Test.java`):**
- No Spring context — `@ExtendWith(MockitoExtension.class)` only
- Subject instantiated manually via constructor in `@BeforeEach`
- Fast: no I/O, no containers
- Location: mirrors main package structure

**Integration Tests (`*IT.java`):**
- Full Spring context: `@SpringBootTest(webEnvironment = RANDOM_PORT)`
- Real PostgreSQL + Redis via Testcontainers
- HTTP requests via `WebTestClient`
- Profile: `@ActiveProfiles("local")`
- Slower: container startup required

---

## Web Testing (TypeScript)

### Test Approach

The web frontend uses **plain Node.js assertion scripts** — not a test framework like Vitest or Jest. Test files are `.test.ts` files in `web/src/sample/` that throw `Error` on assertion failure when executed directly.

**No test runner configured** — no `vitest.config.*`, `jest.config.*` found. Tests are script-style.

**Run:**
```bash
# Tests appear to be run via node/tsx directly, not via npm test
# No test script found in package.json
```

### Test File Organization

**Location:** Co-located with sample feature code in `web/src/sample/`

```
web/src/sample/
├── auth/
│   ├── sign-in-page.test.ts           # Schema validation + AST source code checks
│   ├── sign-up-page.test.ts           # Schema validation checks
│   ├── sign-in-form-ui.test.ts
│   ├── sign-up-form-ui.test.ts
│   ├── otp-page.test.ts
│   ├── auth-demo-submit-handlers.test.ts
│   └── forgot-password-page.test.ts
├── layout/
│   └── navigation.test.ts
└── errors/
    └── maintenance-error-route.test.ts
```

### Test Structure

**Pattern:** Top-level imperative assertions (no `describe`/`it`/`test` blocks)

```typescript
// Direct schema parsing
const parsedValidValues = sampleSignInSchema.safeParse(validSignInValues);

if (!parsedValidValues.success) {
  throw new Error('Sign-in schema must accept a valid email and password.');
}

// Assertion helper functions at the bottom of the file
assertRejectedField(
  { email: '', password: 'password' },
  'email',
  sampleSignInValidationMessages.emailRequired
);
```

**Source code AST validation** (unique pattern): Tests use TypeScript compiler API (`typescript` package) to parse source files and assert structural constraints:
- Import declarations reference the correct component
- Route files use `createFileRoute` with correct path
- Forbidden patterns (network calls, redirects, mutations) are absent via regex scan

```typescript
import ts from 'typescript';

const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
// Walk AST to find JSX elements, imports, variable declarations
```

**Forbidden pattern enforcement:** Test files define arrays of `{ pattern: RegExp, reason: string }` and scan all referenced source files for violations:
```typescript
const forbiddenSourcePatterns = [
  { pattern: /\bfetch\s*\(/, reason: 'Network fetch calls are forbidden...' },
  { pattern: /\buseMutation\b/, reason: 'Mutation hooks are forbidden...' },
  // ...
];
```

### What Is Tested (Web)

- **Zod schema validation:** Valid input acceptance, invalid input rejection, single-error-per-field constraint, input trimming behavior
- **Demo submit handler behavior:** Handler returns `demo-only` kind with expected message
- **Source code structure:** Route files import correct components, use correct paths
- **Source code constraints:** Sample auth pages contain no real auth (no `fetch`, no mutations, no redirects, no toast)

### What Is NOT Tested (Web)

- Component rendering
- User interaction
- API integration
- Routing behavior
- Store mutations

---

*Testing analysis: 2026-05-27*
