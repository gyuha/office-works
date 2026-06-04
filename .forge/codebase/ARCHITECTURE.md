---
last_mapped_commit: 494e665f81fbd274fdf9d64df89b97a66a3839b3
mapped: 2026-06-05
---

# 아키텍처 설계 (Architecture)

Spring Boot WebFlux 기반 리액티브 백엔드와 React + TanStack Router 프론트엔드로 구성된 모놀리틱 모놀리쉬 구조입니다. 도메인 주도 설계(DDD) 원칙을 따르며, 각 도메인은 계층별 책임이 명확히 분리되어 있습니다.

## 1. 백엔드 아키텍처 (API)

### 1.1 전체 계층 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                              │
├─────────────────────────────────────────────────────────────┤
│ JwtAuthenticationFilter (JWT 검증, SecurityContext 설정)     │
├─────────────────────────────────────────────────────────────┤
│ SecurityFilterChain (역할 기반 경로 인증)                    │
├─────────────────────────────────────────────────────────────┤
│ Controller (REST 엔드포인트)                                 │
│   ├─ AuthController         (/api/v1/auth/**)               │
│   ├─ AiChatController       (/api/v1/ai/chat)               │
│   ├─ MenuController         (/api/menus/*)                  │
│   └─ BatchController        (/api/v1/admin/batch/*)         │
├─────────────────────────────────────────────────────────────┤
│ Application Service Layer (Business Logic)                   │
│   ├─ AccountService         (계정 CRUD)                      │
│   ├─ AuthService            (로그인, 토큰 발급/갱신)         │
│   ├─ AiChatService          (AI 채팅 동기/스트리밍)          │
│   ├─ MenuPermissionService  (메뉴 권한)                      │
│   └─ OAuth2Handler(s)       (Google, Kakao)                 │
├─────────────────────────────────────────────────────────────┤
│ Domain Layer (Entity, Repository, Model)                     │
│   ├─ account/domain/model   (Account, RefreshToken)          │
│   ├─ account/domain/repo    (R2DBC Repository Interface)     │
│   ├─ ai/application/dto     (ChatRequest, ChatResponse)      │
│   └─ menu/domain/*          (Menu, Role, RoleMenuPerm)      │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure Layer (DB, Cache, External APIs)              │
│   ├─ R2DBC Connection Pool  (PostgreSQL 비동기)              │
│   ├─ Redis Cache (JWT 블랙리스트, 캐싱)                      │
│   ├─ Spring AI Client       (OpenAI gpt-4o-mini)             │
│   └─ Spring Batch Job       (만료 토큰 정리)                 │
├─────────────────────────────────────────────────────────────┤
│ Global Cross-Cutting Concerns                                │
│   ├─ JwtTokenProvider       (HS256 생성/검증)                │
│   ├─ JwtBlacklistService    (Redis 블랙리스트)               │
│   ├─ GlobalExceptionHandler (API 에러 Envelope)             │
│   ├─ RedisCacheUtil         (제네릭 캐시 유틸)               │
│   └─ ApiResponse<T>         (응답 표준화)                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 도메인별 계층 분석

#### 1.2.1 Account 도메인 (인증, OAuth2)

**경로**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/account`

```
account/
├── controller/
│   ├─ AuthController          ← POST /api/v1/auth/** (인증 불필요)
│   └─ AccountController
├── application/
│   ├─ service/
│   │  ├─ AuthService          ← 로그인, 토큰 갱신(Rotation), 로그아웃
│   │  └─ AccountService       ← 회원가입, 계정 조회/수정
│   └─ dto/
│      ├─ RegisterRequest, AccountResponse
│      ├─ LoginRequest, TokenResponse
│      ├─ RefreshRequest, LogoutRequest
│      └─ SocialAuthRequest
├── domain/
│   ├─ model/
│   │  ├─ Account             ← @Table("users")
│   │  └─ RefreshToken        ← @Table("refresh_tokens")
│   └─ repository/             ← R2DBC Reactive Repository
│      ├─ AccountRepository
│      ├─ RefreshTokenRepository
│      └─ SocialAccountRepository
└── infrastructure/
    └─ oauth2/
       ├─ AbstractOAuth2Handler
       ├─ GoogleOAuth2Handler
       └─ KakaoOAuth2Handler
```

**흐름**:
1. 클라이언트가 `/api/v1/auth/register` POST → `AuthController`
2. `AuthController` → `AccountService.register()`
3. 이메일 중복 검사 → DB 저장 (BCrypt 인코딩)
4. `ApiResponse<AccountResponse>` 201 Created 반환

**로그인 플로우**:
- 사용자 이메일/비밀번호 검증
- `AuthService.login()` → 토큰 발급 (`JwtTokenProvider`)
- Access Token (30분 유효) + Refresh Token (14일 유효) 반환
- Refresh Token은 DB에 저장 (Rotation 관리)

#### 1.2.2 AI 도메인 (OpenAI 채팅)

**경로**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/ai`

```
ai/
├── controller/
│   └─ AiChatController       ← GET/POST /api/v1/ai/chat**
├── application/
│   ├─ service/
│   │  └─ AiChatService       ← Spring AI ChatClient 래핑
│   └─ dto/
│      ├─ ChatRequest         ← {message, model?}
│      └─ ChatResponse        ← {content}
└── (domain/ 없음 - AI는 외부 API 의존도 높음)
```

**흐름**:
- 동기 채팅 `POST /api/v1/ai/chat`
  ```
  ChatRequest → AiChatService.chat()
  → Mono.fromCallable() + Schedulers.boundedElastic()
  → ChatClient.prompt().user().call().content()
  → ChatResponse Envelope 반환
  ```

- SSE 스트리밍 `GET /api/v1/ai/chat/stream?message=...`
  ```
  ChatRequest → AiChatService.stream()
  → ChatClient.stream().content()
  → Flux<String> 토큰 스트림
  ```

**특징**:
- 블로킹 OpenAI 호출을 `boundedElastic()` 스레드풀에서 격리 실행
- SSE는 네이티브 Flux 반환으로 리액티브 유지
- 예외: `BusinessException(ErrorCode.AI_001)` 변환

#### 1.2.3 Batch 도메인 (만료 토큰 정리)

**경로**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/batch`

```
batch/
├── controller/
│   └─ BatchController        ← POST /api/v1/admin/batch/**
├── application/
│   ├─ job/
│   │  └─ ExpiredTokenCleanupJob
│   ├─ service/
│   │  └─ BatchService
│   └─ dto/
│      └─ BatchJobRequest
```

**흐름**:
- 관리자만 접근 가능 (`@PreAuthorize("hasRole('ADMIN')")`)
- Spring Batch JobLauncher로 Job 트리거
- `batch_job_instance`, `batch_job_execution` 메타데이터 관리 (V2__batch_schema.sql)

#### 1.2.4 Menu 도메인 (RBAC 권한 관리)

**경로**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/menu`

```
menu/
├── controller/
│   └─ MenuController         ← GET /api/menus/** (인증 필수)
├── application/
│   ├─ service/
│   │  └─ MenuPermissionService
│   └─ dto/
│      ├─ AdminMenuResponse  (메뉴 전체 + 권한)
│      └─ MyMenuResponse      (사용자 접근 가능 메뉴)
├── domain/
│   ├─ model/
│   │  ├─ Menu               ← @Table("menus")
│   │  ├─ Role               ← @Table("roles")
│   │  ├─ UserRole           ← @Table("user_roles")
│   │  ├─ RoleMenuPermission  ← @Table("role_menu_permissions")
│   │  └─ UserMenuPermission  ← @Table("user_menu_permissions")
│   └─ repository/            ← R2DBC Repository
│      ├─ MenuRepository
│      ├─ RoleRepository
│      ├─ UserRoleRepository
│      ├─ RoleMenuPermissionRepository
│      └─ UserMenuPermissionRepository
```

**특징**:
- RBAC (Role-Based Access Control) 구현
- 테이블 구조: `menus` ← `role_menu_permissions` ← `roles` ← `user_roles` ← `users`
- V3__menu_rbac.sql 마이그레이션으로 관리
- 향후 작업: 기존 `users.role` 컬럼과 새 `roles` 테이블 통합

### 1.3 Global 크로스커팅 관심사 (Cross-Cutting Concerns)

**경로**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/global`

#### 1.3.1 JWT 보안 (`global/security/jwt/`)

**JwtTokenProvider** (`JwtTokenProvider.java`):
```java
// Access Token (30분)
generateAccessToken(long userId, String email, String role) → String

// Refresh Token (14일)
generateRefreshToken(long userId) → String

// 토큰 검증 및 Claims 파싱
isValid(String token) → boolean
parseClaims(String token) → Claims
```

**JwtAuthenticationFilter** (`JwtAuthenticationFilter.java`):
- 모든 HTTP 요청 인터셉트
- Authorization 헤더에서 "Bearer " 토큰 추출
- 유효 토큰 → `ReactiveSecurityContextHolder.withAuthentication()`
- 무효/없는 토큰 → 다음 필터로 통과 (authorizeExchange가 최종 판단)

**JwtBlacklistService** (`JwtBlacklistService.java`):
- Redis에 로그아웃/갱신된 토큰 저장
- Key: `jwt:blacklist:{token}`
- Value: 만료 시간으로 자동 삭제

#### 1.3.2 예외 처리 (`global/exception/`)

**ErrorCode** (enum):
- `ACCOUNT_001` - 중복 이메일
- `ACCOUNT_002` - 계정 없음
- `AUTH_001` - 잘못된 토큰 형식
- `AUTH_002` - 만료된 토큰
- `AUTH_003` - 블랙리스트 토큰
- `AUTH_004` - 잘못된 이메일/비밀번호
- `AUTH_005` - 토큰 재사용 감지
- `AUTH_006` - 미지원 OAuth2 Provider
- `AI_001` - AI 응답 오류

**GlobalExceptionHandler** (`GlobalExceptionHandler.java`):
```
BusinessException 또는 WebExchangeBindException
  ↓
resolveLocale (Accept-Language 헤더)
  ↓
MessageSource.getMessage() (i18n 메시지)
  ↓
ApiResponse.error() 또는 validationError() Envelope
  ↓
HTTP 상태 + JSON 응답
```

#### 1.3.3 응답 표준화 (`global/response/`)

**ApiResponse<T>** (Generic Record):
```java
record ApiResponse<T>(
  String code,           // "SUCCESS", "AUTH_001", ...
  String message,        // i18n 메시지
  T data,               // 응답 바디
  List<FieldError> errors // 유효성 검증 에러 목록 (null 제외)
)
```

모든 REST 응답은 이 Envelope을 통과합니다. 예:
```json
{
  "code": "SUCCESS",
  "message": "로그인이 완료되었습니다.",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  },
  "errors": null
}
```

#### 1.3.4 캐시 유틸 (`global/cache/`)

**RedisCacheUtil**:
- 제네릭 캐시 API
- `set(key, value, duration)` → Mono<Void>
- `get(key, type)` → Mono<Optional<T>>
- `delete(key)` → Mono<Boolean>

#### 1.3.5 설정 클래스 (`global/config/`)

| 설정 클래스 | 역할 |
|-----------|------|
| `SecurityConfig` | WebFlux Security, JWT Filter 등록, 경로 인증 규칙 |
| `BatchConfig` | Spring Batch JDBC TransactionManager (R2DBC와 분리) |
| `AiConfig` | Spring AI ChatClient Bean (OpenAI) |
| `R2dbcConfig` | R2DBC ConnectionFactory 설정 |
| `JdbcConfig` | JDBC DataSource 설정 (Flyway, Batch용) |
| `WebFluxConfig` | CORS, 리액티브 설정 |
| `I18nConfig` | MessageSource (i18n) |
| `OpenApiConfig` | Swagger/SpringDoc 설정 |

### 1.4 데이터베이스 흐름 (R2DBC Reactive)

```
┌─────────────────────────────────────────┐
│         R2DBC Connection Pool            │
│         (PostgreSQL 16)                  │
└─────────────────────────────────────────┘
         ↑                         ↓
    R2DBC Repository (Interface)  
    ├─ findByEmail(String)        → Mono<Account>
    ├─ findById(Long)             → Mono<Account>
    ├─ findByToken(String)        → Mono<RefreshToken>
    ├─ save(Entity)               → Mono<Entity>
    └─ deleteByUserId(Long)       → Mono<Void>
         ↓
    Reactive Stream
    (No blocking I/O)
```

**마이그레이션** (Flyway JDBC 기반):
- `V1__init.sql` - users, refresh_tokens, oauth_accounts, ai_chat_sessions, ai_chat_messages
- `V2__batch_schema.sql` - Spring Batch 메타데이터 테이블
- `V3__menu_rbac.sql` - 메뉴, 역할, 권한 테이블

**특징**:
- R2DBC는 논블로킹 드라이버 (비동기 쿼리)
- Flyway는 JDBC 기반 (스키마 마이그레이션 전담)
- Spring Batch JobRepository는 JDBC 사용 (BatchConfig.batchTransactionManager)

## 2. 프론트엔드 아키텍처 (Web)

### 2.1 전체 계층 구조

```
┌──────────────────────────────────────────────┐
│          Browser / DOM                       │
├──────────────────────────────────────────────┤
│  Routes (TanStack Router - File-based)      │
│  ├─ /                                        │
│  ├─ /auth/login, /auth/signup               │
│  ├─ /sample/** (Demo Pages)                 │
│  └─ /test/**                                 │
├──────────────────────────────────────────────┤
│  Layout & Providers                          │
│  ├─ AppProviders (Query, Router context)    │
│  ├─ ThemeToggle, Modals, Toaster            │
│  └─ TanStackRouterDevtools (dev)            │
├──────────────────────────────────────────────┤
│  Features (Domain Slices)                    │
│  ├─ features/auth/                          │
│  │  ├─ components/   (LoginForm, SignupForm)│
│  │  ├─ hooks/        (useAuth)              │
│  │  ├─ store/        (Zustand auth store)   │
│  │  ├─ lib/          (API 호출, 유틸)       │
│  │  ├─ schema/       (Zod 검증 스키마)      │
│  │  └─ types/        (TypeScript 타입)      │
│  └─ (추가 도메인별 슬라이스)                │
├──────────────────────────────────────────────┤
│  Components (UI)                             │
│  ├─ components/ui/  (shadcn/ui + custom)    │
│  ├─ components/layout/ (공용 레이아웃)      │
│  └─ components/dev/    (개발 도구)          │
├──────────────────────────────────────────────┤
│  Stores (Zustand State Management)           │
│  ├─ modal-store.ts    (모달 상태)            │
│  ├─ auth.store.ts     (인증 상태)            │
│  └─ (추가 도메인 스토어)                    │
├──────────────────────────────────────────────┤
│  Libraries & Utilities                       │
│  ├─ lib/router.ts     (TanStack Router 인스턴스) │
│  ├─ lib/api.ts        (API 클라이언트)      │
│  └─ lib/utils.ts      (헬퍼 함수)           │
├──────────────────────────────────────────────┤
│  External Libraries                          │
│  ├─ TanStack Query 5  (서버 상태)           │
│  ├─ Zustand           (클라이언트 상태)      │
│  ├─ react-hook-form 7 (폼 관리)             │
│  ├─ Zod               (런타임 검증)         │
│  ├─ Tailwind CSS v4   (스타일링)            │
│  └─ sonner            (토스트)              │
└──────────────────────────────────────────────┘
```

### 2.2 디렉토리 구조

**경로**: `/Users/gyuha/workspace/office-works/web/src`

```
src/
├── routes/                          # TanStack Router 파일 기반 라우팅
│   ├─ __root.tsx                   # 루트 레이아웃 (AppProviders 래핑)
│   ├─ index.tsx                    # / (홈)
│   ├─ auth/
│   │  ├─ login.tsx
│   │  └─ signup.tsx
│   ├─ sample/                      # 샘플 페이지
│   │  ├─ index.tsx
│   │  ├─ dashboard.tsx
│   │  ├─ settings/
│   │  ├─ users/
│   │  ├─ chats/
│   │  └─ ...
│   ├─ test/
│   │  └─ modal.tsx
│   └─ routeTree.gen.ts             # 자동 생성 라우트 트리 (Vite 플러그인)
│
├── features/                        # Feature-Sliced Design
│   ├─ auth/
│   │  ├─ components/               # 폼, 팝업 등
│   │  │  ├─ LoginForm.tsx
│   │  │  └─ SignupForm.tsx
│   │  ├─ hooks/                    # 커스텀 훅
│   │  │  └─ useAuth.ts
│   │  ├─ lib/                      # API 호출, 유틸
│   │  │  └─ authApi.ts
│   │  ├─ store/                    # Zustand
│   │  │  └─ auth.store.ts
│   │  ├─ schema/                   # Zod 스키마
│   │  │  └─ authSchema.ts
│   │  └─ types/
│   │     └─ auth.ts
│   └─ (추가 도메인)
│
├── components/                      # 공용 컴포넌트
│   ├─ ui/                          # shadcn/ui + 자체 구현
│   │  ├─ modal/                    # 모달 매니저
│   │  │  └─ modal-manager.tsx
│   │  ├─ button.tsx
│   │  ├─ input.tsx
│   │  └─ ...
│   ├─ layout/
│   │  ├─ Header.tsx
│   │  └─ Sidebar.tsx
│   ├─ dev/                         # 개발 도구
│   └─ theme-toggle.tsx             # 다크모드 전환
│
├── stores/                          # 전역 상태 (Zustand)
│   ├─ modal-store.ts               # 모달 상태
│   ├─ modal.types.ts               # 모달 타입
│   └─ auth.store.ts                # 인증 상태
│
├── lib/                             # 라이브러리/유틸
│   ├─ router.ts                    # TanStack Router 인스턴스
│   ├─ api.ts                       # Axios 기반 API 클라이언트
│   └─ utils.ts                     # 헬퍼 함수
│
├── providers/
│   └─ app-providers.tsx            # QueryClientProvider, RouterProvider
│
├── hooks/                           # 전역 커스텀 훅
│   └─ (공용 훅)
│
├── sample/                          # 샘플/데모 데이터
│   ├─ dashboard/
│   ├─ auth/
│   ├─ users/
│   ├─ chats/
│   ├─ tasks/
│   └─ ...
│
├── styles/
│   └─ globals.css                  # Tailwind + 전역 스타일
│
├── App.tsx                         # (현재 사용 안 함, 라우터 중심)
└── main.tsx                        # Vite 엔트리 포인트
```

### 2.3 요청/응답 흐름

#### 2.3.1 로그인 플로우

```
LoginForm.tsx (react-hook-form)
  ↓ onSubmit (이메일, 비밀번호)
AuthForm 검증 (Zod)
  ↓
authApi.login() [features/auth/lib/authApi.ts]
  ↓
axios POST /api/v1/auth/login
  ↓
(백엔드 처리)
  ↓
Response: { code, message, data: { accessToken, refreshToken } }
  ↓
useAuthStore.setUser() (Zustand)
  ↓
localStorage에 토큰 저장
  ↓
router.navigate('/') 리다이렉트
```

#### 2.3.2 인증된 요청 패턴

```
protected component (eg. ChatPage.tsx)
  ↓
useAuth() 훅 확인 (isAuthenticated)
  ↓
TanStack Query로 서버 상태 가져오기
  eg. useQuery({
    queryKey: ['chats'],
    queryFn: () => apiClient.get('/api/v1/ai/chat/...')
  })
  ↓
axios 인터셉터가 Authorization 헤더 자동 추가
  Headers: { Authorization: `Bearer ${accessToken}` }
  ↓
(백엔드 JwtAuthenticationFilter 검증)
  ↓
응답 수신 → 컴포넌트 리렌더
```

### 2.4 상태 관리 (State Management)

#### 2.4.1 Zustand 인증 스토어

**파일**: `src/features/auth/store/auth.store.ts`

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

// 사용
const { isAuthenticated, user } = useAuthStore();
```

#### 2.4.2 TanStack Query (서버 상태)

- `useQuery()` - GET 요청 (캐싱, 백그라운드 리페치)
- `useMutation()` - POST/PUT/DELETE 요청
- 자동 캐시 무효화 (queryClient.invalidateQueries)

#### 2.4.3 모달 상태 (Custom Store)

**파일**: `src/stores/modal-store.ts`

```typescript
useModalStore.open(type, data)  // 모달 열기
useModalStore.close()           // 모달 닫기
useModalStore.replace(type)     // 모달 교체
```

### 2.5 라우팅 (TanStack Router)

**파일**: `src/lib/router.ts`

```typescript
// 라우터 인스턴스 생성
export const router = createRouter({
  routeTree,
  context: { auth },
  ...
})

// 파일 기반 라우팅 (Vite 플러그인)
// src/routes/auth/login.tsx → /auth/login
// src/routes/sample.tsx → /sample
```

**특징**:
- 라우트 정의가 별도 config 없이 파일 위치로 자동 결정
- `routeTree.gen.ts` 자동 생성 (Vite @tanstack/router-plugin)
- Outlet, useRouterState, useNavigate 등 제공

## 3. 데이터 흐름 (End-to-End)

### 3.1 인증 플로우

```
클라이언트                     백엔드
  │
  ├─→ POST /api/v1/auth/register
  │                           ├─→ AuthController.register()
  │                           ├─→ AccountService.register()
  │                           │   - 이메일 중복 체크
  │                           │   - 비밀번호 BCrypt 인코딩
  │                           │   - Account 저장 (R2DBC)
  │                           └─→ ApiResponse<AccountResponse> 201
  ←─ 201 Created + 계정 정보 ←┤

  ├─→ POST /api/v1/auth/login
  │                           ├─→ AuthController.login()
  │                           ├─→ AuthService.login()
  │                           │   - 이메일 조회
  │                           │   - 비밀번호 검증
  │                           │   - Access/Refresh 토큰 생성
  │                           │   - Refresh Token DB 저장
  │                           └─→ ApiResponse<TokenResponse>
  ←─ 200 OK + {access, refresh} ←┤

  (토큰 저장: localStorage or sessionStorage)

  ├─→ GET /api/v1/ai/chat?message=...
  │   Header: Authorization: Bearer {accessToken}
  │                           ├─→ JwtAuthenticationFilter
  │                           │   - 토큰 추출, 검증
  │                           │   - SecurityContext 설정
  │                           ├─→ AiChatController.stream()
  │                           ├─→ AiChatService.stream()
  │                           └─→ Flux<String> SSE 토큰 스트림
  ←─ 200 OK + text/event-stream ←┤
```

### 3.2 토큰 갱신 (Refresh Token Rotation)

```
클라이언트                     백엔드
  │
  ├─→ POST /api/v1/auth/refresh
  │   Body: { refreshToken: "eyJ..." }
  │                           ├─→ AuthController.refresh()
  │                           ├─→ AuthService.refresh()
  │                           │   1. 토큰 유효성 확인
  │                           │   2. 블랙리스트 체크 (Redis)
  │                           │   3. DB에서 토큰 존재 확인
  │                           │   4. 기존 토큰 삭제
  │                           │   5. 새 토큰 발급 + DB 저장
  │                           └─→ ApiResponse<TokenResponse>
  ←─ 200 OK + {newAccess, newRefresh} ←┤

  (클라이언트: 새 토큰 저장, 기존 토큰 폐기)
```

### 3.3 로그아웃

```
클라이언트                     백엔드
  │
  ├─→ POST /api/v1/auth/logout
  │   Header: Authorization: Bearer {accessToken}
  │   Body: { refreshToken: "eyJ..." }
  │                           ├─→ AuthController.logout()
  │                           ├─→ AuthService.logout()
  │                           │   1. Access Token 블랙리스트 등록 (Redis, 30분)
  │                           │   2. Refresh Token 삭제 (DB)
  │                           └─→ ApiResponse.success()
  ←─ 200 OK ←┤

  (클라이언트: localStorage 토큰 삭제)
```

## 4. API 응답 표준 (ApiResponse Envelope)

모든 API 응답은 다음 구조를 따릅니다:

```json
{
  "code": "SUCCESS",
  "message": "로그인이 완료되었습니다.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
  },
  "errors": null
}
```

**에러 응답**:
```json
{
  "code": "AUTH_004",
  "message": "이메일 또는 비밀번호가 일치하지 않습니다.",
  "data": null,
  "errors": null
}
```

**유효성 검증 에러**:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "입력값 검증에 실패했습니다.",
  "data": null,
  "errors": [
    { "field": "email", "reason": "이메일 형식이 올바르지 않습니다." },
    { "field": "password", "reason": "비밀번호는 최소 8자 이상이어야 합니다." }
  ]
}
```

## 5. 보안 아키텍처

### 5.1 JWT 토큰 구조

**Access Token (HS256 HMAC)**:
```
Header: { alg: "HS256", typ: "JWT" }
Payload: {
  sub: "123",           # userId
  email: "user@ex.com",
  role: "USER",         # 또는 "ADMIN"
  type: "access",
  iat: 1234567890,
  exp: 1234569690       # 30분 후
}
Signature: HS256(header.payload, secret)
```

**Refresh Token (HS256 HMAC)**:
```
Header: { alg: "HS256", typ: "JWT" }
Payload: {
  sub: "123",
  type: "refresh",
  iat: 1234567890,
  exp: 1234567890 + 14days
}
Signature: HS256(header.payload, secret)
```

### 5.2 토큰 블랙리스트 (Redis)

로그아웃 및 갱신 시:
```
Redis Key: jwt:blacklist:{tokenJti}  또는 jwt:blacklist:{tokenValue}
Value: (empty)
TTL: token expiry까지
```

클라이언트 요청 시:
```
JwtAuthenticationFilter
  → token 추출
  → Redis에 blacklist 조회 (JwtBlacklistService.isBlacklisted())
  → 등록되면 무시
```

### 5.3 OAuth2 흐름

**Google/Kakao 소셜 로그인**:
```
1. 클라이언트가 OAuth2 provider로 로그인
2. provider access token 받음
3. POST /api/v1/auth/social/google (또는 kakao)
   Body: { accessToken: "..." }
4. 백엔드 GoogleOAuth2Handler.authenticate()
   - provider access token으로 사용자 정보 검증
   - DB에서 oauth_accounts 조회
   - 기존 계정 or 신규 계정 생성
5. Access/Refresh 토큰 발급
```

### 5.4 역할 기반 접근 제어 (RBAC)

**Spring Security 통합**:
```
JwtAuthenticationFilter
  → Token Claims에서 role 추출
  → SimpleGrantedAuthority("ROLE_" + role) 생성
  → SecurityContext.Authentication 설정

@PreAuthorize("hasRole('ADMIN')")
  → 메서드 레벨 권한 검사
```

**메뉴 권한 (New)** - V3__menu_rbac.sql:
```
roles (id, name)
user_roles (user_id, role_id)
menus (id, name, display_order, is_active)
role_menu_permissions (role_id, menu_id, can_read, can_write)
user_menu_permissions (user_id, menu_id, can_read, can_write) -- override
```

## 6. 캐싱 전략

### 6.1 Redis 사용처

| Key Pattern | 값 | TTL | 용도 |
|-------------|-----|-----|------|
| `jwt:blacklist:{token}` | (empty) | token expiry | 로그아웃 토큰 |
| `cache:key:{id}` | JSON | configurable | 비즈니스 데이터 |

### 6.2 TanStack Query 캐싱 (클라이언트)

```typescript
// 자동 캐싱
const { data } = useQuery({
  queryKey: ['chats', sessionId],
  queryFn: () => apiClient.get(`/api/v1/ai/chat/${sessionId}`),
  staleTime: 5 * 60 * 1000,     // 5분 캐시 유효
  gcTime: 10 * 60 * 1000,       // 10분 후 삭제
})

// 수동 무효화
const { mutate } = useMutation({
  mutationFn: () => apiClient.post('/api/v1/ai/chat', payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['chats'] })
  }
})
```

## 7. 에러 처리 및 복구

### 7.1 백엔드 예외 흐름

```
Request
  ↓
비즈니스 로직
  ├─ BusinessException(ErrorCode.AUTH_004, "...")
  └─ 또는 RuntimeException
  ↓
GlobalExceptionHandler.@ExceptionHandler
  ├─ resolveLocale (Accept-Language)
  ├─ messageSource.getMessage(errorCode)
  └─ ApiResponse.error() Envelope
  ↓
HTTP Response (해당 상태 코드 + JSON)
```

### 7.2 클라이언트 에러 처리

```typescript
// TanStack Query
const { isError, error } = useQuery(...)
if (isError) {
  const message = error.response?.data?.message
  toast.error(message)
}

// Axios 인터셉터
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token refresh or logout
      useAuthStore.clearUser()
      router.navigate('/auth/login')
    }
    return Promise.reject(error)
  }
)
```

## 8. 배포 및 프로파일

### 8.1 Spring 프로파일

| 프로파일 | 목적 | 주요 설정 |
|---------|------|---------|
| `local` | 로컬 개발 | Swagger 활성화, 상세 로그, `user`/`user` 계정 |
| `prod` | 운영 | Swagger 비활성화, JSON 로그, 엄격한 보안 |

### 8.2 환경변수 (.env)

```bash
# Database
POSTGRES_DB=bootstrap
POSTGRES_USER=bootstrap
POSTGRES_PASSWORD=bootstrap

# JWT
JWT_SECRET=bootstrap-secret-at-least-32-characters-long

# OAuth2
GOOGLE_CLIENT_ID=...
KAKAO_CLIENT_ID=...

# OpenAI
OPENAI_API_KEY=...

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,...

# Grafana
GF_ADMIN_USER=admin
GF_ADMIN_PASSWORD=admin
```

---

**참고**:
- 모든 DB 접근은 R2DBC 리액티브 (Mono/Flux)
- Flyway는 JDBC 기반 (스키마 마이그레이션 전담)
- Spring Batch도 JDBC 기반 (JobRepository, 만료 토큰 정리)
- 프론트엔드는 Feature-Sliced Design 원칙 준수
- 모든 API는 ApiResponse Envelope로 표준화
- JWT는 HS256 HMAC, 30분 (Access) + 14일 (Refresh)
