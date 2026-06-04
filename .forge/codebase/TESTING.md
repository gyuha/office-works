---
last_mapped_commit: 494e665f81fbd274fdf9d64df89b97a66a3839b3
mapped: 2026-06-05
---

# 테스트 프레임워크 및 구조

## API (Spring Boot + JUnit 5)

### 단위 테스트 (`*Test.java`)

**위치**: `api/src/test/java/`

**구성**:
- `@ExtendWith(MockitoExtension.class)` — Spring context 로딩 안 함
- Spring context 불필요, 대상 클래스를 수동으로 생성
- `@BeforeEach`에서 mock 설정 및 대상 클래스 초기화

**예시**: `api/src/test/java/com/example/bootstrap/global/exception/BusinessExceptionTest.java`
- 기본 생성자/메서드 검증, 예외 생성 및 상태 확인

**예시**: `api/src/test/java/com/example/bootstrap/global/security/jwt/JwtTokenProviderTest.java`
- Mock 의존성 없이 JwtTokenProvider를 직접 테스트
- `@BeforeEach`에서 `JwtProperties` 생성 후 provider 초기화
- Access/Refresh token 생성, 검증, 파싱 각각 별개 테스트

### 통합 테스트 (`*IT.java`)

**위치**: `api/src/test/java/`

**구성**:
- `@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)`
- `@Import(TestcontainersConfig.class)` — TestContainers 자동 시작
- `@ActiveProfiles("local")` — 로컬 프로필 사용
- `@AutoConfigureWebTestClient` — WebTestClient DI
- PostgreSQL 15432, Redis 16379 자동 구동

**예시**: `api/src/test/java/com/example/bootstrap/account/controller/AuthControllerIT.java`
- 회원가입 → 로그인 → 토큰 갱신 → 로그아웃 E2E 흐름 검증
- WebTestClient로 REST 엔드포인트 호출, 응답 상태·본문(`jsonPath`) 검증

**예시**: `api/src/test/java/com/example/bootstrap/global/FlywayMigrationIT.java`
- Flyway 마이그레이션 V1, V2, V3 실행 확인
- 각 migration이 생성한 테이블/컬럼/시퀀스 존재 여부 검증
- JdbcTemplate으로 information_schema 조회

### Reactive 테스트

**사용**: `reactor-test` 라이브러리 (`io.projectreactor:reactor-test`)

**패턴**: `StepVerifier.create(...)`
```java
StepVerifier.create(mono)
  .assertNext(value -> assertThat(value).isEqualTo(expected))
  .verifyComplete();
```

### 테스트 메서드 명명

**형식**: `methodUnderTest_scenario_expectation`

**예**:
- `login_withValidCredentials_returnsTokenResponse`
- `generateAccessToken_embedsCorrectClaims`
- `isValid_withTamperedSignature_returnsFalse`

### 테스트 클래스 명명

- 단위 테스트: `{Class}Test` (예: `BusinessExceptionTest`)
- 통합 테스트: `{Class}IT` (예: `AuthControllerIT`, `FlywayMigrationIT`)

### JaCoCo 커버리지

**설정**: `api/build.gradle`

**필수 커버리지**: 60% 라인 커버리지 (`./gradlew check`가 강제 적용)

**제외 패턴**:
- `**/*MapperImpl.class` — MapStruct 생성 코드
- `**/BootstrapApplication.class` — Spring Boot entry-point
- `**/domain/model/**` — R2DBC 엔티티
- `**/config/**` — Spring @Configuration 클래스
- `**/global/response/**` — ApiResponse, PageResponse 래퍼
- `**/global/exception/code/**` — ErrorCode enum

**명령**:
- `./gradlew jacocoTestReport` — HTML/XML 보고서 생성 (`build/reports/jacoco/test/html/index.html`)
- `./gradlew jacocoTestCoverageVerification` — 60% 미달 시 빌드 실패
- `./gradlew check` — test → jacocoTestReport → jacocoTestCoverageVerification 순서 실행

---

## 웹 (React + TypeScript)

### 도구

**패키지 매니저**: pnpm (`web/package.json`)

**스크립트**:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "typecheck": "tsc --noEmit",
  "lint": "biome check .",
  "lint:fix": "biome check --write ."
}
```

전용 테스트 러너(Vitest 등)는 미구성 상태. 검증은 `pnpm typecheck`(정적 타입 검사)와 `pnpm lint`(Biome)에 의존.

### 테스트 파일

`web/src/sample/auth/` 하위에 compile-time 검증 성격의 테스트 파일 존재:
- `web/src/sample/auth/sign-in-form-ui.test.ts`
- `web/src/sample/auth/sign-up-form-ui.test.ts`
- `web/src/sample/auth/auth-demo-submit-handlers.test.ts`

이들은 주로 스키마 정의와 UI 필드의 일관성, 폼 필드명 매핑, 접근성 속성을 검증한다.

**예시**: `web/src/sample/auth/sign-in-form-ui.test.ts`
```typescript
// 스키마에 정의된 필드와 UI가 노출하는 검증 메시지 필드가 일치하는지 확인
const configuredErrorMessageFields = Object.keys(sampleSignInFieldErrorMessageProps).sort();
const expectedErrorMessageFields = [...sampleSignInFieldNames].sort();

if (configuredErrorMessageFields.join(',') !== expectedErrorMessageFields.join(',')) {
  throw new Error('Sign-in UI must expose field-level validation message slots for every form field.');
}
```
