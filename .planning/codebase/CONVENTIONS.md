# Coding Conventions

**Analysis Date:** 2026-05-27

## Overview

This is a full-stack project with two separate codebases:
- **`api/`** — Java 21 / Spring Boot WebFlux (Reactive)
- **`web/`** — TypeScript / React 19 / Vite

Each codebase has distinct conventions enforced by separate tooling.

---

## API (Java) Conventions

### Naming Patterns

**Classes:**
- `PascalCase` for all types: `AuthService`, `GlobalExceptionHandler`, `JwtTokenProvider`
- Controllers: `{Domain}Controller` — `AuthController`, `AccountController`
- Services: `{Domain}Service` — `AuthService`, `AccountService`, `AiChatService`
- DTOs: `{Action}Request` / `{Action}Response` — `LoginRequest`, `TokenResponse`, `AccountResponse`
- Exceptions: `{Domain}Exception` — `BusinessException`
- Config: `{Feature}Config` — `SecurityConfig`, `BatchConfig`
- Tests: `{Class}Test` (unit), `{Class}IT` (integration)

**Methods:**
- `camelCase` for production code
- Test methods: `methodUnderTest_scenario_expectation` (snake_case allowed and enforced by Checkstyle suppression for `*Test.java` and `*IT.java`)
  - Example: `login_withValidCredentials_returnsTokenResponse`

**Fields:**
- `camelCase` instance fields
- `UPPER_SNAKE_CASE` for constants: `CLAIM_EMAIL`, `TYPE_ACCESS`, `ACCESS_TOKEN`
- `static final` constants in test classes prefixed with purpose: `EMAIL`, `PASSWORD`, `ENCODED`

**Packages:**
- All lowercase, dot-separated: `com.example.bootstrap.account.application.service`

**Error Codes:**
- `DOMAIN_NNN` format: `AUTH_001`, `ACCOUNT_002`, `AI_003`, `COMMON_001`
- Defined in `api/src/main/java/com/example/bootstrap/global/exception/ErrorCode.java`

### Code Style

**Formatter:** Checkstyle 10.23.0 with Google Java Style base
- Config: `api/config/checkstyle/checkstyle.xml`
- Max line length: **120 characters** (packages and imports excluded)
- Indentation: **spaces** (tabs forbidden)
- No trailing whitespace
- Newline at end of file

**Static Analysis:** SpotBugs 4.9.3
- Config: `api/config/spotbugs/exclude.xml`
- Effort: `max`, report level: `medium`

### Import Organization

- No star imports (`import java.util.*` forbidden)
- No redundant or unused imports
- No `IllegalImport` (JDK internal packages blocked)

### Dependency Injection

- **Constructor injection only** — no `@Autowired` on fields
- All injected fields declared `final`
- Constructor parameters marked `final`

```java
public AuthService(
        final AccountRepository accountRepository,
        final PasswordEncoder passwordEncoder) {
    this.accountRepository = accountRepository;
    this.passwordEncoder = passwordEncoder;
}
```

### Domain Model Pattern

- R2DBC entities use plain Java class with explicit getters/setters (no Lombok `@Data`)
- DTOs use Java `record` types: `public record RegisterRequest(String email, String password, String nickname) {}`
- Entity classes annotated with `@Table`, `@Id`, `@CreatedDate`, `@LastModifiedDate`
- No Lombok on entity or DTO classes — all manually written

### Reactive Programming (WebFlux)

- All service methods return `Mono<T>` or `Flux<T>`
- Error signals thrown via `Mono.error(new BusinessException(ErrorCode.XXX))`
- Use `switchIfEmpty(Mono.error(...))` to represent not-found cases
- Use `Mono.defer(...)` to wrap synchronous validation at subscription time
- Chain operations via `.flatMap()`, `.then()`, `.thenReturn()`

```java
return accountRepository.findByEmail(request.email())
        .switchIfEmpty(Mono.error(new BusinessException(ErrorCode.AUTH_004)))
        .flatMap(account -> {
            ...
            return issueTokens(account);
        });
```

### Error Handling

**Strategy:** Domain-specific `BusinessException` wrapping `ErrorCode` enum

```java
throw new BusinessException(ErrorCode.AUTH_004);
// or with custom message:
throw new BusinessException(ErrorCode.AUTH_001, "custom detail");
```

**Global handler:** `api/src/main/java/com/example/bootstrap/global/exception/GlobalExceptionHandler.java`
- `@RestControllerAdvice` handles `BusinessException`, `WebExchangeBindException`, `Exception`
- All responses wrapped in `ApiResponse<T>` envelope: `{code, message, data, errors}`
- i18n messages via `MessageSource` + `Accept-Language` header
- `LocaleContextHolder` always reset in `finally` block to prevent thread pollution

**API Response Envelope:**
```java
// Success (data)
ApiResponse.success("메시지", data)
// Success (no data)
ApiResponse.success("메시지")
// Error
ApiResponse.error("AUTH_001", "message")
// Validation error
ApiResponse.validationError("COMMON_001", "message", fieldErrors)
```

### Comments and Javadoc

- Javadoc required on all `public` methods (enforced by Checkstyle)
  - Exception: `@Override`, `@Test`, `@Bean`, `@ExceptionHandler` annotations
- Javadoc required on all `public` types
  - Exception: `@SpringBootApplication`, `@Configuration`, `@RestController`, `@Service`, `@Repository`, `@Component`, `@Mapper`
- `@param` and `@return` tags optional (Checkstyle does not require them)
- `@throws` listed for `BusinessException` variants in service and controller Javadoc
- Korean language preferred for Javadoc content: `/** 인증 서비스. ... */`
- Section dividers using ASCII art: `// ── login ──────────────────`

### Modifier Order

Enforced by Checkstyle `ModifierOrder`: `public protected private abstract default static final transient volatile synchronized native strictfp`

---

## Web (TypeScript/React) Conventions

### Naming Patterns

**Files:**
- `kebab-case` for all files: `auth-store.ts`, `use-auth-mutation.ts`, `login-form.tsx`, `modal-store.ts`
- React components: `.tsx` extension
- Hooks: `use-{name}.ts` (prefix `use-`)
- Stores: `{name}.store.ts` or `{name}-store.ts`
- Schemas: `{name}.schema.ts`
- Types: `{name}.ts` in `types/` directory

**Functions/Variables:**
- `camelCase` for functions, variables, hooks
- `PascalCase` for React components and TypeScript types/interfaces
- Interface names prefixed with `I`: `IModalState`, `IModalStore`
- Custom hooks: `useMobile`, `useTheme`, `useLoginMutation`

**Exports:**
- Named exports preferred: `export function cn(...)`, `export const useAuthStore = ...`
- Default export for store hooks only: `export default useModal`

### Code Style

**Formatter/Linter:** Biome 1.9.4
- Config: `web/biome.json`
- Indent: **2 spaces**
- Line width: **100 characters**
- Quotes: **single quotes** in JS/TS
- Trailing commas: `es5`
- Import organization: **enabled** (Biome auto-sorts)

```json
{
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "es5" } }
}
```

**TypeScript:**
- `strict: true` + `noUnusedLocals: true` + `noUnusedParameters: true`
- Path alias `@/*` maps to `./src/*`
- Target: ES2022

### Import Organization

Biome auto-organizes imports. Observed order:
1. External packages (`react`, `@tanstack/...`, `zod`, etc.)
2. Internal path aliases (`@/lib/...`, `@/components/...`, `@/features/...`)
3. Relative imports (`../lib/mock-auth-api`, `./schema/auth.schema`)

### State Management

- **Zustand** for global client state
- Store pattern: `create<StoreType>((set, get) => ({ ...state, ...actions }))`
- Modal store uses `devtools` middleware: `create<IModalStore>()(devtools(...))`
- Auth store (feature-level): no middleware, minimal

```typescript
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ isAuthenticated: true, user }),
  clearUser: () => set({ isAuthenticated: false, user: null }),
}));
```

### Form Validation

- **Zod** schemas for all form validation
- `react-hook-form` + `@hookform/resolvers/zod` for form integration
- Schema file pattern: `{feature}.schema.ts` in `schema/` subdirectory
- Validation messages written in Korean

```typescript
export const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;
```

### Data Fetching

- **TanStack Query** (`@tanstack/react-query`) for server state
- Mutation hooks in `hooks/use-{feature}-mutation.ts`
- `useMutation` pattern with `mutationFn` + `onSuccess` callbacks

```typescript
export function useLoginMutation() {
  return useMutation({
    mutationFn: (data: LoginInput) => mockLogin(data),
    onSuccess: (response) => { ... },
  });
}
```

### Component Patterns

- UI primitives live in `web/src/components/ui/` (Radix UI / shadcn-based)
- Feature components in `web/src/features/{domain}/components/`
- Components use `cn()` helper (`clsx` + `tailwind-merge`) for conditional classes
- Props spread using `...props` with explicit `className` override
- `data-slot` attributes used on UI primitives for CSS container queries

```typescript
function Card({ className, size = 'default', ...props }: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return <div data-slot="card" data-size={size} className={cn('...base classes...', className)} {...props} />;
}
```

### Logging

- No structured logging in frontend — `console.*` only in development
- Toast notifications via `sonner`: `toast.success('메시지')`
- Korean messages preferred for user-facing toasts

### Comments

- No JSDoc in frontend code
- Inline comments for non-obvious logic only
- No TODO/FIXME found in `web/src/`

---

*Convention analysis: 2026-05-27*
