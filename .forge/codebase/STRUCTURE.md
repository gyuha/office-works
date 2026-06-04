---
last_mapped_commit: 494e665f81fbd274fdf9d64df89b97a66a3839b3
mapped: 2026-06-05
---

# 디렉토리 구조 및 파일 위치 (Directory Structure)

## 1. 백엔드 구조 (API)

### 1.1 Java 소스 트리 (src/main/java)

```
api/src/main/java/com/example/bootstrap/
├── BootstrapApplication.java          ← Spring Boot 엔트리 포인트
│
├── account/                           ← 인증 및 계정 도메인
│   ├── controller/
│   │   ├─ AuthController.java         (POST /api/v1/auth/**)
│   │   └─ AccountController.java      (계정 조회/수정)
│   │
│   ├── application/
│   │   ├─ service/
│   │   │  ├─ AuthService.java         (로그인, 토큰, 로그아웃)
│   │   │  └─ AccountService.java      (회원가입, 계정 CRUD)
│   │   │
│   │   └─ dto/
│   │      ├─ RegisterRequest.java
│   │      ├─ AccountResponse.java
│   │      ├─ LoginRequest.java
│   │      ├─ TokenResponse.java
│   │      ├─ RefreshRequest.java
│   │      ├─ LogoutRequest.java
│   │      └─ SocialAuthRequest.java
│   │
│   ├── domain/
│   │   ├─ model/
│   │   │  ├─ Account.java             (@Table("users"))
│   │   │  └─ RefreshToken.java        (@Table("refresh_tokens"))
│   │   │
│   │   └─ repository/
│   │      ├─ AccountRepository.java   (R2DBC)
│   │      ├─ RefreshTokenRepository.java
│   │      └─ SocialAccountRepository.java
│   │
│   └── infrastructure/
│       └─ oauth2/
│          ├─ AbstractOAuth2Handler.java
│          ├─ GoogleOAuth2Handler.java
│          ├─ KakaoOAuth2Handler.java
│          └─ OAuthResponse.java
│
├── ai/                                ← OpenAI 챗봇 도메인
│   ├── controller/
│   │   └─ AiChatController.java       (POST/GET /api/v1/ai/chat**)
│   │
│   ├── application/
│   │   ├─ service/
│   │   │  └─ AiChatService.java       (Spring AI ChatClient 래핑)
│   │   │
│   │   └─ dto/
│   │      ├─ ChatRequest.java
│   │      └─ ChatResponse.java
│   │
│   └── (domain 없음 - 외부 API 의존)
│
├── batch/                             ← Spring Batch 도메인
│   ├── controller/
│   │   └─ BatchController.java        (POST /api/v1/admin/batch/**)
│   │
│   └── application/
│       ├─ job/
│       │  └─ ExpiredTokenCleanupJob.java
│       │
│       ├─ service/
│       │  └─ BatchService.java
│       │
│       └─ dto/
│          └─ BatchJobRequest.java
│
├── menu/                              ← RBAC 메뉴/권한 도메인
│   ├── controller/
│   │   └─ MenuController.java         (GET /api/menus/**)
│   │
│   ├── application/
│   │   ├─ service/
│   │   │  └─ MenuPermissionService.java
│   │   │
│   │   └─ dto/
│   │      ├─ AdminMenuResponse.java
│   │      └─ MyMenuResponse.java
│   │
│   └── domain/
│       ├─ model/
│       │  ├─ Menu.java               (@Table("menus"))
│       │  ├─ Role.java               (@Table("roles"))
│       │  ├─ UserRole.java           (@Table("user_roles"))
│       │  ├─ RoleMenuPermission.java  (@Table("role_menu_permissions"))
│       │  └─ UserMenuPermission.java  (@Table("user_menu_permissions"))
│       │
│       └─ repository/
│          ├─ MenuRepository.java      (R2DBC)
│          ├─ RoleRepository.java
│          ├─ UserRoleRepository.java
│          ├─ RoleMenuPermissionRepository.java
│          └─ UserMenuPermissionRepository.java
│
└── global/                            ← 크로스커팅 관심사
    ├── config/
    │   ├─ SecurityConfig.java         (Spring WebFlux Security)
    │   ├─ BatchConfig.java            (Spring Batch JDBC TxnMgr)
    │   ├─ AiConfig.java               (Spring AI ChatClient Bean)
    │   ├─ R2dbcConfig.java            (R2DBC ConnectionFactory)
    │   ├─ JdbcConfig.java             (JDBC DataSource - Flyway, Batch)
    │   ├─ WebFluxConfig.java          (CORS, 리액티브 설정)
    │   ├─ I18nConfig.java             (MessageSource - i18n)
    │   └─ OpenApiConfig.java          (Swagger/SpringDoc)
    │
    ├── exception/
    │   ├─ BusinessException.java      (커스텀 예외)
    │   ├─ ErrorCode.java              (에러 코드 enum)
    │   └─ GlobalExceptionHandler.java (@RestControllerAdvice)
    │
    ├── response/
    │   ├─ ApiResponse.java            (Generic 응답 Envelope)
    │   └─ PageResponse.java           (페이징 응답)
    │
    ├── security/
    │   ├─ ApiAccessDeniedHandler.java (권한 거부 핸들러)
    │   └─ MenuAuthorizationBean.java  (메뉴 권한 Bean)
    │   │
    │   └─ jwt/
    │      ├─ JwtTokenProvider.java    (HS256 생성/검증)
    │      ├─ JwtProperties.java       (@ConfigurationProperties)
    │      ├─ JwtAuthenticationFilter.java (WebFilter)
    │      └─ JwtBlacklistService.java (Redis 블랙리스트)
    │
    └── cache/
        └─ RedisCacheUtil.java        (제네릭 Redis 캐시)
```

### 1.2 리소스 파일 (src/main/resources)

```
api/src/main/resources/
├── application.yml                    ← 기본 설정
├── application-local.yml              ← 로컬 환경 설정
├── application-prod.yml               ← 운영 환경 설정
│
├── logback-local.xml                  ← 로컬 로그 설정
├── logback-prod.xml                   ← 운영 로그 설정 (JSON)
│
├── db/
│   └─ migration/                      ← Flyway 스키마 마이그레이션
│      ├─ V1__init.sql                 (users, oauth_accounts, ai_chat_*, refresh_tokens)
│      ├─ V2__batch_schema.sql         (Spring Batch 메타 테이블)
│      └─ V3__menu_rbac.sql            (menus, roles, permissions)
│
└─ i18n/                               ← 국제화 메시지
   ├─ messages.properties              (기본)
   ├─ messages_ko.properties           (한국어)
   └─ messages_en.properties           (영어)
```

### 1.3 테스트 구조 (src/test/java)

```
api/src/test/java/com/example/bootstrap/
├── account/
│   ├── application/
│   │   └─ service/
│   │      ├─ AuthServiceTest.java
│   │      └─ AccountServiceTest.java
│   │
│   ├── controller/
│   │   └─ AuthControllerTest.java
│   │
│   └── infrastructure/
│       └─ oauth2/
│          └─ GoogleOAuth2HandlerTest.java
│
├── ai/
│   ├── application/
│   │   └─ service/
│   │      └─ AiChatServiceTest.java
│   │
│   └── controller/
│       └─ AiChatControllerTest.java
│
├── batch/
│   └── application/
│       └─ job/
│          └─ ExpiredTokenCleanupJobTest.java
│
└── global/
    ├── security/
    │   └─ jwt/
    │      ├─ JwtTokenProviderTest.java
    │      └─ JwtAuthenticationFilterTest.java
    │
    ├── exception/
    │   └─ GlobalExceptionHandlerTest.java
    │
    └── response/
        └─ ApiResponseTest.java
```

### 1.4 빌드 및 설정 파일

```
api/
├── build.gradle                       ← Gradle 빌드 설정
│   ├─ dependencies (Spring Boot, R2DBC, Redis, Spring AI, ...)
│   ├─ jacoco (커버리지 60% 검증)
│   ├─ checkstyle (정적 분석)
│   └─ spotbugs (버그 검출)
│
├── gradle.properties                  ← Gradle 프로퍼티
├── settings.gradle                    ← Gradle 멀티 프로젝트 설정
│
├── docker-compose.yml                 ← PostgreSQL, Redis, Prometheus, Grafana
├── Dockerfile                         ← 애플리케이션 이미지
├── .env.example                       ← 환경변수 템플릿
│
├── config/
│   ├─ checkstyle/
│   │  └─ checkstyle.xml               ← Checkstyle 규칙
│   │
│   └─ spotbugs/
│      └─ exclude.xml                  ← SpotBugs 제외 패턴
│
└── Taskfile.yml                       ← Task 명령 (./gradlew 래퍼)
```

---

## 2. 프론트엔드 구조 (Web)

### 2.1 소스 트리 (src/)

```
web/src/
├── routes/                            ← TanStack Router 파일 기반 라우팅
│   ├─ __root.tsx                      (루트 레이아웃)
│   ├─ index.tsx                       (/)
│   ├─ sample.tsx                      (/sample)
│   │
│   ├─ auth/
│   │  ├─ login.tsx                    (/auth/login)
│   │  └─ signup.tsx                   (/auth/signup)
│   │
│   ├─ sample/                         (샘플 페이지 - /sample/**)
│   │  ├─ index.tsx
│   │  ├─ dashboard.tsx
│   │  ├─ chats.tsx
│   │  ├─ tasks.tsx
│   │  ├─ users.tsx
│   │  ├─ apps.tsx
│   │  ├─ errors.tsx
│   │  ├─ help-center.tsx
│   │  ├─ settings.tsx
│   │  └─ settings/
│   │     ├─ index.tsx
│   │     ├─ account.tsx
│   │     ├─ appearance.tsx
│   │     ├─ billing.tsx
│   │     ├─ notifications.tsx
│   │     ├─ privacy.tsx
│   │     └─ ...
│   │
│   ├─ test/
│   │  └─ modal.tsx                    (/test/modal)
│   │
│   └─ routeTree.gen.ts                (자동 생성 - Vite 플러그인)
│
├── features/                          ← Feature-Sliced Design (도메인별 기능)
│   └─ auth/
│      ├─ components/
│      │  ├─ LoginForm.tsx
│      │  └─ SignupForm.tsx
│      │
│      ├─ hooks/
│      │  └─ useAuth.ts
│      │
│      ├─ lib/
│      │  └─ authApi.ts                (API 호출 함수)
│      │
│      ├─ store/
│      │  └─ auth.store.ts             (Zustand)
│      │
│      ├─ schema/
│      │  └─ authSchema.ts             (Zod 검증 스키마)
│      │
│      └─ types/
│         └─ auth.ts
│
├── components/                        ← 공용 컴포넌트
│   ├─ ui/                             (shadcn/ui + 자체 구현)
│   │  ├─ button.tsx
│   │  ├─ input.tsx
│   │  ├─ card.tsx
│   │  ├─ dialog.tsx
│   │  ├─ select.tsx
│   │  ├─ table.tsx
│   │  ├─ form.tsx
│   │  ├─ tooltip.tsx
│   │  ├─ dropdown-menu.tsx
│   │  ├─ command.tsx
│   │  ├─ popover.tsx
│   │  ├─ modal/
│   │  │  ├─ modal-manager.tsx         (모달 관리자)
│   │  │  └─ modal-context.tsx
│   │  └─ sonner.tsx                   (토스트)
│   │
│   ├─ layout/
│   │  ├─ Header.tsx
│   │  ├─ Sidebar.tsx
│   │  └─ Footer.tsx
│   │
│   ├─ dev/
│   │  └─ (개발 도구 컴포넌트)
│   │
│   └─ theme-toggle.tsx
│
├── stores/                            ← 전역 상태 (Zustand)
│   ├─ modal-store.ts                  (모달 상태 관리)
│   ├─ modal.types.ts
│   └─ auth.store.ts
│
├── lib/
│   ├─ router.ts                       (TanStack Router 인스턴스)
│   ├─ api.ts                          (Axios 클라이언트 + 인터셉터)
│   └─ utils.ts
│
├── hooks/
│   └─ (전역 커스텀 훅)
│
├── providers/
│   └─ app-providers.tsx               (QueryClientProvider, RouterProvider)
│
├── sample/                            ← 샘플/데모 데이터
│   ├─ dashboard/
│   ├─ auth/
│   ├─ users/
│   ├─ chats/
│   ├─ tasks/
│   ├─ layout/
│   ├─ apps/
│   ├─ help-center/
│   ├─ errors/
│   ├─ settings/
│   ├─ smoke/
│   ├─ i18n/
│   │  ├─ locales/
│   │  │  ├─ en/
│   │  │  │  ├─ common.json
│   │  │  │  └─ ...
│   │  │  └─ ko/
│   │  │     ├─ common.json
│   │  │     └─ ...
│   │  └─ i18n.config.ts
│   │
│   └─ lib/
│      └─ (샘플 유틸)
│
├── styles/
│   └─ globals.css                     (Tailwind + 전역 스타일)
│
├── App.tsx                            (현재 사용 안 함)
└── main.tsx                           (Vite 엔트리 포인트)
```

### 2.2 설정 파일

```
web/
├── package.json                       ← npm/pnpm 의존성
│   ├─ React 19, Vite 6
│   ├─ TanStack Router 1.95, Query 5.75
│   ├─ Zustand 5, Zod 3
│   ├─ Tailwind CSS v4
│   ├─ react-hook-form 7
│   └─ Biome (린터/포맷터)
│
├── tsconfig.json                      ← TypeScript 설정
├── vite.config.ts                     ← Vite + TanStack Router 플러그인
├── tailwind.config.ts                 ← Tailwind CSS 설정
├── biome.json                         ← Biome 린팅 규칙
│
├── .env.example                       ← 환경변수 템플릿
└── (node_modules/, dist/, .next 등은 .gitignore)
```

---

## 3. 명명 규칙 (Naming Conventions)

### 3.1 Java (Backend)

| 항목 | 규칙 | 예 |
|------|------|-----|
| 클래스 | PascalCase | `AuthController`, `JwtTokenProvider` |
| 메서드 | camelCase | `login()`, `issueTokens()` |
| 상수 | UPPER_SNAKE_CASE | `CLAIM_EMAIL`, `TYPE_ACCESS` |
| 패키지 | lowercase | `com.example.bootstrap.account` |
| Entity (@Table) | snake_case | `users`, `refresh_tokens`, `oauth_accounts` |
| Repository | {Entity}Repository | `AccountRepository`, `RefreshTokenRepository` |
| Service | {Domain}Service | `AccountService`, `AuthService` |
| Controller | {Domain}Controller | `AuthController`, `AiChatController` |
| DTO | {Operation}{Response\|Request} | `AccountResponse`, `LoginRequest` |
| Exception | BusinessException | `new BusinessException(ErrorCode.AUTH_004)` |

### 3.2 TypeScript/React (Frontend)

| 항목 | 규칙 | 예 |
|------|------|-----|
| 컴포넌트 | PascalCase.tsx | `LoginForm.tsx`, `UserTable.tsx` |
| 파일 | kebab-case.ts(x) | `auth-api.ts`, `modal-store.ts` |
| 함수 | camelCase | `useAuth()`, `fetchChats()` |
| 상수 | UPPER_SNAKE_CASE | `API_BASE_URL`, `TOAST_DURATION` |
| 타입/Interface | PascalCase | `AuthUser`, `ChatMessage` |
| Zustand Store | use{Store}Store | `useAuthStore()`, `useModalStore()` |
| Hook | use{Feature} | `useAuth()`, `useForm()` |
| Enum | PascalCase | `HttpMethod`, `UserRole` |

---

## 4. 주요 파일 위치 (Key File Locations)

### 4.1 컨트롤러 위치

```
AuthController          : api/src/main/java/.../account/controller/AuthController.java
AiChatController        : api/src/main/java/.../ai/controller/AiChatController.java
BatchController         : api/src/main/java/.../batch/controller/BatchController.java
MenuController          : api/src/main/java/.../menu/controller/MenuController.java
```

### 4.2 서비스 위치

```
AuthService             : api/src/main/java/.../account/application/service/AuthService.java
AccountService          : api/src/main/java/.../account/application/service/AccountService.java
AiChatService           : api/src/main/java/.../ai/application/service/AiChatService.java
MenuPermissionService   : api/src/main/java/.../menu/application/service/MenuPermissionService.java
```

### 4.3 리포지토리 위치

```
AccountRepository       : api/src/main/java/.../account/domain/repository/AccountRepository.java
RefreshTokenRepository  : api/src/main/java/.../account/domain/repository/RefreshTokenRepository.java
MenuRepository          : api/src/main/java/.../menu/domain/repository/MenuRepository.java
RoleRepository          : api/src/main/java/.../menu/domain/repository/RoleRepository.java
```

### 4.4 Entity 위치

```
Account                 : api/src/main/java/.../account/domain/model/Account.java
RefreshToken            : api/src/main/java/.../account/domain/model/RefreshToken.java
Menu                    : api/src/main/java/.../menu/domain/model/Menu.java
Role                    : api/src/main/java/.../menu/domain/model/Role.java
```

### 4.5 Global 모듈 위치

```
JwtTokenProvider        : api/src/main/java/.../global/security/jwt/JwtTokenProvider.java
JwtAuthenticationFilter : api/src/main/java/.../global/security/jwt/JwtAuthenticationFilter.java
JwtBlacklistService     : api/src/main/java/.../global/security/jwt/JwtBlacklistService.java
GlobalExceptionHandler  : api/src/main/java/.../global/exception/GlobalExceptionHandler.java
ApiResponse<T>          : api/src/main/java/.../global/response/ApiResponse.java
RedisCacheUtil          : api/src/main/java/.../global/cache/RedisCacheUtil.java
SecurityConfig          : api/src/main/java/.../global/config/SecurityConfig.java
```

### 4.6 마이그레이션 위치

```
V1__init.sql            : api/src/main/resources/db/migration/V1__init.sql
V2__batch_schema.sql    : api/src/main/resources/db/migration/V2__batch_schema.sql
V3__menu_rbac.sql       : api/src/main/resources/db/migration/V3__menu_rbac.sql
```

### 4.7 설정 파일 위치

```
application.yml         : api/src/main/resources/application.yml
application-local.yml   : api/src/main/resources/application-local.yml
application-prod.yml    : api/src/main/resources/application-prod.yml
```

### 4.8 프론트엔드 주요 파일

```
Router                  : web/src/lib/router.ts
API Client              : web/src/lib/api.ts
Auth Store              : web/src/features/auth/store/auth.store.ts
AuthForm Components     : web/src/features/auth/components/
App Providers           : web/src/providers/app-providers.tsx
Global Styles          : web/src/styles/globals.css
```

---

## 5. 빌드 산출물 위치

### 5.1 백엔드 빌드

```
api/build/
├── classes/main/           ← 컴파일된 .class 파일
├── reports/
│   ├─ jacoco/              ← JaCoCo 커버리지 리포트 (HTML)
│   ├─ checkstyle/          ← Checkstyle 리포트
│   └─ spotbugs/            ← SpotBugs 리포트
└── libs/
   └─ bootstrap-0.1.0-SNAPSHOT.jar  ← 최종 실행 JAR
```

### 5.2 프론트엔드 빌드

```
web/dist/                  ← 프로덕션 빌드 산출물
├── index.html
├── assets/
│   ├─ index-{hash}.js
│   └─ index-{hash}.css
└─ routeTree.gen.ts (개발 시에만, 빌드에 미포함)
```

---

## 6. 환경변수 및 설정

### 6.1 .env 파일 위치

```
api/.env                    ← 백엔드 환경변수 (Docker Compose용)
web/.env.local              ← 프론트엔드 환경변수 (Vite)
```

### 6.2 주요 환경변수

**Backend (.env)**:
```
POSTGRES_DB=bootstrap
POSTGRES_USER=bootstrap
POSTGRES_PASSWORD=bootstrap
JWT_SECRET=...
OPENAI_API_KEY=...
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

**Frontend (.env.local)**:
```
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_NAME=Office Works
```

---

## 7. 테스트 파일 위치

### 7.1 단위 테스트 (Unit Test)

```
api/src/test/java/com/example/bootstrap/
├── account/application/service/AuthServiceTest.java
├── ai/application/service/AiChatServiceTest.java
├── global/security/jwt/JwtTokenProviderTest.java
└── global/exception/GlobalExceptionHandlerTest.java
```

### 7.2 통합 테스트 (Integration Test)

```
api/src/test/java/com/example/bootstrap/
├── account/controller/AuthControllerTest.java
├── ai/controller/AiChatControllerTest.java
└── batch/application/job/ExpiredTokenCleanupJobTest.java
```

---

## 8. 레이아웃 다이어그램

### 8.1 API 엔드포인트 경로

```
/api/v1/
├── auth/              (공개)
│   ├─ POST   register
│   ├─ POST   login
│   ├─ POST   refresh
│   ├─ POST   logout
│   └─ POST   social/{provider}
│
├── ai/                (인증 필수)
│   ├─ POST   chat
│   └─ GET    chat/stream
│
├── admin/             (ADMIN 역할)
│   └─ batch/
│       └─ POST   expired-tokens
│
└─ menus/              (인증 필수)
   ├─ GET  /           (ADMIN 전용 - 전체 메뉴)
   └─ GET  /my         (인증 사용자 - 접근 가능 메뉴)

/actuator/            (공개 + ADMIN)
├─ health
├─ prometheus
└─ info

/swagger-ui.html      (로컬만 공개)
```

### 8.2 프론트엔드 라우트 경로

```
/                     ← 홈
/auth/
├─ login              ← 로그인
└─ signup             ← 회원가입

/sample/              ← 샘플 페이지
├─ dashboard
├─ chats
├─ users
├─ tasks
├─ apps
├─ settings
│  ├─ account
│  ├─ appearance
│  ├─ billing
│  └─ ...
└─ ...

/test/
└─ modal              ← 모달 테스트
```

---

## 9. 관계도

### 9.1 도메인 간 관계

```
Account 도메인
├── users 테이블
│   ├── 1:N refresh_tokens
│   └── 1:N oauth_accounts
│
Menu 도메인
├── menus 테이블
├── roles 테이블
├── user_roles (M:N users ↔ roles)
├── role_menu_permissions (M:N roles ↔ menus)
└── user_menu_permissions (M:N users ↔ menus) [override]

AI 도메인 (외부 API - DB 미탑재)
├── ai_chat_sessions 테이블
│   └── 1:N ai_chat_messages
```

### 9.2 서비스 의존성

```
AuthController
├── AuthService
│   ├── AccountRepository (R2DBC)
│   ├── RefreshTokenRepository (R2DBC)
│   ├── JwtTokenProvider
│   └── JwtBlacklistService (Redis)
│
AiChatController
├── AiChatService
│   └── ChatClient (Spring AI → OpenAI)
│
MenuController
├── MenuPermissionService
│   ├── MenuRepository
│   ├── RoleRepository
│   ├── UserRoleRepository
│   └── RoleMenuPermissionRepository
```

---

**참고**:
- 모든 경로는 절대경로로 표기
- R2DBC Repository는 Reactive 비동기 인터페이스
- Flyway 마이그레이션은 JDBC 기반 (순차 실행)
- Spring Batch는 JDBC 메타데이터 + 배치 로직
- 프론트엔드 라우트는 Vite 플러그인으로 자동 생성
