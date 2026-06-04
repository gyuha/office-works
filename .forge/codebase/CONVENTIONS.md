---
last_mapped_commit: 494e665f81fbd274fdf9d64df89b97a66a3839b3
mapped: 2026-06-05
---

# 코드베이스 규칙 및 패턴

## API (Spring Boot WebFlux)

### DTO 및 엔티티

- **DTO**: Java record로 정의. 검증 애너테이션 `@NotBlank`, `@Email` 등을 적용. 예: `api/src/main/java/com/example/bootstrap/account/application/dto/LoginRequest.java`
- **엔티티**: R2DBC `@Table` 엔티티는 수동 getter/setter만 사용. Lombok `@Getter/@Setter` 절대 금지. 예: `api/src/main/java/com/example/bootstrap/account/domain/model/Account.java`

### 의존성 주입

- **생성자 주입만 사용**. `@Autowired` 필드 주입 금지.
- final 필드로 선언. 예: `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java`
- Javadoc에서 각 파라미터 문서화.

### API 응답

- **모든 응답은 `ApiResponse<T>` 래퍼 사용**. `api/src/main/java/com/example/bootstrap/global/response/ApiResponse.java`
- 성공: `ApiResponse.success("메시지", data)` 또는 `ApiResponse.success("메시지")`
- 실패: `ApiResponse.error("에러코드", "메시지")`
- 검증 실패: `ApiResponse.validationError("COMMON_001", "메시지", List<FieldError>)`
- 응답은 record로 정의되며 null 필드를 제외하기 위해 `@JsonInclude(JsonInclude.Include.NON_NULL)` 적용.

### 에러 코드

- **형식**: `DOMAIN_NNN` (예: `AUTH_001`, `ACCOUNT_001`, `MENU_002`)
- `api/src/main/java/com/example/bootstrap/global/exception/ErrorCode.java`에서 정의.
- 도메인별 그룹: AUTH, ACCOUNT, AI, BATCH, MENU, COMMON
- 각 코드는 HTTP 상태와 i18n 메시지 키를 쌍으로 정의.

### Reactive 에러 처리

- **`switchIfEmpty(Mono.error(...))`로 null 체크**.
  ```java
  return accountRepository.findByEmail(request.email())
      .switchIfEmpty(Mono.error(new BusinessException(ErrorCode.AUTH_004)))
      .flatMap(account -> ...);
  ```
- `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java`

### 블로킹 코드 격리

- CPU/IO 블로킹 작업은 `Schedulers.boundedElastic()`으로 격리.
- Redis 연산은 `ReactiveRedisTemplate` 사용. 예: `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtBlacklistService.java`

### 데이터베이스 마이그레이션

- **Flyway V1, V2 절대 수정 금지**. 신규 마이그레이션은 V3 이후로 추가.
- 마이그레이션 파일: `api/src/main/resources/db/migration/`
- V1: Account, AI 도메인 테이블
- V2: Spring Batch 5.x 메타데이터 + 시퀀스
- V3: 메뉴 RBAC 스키마

---

## 웹 (React TypeScript)

### 파일명 규칙

- **kebab-case** 필수. 예:
  - `use-auth-mutation.ts`
  - `login-form.tsx`
  - `modal-store.ts`
- 위치: `web/src/features/auth/hooks/use-auth-mutation.ts`, `web/src/features/auth/components/login-form.tsx`

### Biome 포매팅

설정 파일: `web/biome.json`

- 들여쓰기: 2 spaces (indentWidth: 2)
- 줄 길이: 100자 (lineWidth: 100)
- 따옴표: single quotes (quoteStyle: "single")
- 후행 쉼표: ES5 (trailingCommas: "es5")

### Zod 폼 검증

- 한국어 메시지 필수.
- 예: `web/src/features/auth/schema/auth.schema.ts`
  ```typescript
  const loginSchema = z.object({
    email: z.string().email('유효한 이메일 주소를 입력해주세요'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  });
  ```

### 상태 관리

- **서버 상태**: TanStack Query (`@tanstack/react-query`) — 예: `web/src/features/auth/hooks/use-auth-mutation.ts`
  ```typescript
  return useMutation({
    mutationFn: (data: LoginInput) => mockLogin(data),
    onSuccess: (response) => { ... },
  });
  ```
- **클라이언트 전역 상태**: Zustand — 예: `web/src/features/auth/store/auth.store.ts`
  ```typescript
  export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    user: null,
    setUser: (user) => set({ isAuthenticated: true, user }),
  }));
  ```

### 구조 (Feature-Sliced Design 변형)

- `routes/` — TanStack Router 파일 기반 라우팅
- `features/{domain}/` — 도메인 슬라이스
  - `components/` — 컴포넌트 (예: `login-form.tsx`)
  - `hooks/` — 커스텀 훅 (예: `use-auth-mutation.ts`)
  - `store/` — Zustand 스토어 (예: `auth.store.ts`)
  - `schema/` — Zod 스키마 (예: `auth.schema.ts`)
  - `types/` — 타입 정의
  - `lib/` — 헬퍼/API 함수
- `components/ui/` — shadcn/ui 기반 UI 프리미티브
- `stores/` — 전역 클라이언트 상태 (모달 등)

### React Hook Form + Zod

- `Form.tsx` 래퍼로 react-hook-form + zod 통합.
- 예: `web/src/features/auth/components/login-form.tsx`
  ```typescript
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  ```
