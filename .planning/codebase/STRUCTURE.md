# Codebase Structure

**Analysis Date:** 2026-05-27

## Directory Layout

```
office-works/                          # 프로젝트 루트 (모노레포)
├── api/                               # Spring Boot WebFlux API 서버
│   ├── build.gradle                   # Gradle 빌드 설정 (의존성, Checkstyle, SpotBugs, JaCoCo)
│   ├── config/
│   │   ├── checkstyle/               # Checkstyle 규칙 XML
│   │   └── spotbugs/                 # SpotBugs 제외 필터 XML
│   ├── docker/
│   │   ├── grafana/                  # Grafana 대시보드·데이터소스 프로비저닝
│   │   └── prometheus/               # Prometheus 스크레이프 설정
│   ├── docs/superpowers/specs/       # API 사양 문서
│   ├── gradle/wrapper/               # Gradle Wrapper
│   └── src/
│       ├── main/
│       │   ├── java/com/example/bootstrap/
│       │   │   ├── BootstrapApplication.java  # 애플리케이션 진입점
│       │   │   ├── account/          # 계정·인증 도메인
│       │   │   │   ├── controller/   # REST 컨트롤러
│       │   │   │   ├── application/
│       │   │   │   │   ├── dto/      # Request/Response 레코드
│       │   │   │   │   └── service/  # 비즈니스 서비스
│       │   │   │   ├── domain/
│       │   │   │   │   ├── model/    # R2DBC 엔티티
│       │   │   │   │   └── repository/ # ReactiveCrudRepository 인터페이스
│       │   │   │   └── infrastructure/
│       │   │   │       └── oauth2/   # Google/Kakao OAuth2 핸들러
│       │   │   ├── ai/               # AI 채팅 도메인
│       │   │   │   ├── controller/
│       │   │   │   └── application/
│       │   │   │       ├── dto/
│       │   │   │       └── service/
│       │   │   ├── batch/            # Spring Batch 도메인
│       │   │   │   ├── controller/
│       │   │   │   └── application/
│       │   │   │       ├── dto/
│       │   │   │       ├── job/      # Job/Step/Tasklet 설정
│       │   │   │       └── service/
│       │   │   └── global/           # 횡단 관심사
│       │   │       ├── cache/        # RedisCacheUtil
│       │   │       ├── config/       # Spring 설정 클래스
│       │   │       ├── exception/    # ErrorCode, BusinessException, GlobalExceptionHandler
│       │   │       ├── response/     # ApiResponse, PageResponse
│       │   │       └── security/
│       │   │           └── jwt/      # JwtTokenProvider, JwtAuthenticationFilter, JwtBlacklistService
│       │   └── resources/
│       │       ├── application.yml           # 공통 설정
│       │       ├── application-local.yml     # 로컬 프로파일 오버라이드
│       │       ├── application-prod.yml      # 프로덕션 프로파일 오버라이드
│       │       ├── db/migration/             # Flyway SQL 마이그레이션
│       │       │   ├── V1__init.sql          # 초기 스키마 (users, refresh_tokens, oauth_accounts, ai 테이블)
│       │       │   └── V2__batch_schema.sql  # Spring Batch 메타데이터 테이블
│       │       ├── i18n/                     # i18n 메시지 번들
│       │       ├── logback-local.xml         # 로컬 로그 설정
│       │       └── logback-prod.xml          # 프로덕션 JSON 로그 설정
│       └── test/
│           └── java/com/example/bootstrap/  # 테스트 (main 패키지 구조 미러링)
│
├── web/                               # React SPA 프론트엔드
│   ├── package.json                   # 의존성 (pnpm)
│   ├── vite.config.*                  # Vite 빌드 설정
│   ├── tsconfig.json                  # TypeScript 설정
│   ├── biome.json                     # Biome 린터/포매터 설정
│   ├── public/                        # 정적 파일
│   ├── docs/superpowers/             # 프론트엔드 명세·계획 문서
│   └── src/
│       ├── main.tsx                   # React 앱 진입점
│       ├── vite-env.d.ts
│       ├── routeTree.gen.ts           # TanStack Router 자동 생성 라우트 트리 (커밋됨)
│       ├── components/
│       │   ├── ui/                    # shadcn/ui 기반 공용 컴포넌트
│       │   │   ├── modal/             # 모달 매니저
│       │   │   ├── button.tsx, input.tsx, ...
│       │   │   └── auth-shell.tsx     # 인증 페이지 레이아웃 셸
│       │   ├── layout/               # 공용 레이아웃 컴포넌트
│       │   └── theme-toggle.tsx
│       ├── features/                  # 도메인 기능 슬라이스 (실제 기능)
│       │   └── auth/
│       │       ├── components/        # LoginForm, SignupForm
│       │       ├── hooks/             # useLoginMutation, useSignupMutation
│       │       ├── lib/               # mock-auth-api.ts (향후 실 API 클라이언트로 교체 예정)
│       │       ├── schema/            # Zod 입력 스키마
│       │       ├── store/             # auth.store.ts (Zustand)
│       │       └── types/             # auth.ts 타입 정의
│       ├── hooks/                     # 전역 공용 훅 (use-mobile, use-theme)
│       ├── lib/
│       │   ├── router.ts              # TanStack Router 인스턴스
│       │   └── utils.ts              # clsx/tailwind-merge cn() 헬퍼
│       ├── providers/
│       │   └── app-providers.tsx      # ReactQuery QueryClientProvider
│       ├── routes/                    # 파일 기반 라우트 정의 (TanStack Router)
│       │   ├── __root.tsx             # 루트 레이아웃 라우트
│       │   ├── index.tsx              # / (홈 페이지)
│       │   ├── sample.tsx             # /sample 레이아웃 라우트
│       │   ├── auth/                  # /auth/login, /auth/signup (실 인증 라우트)
│       │   ├── sample/                # /sample/* (데모 라우트 모음)
│       │   │   ├── dashboard.tsx
│       │   │   ├── users/             # $userId, $userId.edit, new
│       │   │   ├── settings/          # profile, account, display, notifications, appearance
│       │   │   ├── auth/              # 인증 UI 데모 변형들
│       │   │   └── errors/            # 401, 403, 404, 500, 503, maintenance
│       │   └── test/
│       │       └── modal.tsx          # 모달 테스트 페이지
│       ├── sample/                    # /sample/* 라우트에 바인딩된 UI 구현체
│       │   ├── apps/, chats/, dashboard/, errors/
│       │   ├── auth/, help-center/, settings/, tasks/, users/
│       │   ├── i18n/                  # i18next 설정 + locales/en, locales/ko
│       │   ├── layout/                # SampleAdminShell (사이드바 레이아웃)
│       │   ├── lib/                   # 샘플 전용 유틸
│       │   └── smoke/                 # 스모크 테스트
│       ├── stores/                    # 전역 Zustand 스토어
│       │   ├── modal-store.ts         # 모달 스택 (devtools 포함)
│       │   └── modal.types.ts
│       └── styles/
│           └── globals.css            # Tailwind 전역 스타일
│
└── .planning/
    └── codebase/                      # GSD 코드베이스 분석 문서
```

## Directory Purposes

**`api/src/main/java/com/example/bootstrap/{domain}/`:**
- Purpose: 도메인별 기능 코드 (account, ai, batch)
- Contains: controller, application(dto, service), domain(model, repository), infrastructure
- Key files: 각 도메인의 `*Controller.java`, `*Service.java`, 엔티티 모델

**`api/src/main/java/com/example/bootstrap/global/`:**
- Purpose: 모든 도메인에서 공유하는 횡단 관심사
- Contains: 보안 설정, JWT, 예외 처리, 응답 형식, Redis 캐시 유틸, 기타 Spring 설정 빈
- Key files: `SecurityConfig.java`, `GlobalExceptionHandler.java`, `ApiResponse.java`, `ErrorCode.java`, `JwtAuthenticationFilter.java`, `RedisCacheUtil.java`

**`api/src/main/resources/db/migration/`:**
- Purpose: Flyway SQL 마이그레이션 (버전 관리 스키마)
- Contains: `V{n}__{description}.sql` 파일
- Key files: `V1__init.sql`, `V2__batch_schema.sql`

**`web/src/features/`:**
- Purpose: 도메인 기능 슬라이스 — 실제 애플리케이션 기능 구현
- Contains: 각 도메인 슬라이스 (`auth/` 현재 유일), 내부에 components, hooks, lib, schema, store, types 서브폴더
- Key files: `auth/store/auth.store.ts`, `auth/hooks/use-auth-mutation.ts`

**`web/src/routes/`:**
- Purpose: TanStack Router 파일 기반 라우팅 — URL과 컴포넌트 바인딩
- Contains: 레이아웃 라우트(`__root.tsx`, `sample.tsx`), 페이지 라우트
- Key files: `__root.tsx`, `index.tsx`, `auth/login.tsx`, `auth/signup.tsx`

**`web/src/sample/`:**
- Purpose: 데모/샘플 UI — 실제 기능 외 UI 패턴 시연 (대시보드, 사용자 목록, 설정 등)
- Contains: 각 샘플 기능별 components, data, types 폴더 + i18n 설정
- Key files: `layout/components/sample-admin-shell.tsx`, `i18n/` 다국어 설정

**`web/src/components/ui/`:**
- Purpose: 재사용 가능한 UI 원시 컴포넌트 (shadcn/ui 기반 Radix UI 래퍼)
- Contains: button, input, dialog, table, form, modal 등 50+ 컴포넌트
- Key files: `modal/` 폴더 (Zustand modal-store 연동)

**`web/src/stores/`:**
- Purpose: 전역 Zustand 스토어 (features/에 속하지 않는 앱 수준 상태)
- Key files: `modal-store.ts` (모달 스택 상태 + devtools)

## Key File Locations

**Entry Points:**
- `api/src/main/java/com/example/bootstrap/BootstrapApplication.java`: API 서버 진입점
- `web/src/main.tsx`: 프론트엔드 진입점
- `web/src/routes/__root.tsx`: 프론트엔드 루트 레이아웃

**Configuration:**
- `api/src/main/resources/application.yml`: 공통 설정 (R2DBC, JDBC, Redis, JWT, CORS)
- `api/src/main/resources/application-local.yml`: 로컬 개발 설정 오버라이드
- `api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java`: 보안 설정
- `web/package.json`: 프론트엔드 의존성 (pnpm)
- `web/biome.json`: Biome 린터/포매터 설정

**Core Logic:**
- `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java`: 인증 핵심 로직
- `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java`: JWT 필터
- `api/src/main/java/com/example/bootstrap/global/exception/ErrorCode.java`: 에러 코드 enum
- `web/src/features/auth/store/auth.store.ts`: 프론트엔드 인증 상태
- `web/src/lib/router.ts`: 라우터 인스턴스

**Testing:**
- `api/src/test/java/com/example/bootstrap/`: 테스트 루트 (main 구조 미러링)

## Naming Conventions

**API 서버 (Java):**
- 파일: PascalCase — `AccountService.java`, `AuthController.java`
- 클래스: PascalCase — `AuthController`, `JwtAuthenticationFilter`
- 메서드/변수: camelCase — `findByEmail()`, `jwtTokenProvider`
- 상수: UPPER_SNAKE_CASE — `DELETE_EXPIRED_TOKENS_SQL`
- 패키지: lowercase — `com.example.bootstrap.account.application.service`
- DTO: `{Domain}{Action}Request.java`, `{Domain}Response.java` 패턴

**프론트엔드 (TypeScript/React):**
- 파일: kebab-case — `auth.store.ts`, `use-auth-mutation.ts`, `login-form.tsx`
- 라우트 파일: TanStack Router 컨벤션 — `$userId.tsx` (동적 파라미터), `$userId.edit.tsx` (중첩)
- 컴포넌트: PascalCase — `LoginForm`, `SampleAdminShell`
- 훅: `use-` 접두사 camelCase — `useLoginMutation`, `useAuthStore`
- 스토어: `{domain}.store.ts` 또는 `{domain}-store.ts`

## Where to Add New Code

**새 도메인 기능 (API):**
1. `api/src/main/java/com/example/bootstrap/{domain}/` 아래 새 패키지 생성
2. 레이어 순서: `domain/model/` → `domain/repository/` → `application/dto/` → `application/service/` → `controller/`
3. 에러 코드: `global/exception/ErrorCode.java`에 `{DOMAIN}_NNN` 패턴으로 추가
4. i18n 메시지: `src/main/resources/i18n/messages*.properties`에 동일 키 추가
5. 테스트: `api/src/test/java/com/example/bootstrap/{domain}/`에 미러링

**새 데이터베이스 테이블:**
- `api/src/main/resources/db/migration/V{다음번호}__{설명}.sql` 파일 추가
- 기존 파일 수정 금지 — 반드시 새 버전 파일 추가

**새 프론트엔드 기능:**
1. 도메인 슬라이스: `web/src/features/{domain}/` 아래 `components/`, `hooks/`, `lib/`, `schema/`, `store/`, `types/` 서브폴더
2. 라우트: `web/src/routes/{path}.tsx` — `createFileRoute()` 패턴 사용
3. 공용 UI 컴포넌트: `web/src/components/ui/{component-name}.tsx`
4. 전역 스토어 (도메인 무관): `web/src/stores/{name}-store.ts`

**새 API 클라이언트 (프론트엔드):**
- `web/src/features/{domain}/lib/{domain}-api.ts` (현재 `mock-auth-api.ts` 패턴 참조)
- 훅: `web/src/features/{domain}/hooks/use-{action}-mutation.ts` 또는 `use-{resource}-query.ts`

## Special Directories

**`web/src/routeTree.gen.ts`:**
- Purpose: TanStack Router가 자동 생성하는 라우트 트리
- Generated: Yes (Vite 플러그인 `@tanstack/router-plugin`)
- Committed: Yes — 빌드 없이도 타입 안전성 보장을 위해 커밋됨

**`api/src/main/resources/db/migration/`:**
- Purpose: 순서 보장 Flyway 마이그레이션
- Generated: No (수동 작성)
- Committed: Yes — 스키마 변경 이력 관리

**`api/build/`:**
- Purpose: Gradle 빌드 출력 (클래스, 보고서, JAR)
- Generated: Yes
- Committed: No

**`web/.next/` / `web/dist/`:**
- Purpose: Vite 빌드 출력
- Generated: Yes
- Committed: No

**`api/docker/`:**
- Purpose: 로컬 모니터링 스택 설정 (Grafana, Prometheus)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-05-27*
