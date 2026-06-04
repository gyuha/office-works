---
last_mapped_commit: 494e665f81fbd274fdf9d64df89b97a66a3839b3
mapped: 2026-06-05
---

# 기술 스택

모놀리식 리포지토리는 Spring Boot WebFlux 백엔드(`api/`)와 React SPA 프론트엔드(`web/`)로 구성됩니다.

## 백엔드 (API)

### 언어 및 런타임

- **Java 21** — `api/gradle.properties`에서 `javaVersion=21` 설정
- **Spring Boot 3.4.5** — `springBootVersion=3.4.5`

### 빌드 시스템

- **Gradle 8+** — `api/build.gradle`, `api/settings.gradle` 참조
- 프로젝트명: `spring-bootstrap` (`api/settings.gradle`)
- 그룹: `com.example` / 버전: `0.0.1-SNAPSHOT` (`api/gradle.properties`)
- **Task/Taskfile**: `Taskfile.yml`, `api/Taskfile.yml` — 개발 워크플로우 자동화

### 핵심 프레임워크 및 라이브러리

#### 웹/반응형

- **Spring WebFlux** — 비동기 리액티브 웹 프레임워크 (`spring-boot-starter-webflux`)
- **Reactor** — 리액티브 스트림 구현 (테스트 지원: `reactor-test`)

#### 데이터 액세스

- **R2DBC + PostgreSQL** — 리액티브 데이터베이스 드라이버
  - `spring-boot-starter-data-r2dbc`
  - `org.postgresql:r2dbc-postgresql`
- **JDBC + PostgreSQL** — Flyway 마이그레이션 및 Spring Batch용
  - `spring-boot-starter-jdbc`
  - `org.postgresql:postgresql` (런타임)

#### 데이터베이스 마이그레이션

- **Flyway** — JDBC 기반 스키마 마이그레이션 (`flyway-core`, `flyway-database-postgresql`)
  - 설정: `api/src/main/resources/application.yml` (위치: `classpath:db/migration`)
  - 환경별: local/prod 프로파일 분리, Flyway 전용 계정 지원

#### 배치 처리

- **Spring Batch** — `spring-boot-starter-batch`
  - Flyway + JDBC를 사용한 배치 테이블 관리
  - 테스트: `spring-batch-test`

#### 보안 및 인증

- **Spring Security WebFlux** — 비동기 인증/인가
  - `spring-boot-starter-security`
  - WebFlux 설정: `api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java`
- **JWT (JJWT)** — HS256 토큰 생성/검증
  - `io.jsonwebtoken:jjwt-api:0.12.6`
  - `io.jsonwebtoken:jjwt-impl:0.12.6`
  - `io.jsonwebtoken:jjwt-jackson:0.12.6`
  - 구성: `api/src/main/resources/application.yml` (액세스: 30분, 리프레시: 14일)
- **OAuth2 소셜 로그인** — 구글, 카카오 (Microsoft Teams 연구 진행 중)
  - 구현체: `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/`
    - `GoogleOAuth2Handler.java`
    - `KakaoOAuth2Handler.java`
    - `AbstractOAuth2Handler.java` (공통 로직)

#### 캐싱 및 세션

- **Redis (Reactive)** — 토큰 블랙리스트, 캐싱
  - `spring-boot-starter-data-redis-reactive`
  - JWT 블랙리스트 서비스: `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtBlacklistService.java`
  - 설정: `api/src/main/resources/application.yml`

#### AI 통합

- **Spring AI 1.0.0** — OpenAI 채팅
  - `spring-ai-bom:1.0.0` (BOM 관리)
  - `spring-ai-starter-model-openai`
  - 구성: `api/src/main/java/com/example/bootstrap/global/config/AiConfig.java`
  - 서비스:
    - 동기: `Schedulers#boundedElastic()` 격리 실행
    - 스트리밍 (SSE): 네이티브 `Flux<String>` 응답
  - 참조: `api/src/main/java/com/example/bootstrap/ai/application/service/AiChatService.java`

#### 검증

- **Validation** — `spring-boot-starter-validation`

#### Actuator 및 모니터링

- **Spring Boot Actuator** — 헬스 체크, 메트릭
  - `spring-boot-starter-actuator`
  - **Prometheus** — 메트릭 수집
    - `io.micrometer:micrometer-registry-prometheus`
  - 설정: `api/src/main/resources/application.yml` (프로파일별 엔드포인트 제어)

#### API 문서화

- **SpringDoc OpenAPI 2.8.8** — Swagger UI, OpenAPI 스펙
  - `springdoc-openapi-starter-webflux-ui:2.8.8`
  - local 프로파일에서만 활성화 (`api/src/main/resources/application-local.yml`)

#### 매핑 및 유틸

- **MapStruct 1.6.3** — 자동 DTO/엔티티 매핑
  - 어노테이션 프로세서 포함
  - Lombok 바인딩: `lombok-mapstruct-binding:0.2.0`
- **Lombok** — 보일러플레이트 생성
  - 컴파일 타임 어노테이션 처리

#### 로깅

- **Logback + Logstash Encoder** — JSON 로깅 (운영 환경)
  - `net.logstash.logback:logstash-logback-encoder:8.1`
  - 설정: `api/src/main/resources/logback-*.xml`

#### 정적 분석

- **Checkstyle 10.23.0** — 코드 스타일 검사
  - 설정: `api/config/checkstyle/checkstyle.xml`
- **SpotBugs 4.9.3** — 버그 탐지
  - 설정: `api/config/spotbugs/exclude.xml`

#### 테스트 커버리지

- **JaCoCo 0.8.12** — 라인 커버리지 측정 (최소 기준: 60%)
  - 리포트 생성 및 검증 설정: `api/build.gradle` (tasks.named('jacocoTestReport'), 'jacocoTestCoverageVerification')
  - 제외 패턴: MapStruct 생성 클래스, 엔티티 VO, 설정 클래스, 응답 DTO

#### 테스팅

- **JUnit 5** — 단위/통합 테스트
  - `junit-platform-launcher`
- **Testcontainers** — Docker 기반 테스트 격리
  - `spring-boot-testcontainers`
  - `testcontainers-junit-jupiter`
  - `testcontainers-postgresql`
  - `testcontainers-redis:2.2.4`
  - `testcontainers-r2dbc`
- **Spring Security Test** — 보안 기능 테스트
  - `spring-security-test`

### 설정 파일

- `api/gradle.properties` — Gradle 변수 및 JVM 옵션
- `api/build.gradle` — 의존성 및 플러그인 구성
- `api/src/main/resources/application.yml` — 기본 설정
- `api/src/main/resources/application-local.yml` — 로컬 개발 (Swagger 활성화, 확장 Actuator)
- `api/src/main/resources/application-prod.yml` — 운영 환경 (최소 엔드포인트, JSON 로깅)
- `api/docker-compose.yml` — PostgreSQL 16, Redis 7, Prometheus 2.53.0, Grafana 11.1.0

---

## 프론트엔드 (웹)

### 언어 및 런타임

- **TypeScript 5.8.3** — 정적 타입 검사
  - `api/tsconfig.json` 참조: `target: ES2022`, `moduleResolution: Bundler`, strict 모드
- **JavaScript (ES2022)** — ECMAScript 모듈
- **Node.js 18.17.0+**, **pnpm 10.28.2+** — 패키지 관리자

### 빌드 및 번들러

- **Vite 6.0.0** — 고속 빌드, HMR 개발 서버
  - 플러그인: `@vitejs/plugin-react`, `@tanstack/router-plugin`, `@tailwindcss/vite`
  - 설정: `vite.config.ts` (명시적 설정 없음, 기본값 사용)

### 핵심 프레임워크

- **React 19.0.0** — 사용자 인터페이스
  - `react-dom:19.0.0`
  - JSX Transform (자동)

### 라우팅

- **TanStack Router 1.95.0** — 타입 안전 라우팅
  - `@tanstack/react-router`
  - DevTools: `@tanstack/react-router-devtools:1.166.13`
  - 플러그인: `@tanstack/router-plugin:1.95.0`

### 상태 관리

- **Zustand 5.0.3** — 경량 상태 관리
- **TanStack Query 5.75.0** — 서버 상태 관리 (`@tanstack/react-query`)
- **Immer 11.1.4** — 불변 상태 업데이트

### 폼 및 검증

- **React Hook Form 7.55.0** — 성능 최적화 폼
  - DevTools: `@hookform/devtools:4.4.0`
  - Resolver: `@hookform/resolvers:4.1.3`
- **Zod 3.24.2** — 스키마 기반 검증

### UI 컴포넌트

- **shadcn/ui** — Radix UI 기반 고급 컴포넌트 시스템
  - Radix UI: `radix-ui:1.4.3`
  - Icons: `@radix-ui/react-icons:1.3.2`
  - Label: `@radix-ui/react-label:2.1.8`
  - Slot: `@radix-ui/react-slot:1.2.0`
- **Base UI 1.4.1** — 무헤드 컴포넌트 라이브러리
- **Lucide React 0.487.0** — 아이콘 세트
- **cmdk 1.1.1** — 커맨드 팔레트
- **sonner 2.0.3** — 토스트 알림
- **react-day-picker 10.0.0** — 날짜 선택 캘린더

### 스타일링 및 유틸

- **TailwindCSS 4.0.0** — Utility-first CSS 프레임워크
  - 변수/커스텀 속성 지원: `@tailwindcss/vite:4.0.0`
- **class-variance-authority 0.7.1** — 컴포넌트 스타일 바리언트
- **clsx 2.1.1** — 조건부 클래스 이름 합성
- **tailwind-merge 2.6.0** — TailwindCSS 클래스 병합
- **tw-animate-css 1.4.0** — 애니메이션 유틸
- **motion 11.18.0** — 애니메이션 라이브러리
- **@fontsource-variable/inter 5.1.1** — Inter 폰트

### 테이블 및 차트

- **TanStack Table 8.21.3** — 고급 테이블 컴포넌트 (`@tanstack/react-table`)
- **Recharts 3.8.1** — 리액트 차트 라이브러리

### 국제화

- **i18next 26.0.10** — 국제화 프레임워크
- **react-i18next 17.0.7** — React 바인딩

### 접근성

- **react-focus-lock 2.13.7** — 포커스 관리

### 코드 품질

- **TypeScript** — 정적 타입 검사
  - 설정: `web/tsconfig.json`
    - `target: ES2022`
    - `moduleResolution: Bundler`
    - `strict: true`
    - `noUnusedLocals`, `noUnusedParameters` 강제
    - 경로 별칭: `@/*` → `./src/*`
- **Biome 1.9.4** — 린팅 및 포맷팅 (`@biomejs/biome`)
  - 설정: `web/biome.json`
    - 포맷터: 스페이스 2칸, 줄 너비 100
    - JavaScript: 싱글 쿼트, ES5 트레일링 쉼마
    - 임포트 정렬 활성화
    - Linter: recommended 규칙 활성화

### 패키지 관리

- **pnpm 10.28.2+** — 효율적인 의존성 관리
  - `web/package.json` 참조
  - 스크립트:
    - `dev` — Vite 개발 서버
    - `build` — TypeScript 빌드 + Vite 번들링
    - `preview` — 프로덕션 빌드 미리보기
    - `typecheck` — 타입 검사
    - `lint` — Biome 린팅
    - `lint:fix` — 자동 수정
    - `format` — 코드 포맷팅

### 설정 파일

- `web/package.json` — 의존성 및 스크립트
- `web/tsconfig.json` — TypeScript 컴파일 옵션
- `web/tsconfig.node.json` — 빌드 도구 타입스크립트 설정
- `web/biome.json` — 린팅/포맷팅 규칙
- `vite.config.ts` — Vite 번들러 설정 (생성 예상)
- `src/routeTree.gen.ts` — TanStack Router 제너레이터 아티팩트 (biome 무시 대상)

---

## 공통 구성

### 모놀리식 구조

- Root `Taskfile.yml` — 프로젝트 전체 작업 조율
- `package.json` 메타데이터:
  - 이름: `react-bootstrap`
  - 버전: `0.0.1`
  - 프라이빗 모드 활성화

### 버전 관리

- Git 저장소 (현재 커밋: `494e665f81fbd274fdf9d64df89b97a66a3839b3`)

