# Codebase Concerns

**Analysis Date:** 2026-05-27

---

## 보안 고려사항

### Swagger/OpenAPI 엔드포인트가 프로덕션 환경에서 인증 없이 접근 가능

- **위험:** `SecurityConfig`가 `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`, `/webjars/**`를 `permitAll()`로 전역 허용하고 있다. `springdoc.api-docs.enabled=false` 설정이 prod 프로파일에 있어 실제 콘텐츠는 반환되지 않지만, Spring Security 레이어에서 차단되지 않는다. `@Profile("local")`로 `OpenApiConfig` Bean을 제한하는 방식과 일관성이 없다.
- **파일:** `api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java` (62-65행)
- **현재 완화 방법:** `application-prod.yml`에서 springdoc 비활성화
- **권고:** Swagger 경로를 `SecurityConfig`에서도 `@Profile("local")` 조건부 Bean으로 격리하거나, prod 프로파일에서 해당 경로를 `denyAll()`로 설정

### JWT Secret 기본값이 예측 가능한 문자열

- **위험:** `application.yml`에 `JWT_SECRET` 환경변수 미설정 시 `bootstrap-secret-key-change-in-production-must-be-32-chars`가 사용된다. 32자이지만 공개된 문자열이므로 키가 노출된 것과 동일하다.
- **파일:** `api/src/main/resources/application.yml` (110행)
- **현재 완화 방법:** 주석으로 변경 필요 표기
- **권고:** 기본값 제거. 환경변수 미설정 시 애플리케이션 시작 실패하도록 `@ConfigurationProperties` validation 추가

### OAuth2 소셜 로그인 시 이메일 미제공 계정에 플레이스홀더 이메일 사용

- **위험:** `AbstractOAuth2Handler.resolveEmail()`이 provider 이메일 미제공 시 `{provider}_{providerId}@social.placeholder` 형식의 가짜 이메일을 DB에 저장한다. 이 이메일은 실제로 존재하지 않으며, 중복 이메일 체크를 우회하거나 다른 계정과 충돌할 가능성이 있다.
- **파일:** `api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/AbstractOAuth2Handler.java` (138행)
- **현재 완화 방법:** provider+providerId 기반이므로 provider 내 고유성은 보장
- **권고:** 이메일을 nullable로 처리하거나, 플레이스홀더임을 명시하는 별도 플래그 필드 추가

### 로그아웃 시 Refresh Token 소유권 미검증

- **위험:** `AuthService.logout()`이 accessToken의 userId와 refreshToken의 userId가 일치하는지 검증하지 않는다. 유효한 Access Token을 가진 사용자가 타 사용자의 Refresh Token을 로그아웃 요청 body에 포함하면 해당 토큰을 삭제할 수 있다.
- **파일:** `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java` (112-116행)
- **현재 완화 방법:** 없음
- **권고:** 로그아웃 전에 `refreshToken`에서 userId를 파싱하여 Access Token의 userId와 일치 여부 검증

---

## 기술 부채

### Lombok/MapStruct 의존성 선언 후 미사용

- **문제:** `build.gradle`에 Lombok (`compileOnly`/`annotationProcessor`)과 MapStruct (`implementation`/`annotationProcessor`)가 선언되어 있으나, 프로덕션 Java 소스 파일 어디에도 관련 어노테이션이 사용되지 않는다. 엔티티 클래스들은 수동 getter/setter를 전부 작성하고 있다.
- **파일:** `api/build.gradle` (84-87행), `api/src/main/java/com/example/bootstrap/account/domain/model/Account.java`
- **영향:** 불필요한 annotation processor 실행으로 빌드 시간 증가. 미래 기여자에게 혼란
- **수정 방법:** Lombok 어노테이션 실제 적용 또는 의존성 제거. MapStruct도 동일

### `ChatRequest.model` 필드가 실제로 사용되지 않음

- **문제:** `ChatRequest` DTO에 `model` 필드(OpenAI 모델명 per-request 변경용)가 선언되어 있고 API 스펙에도 명시되어 있지만, `AiChatService.chat()`과 `AiChatService.stream()`에서 `request.model()`을 실제로 ChatClient에 전달하지 않는다. 항상 `application.yml`의 기본값 `gpt-4o-mini`가 사용된다.
- **파일:** `api/src/main/java/com/example/bootstrap/ai/application/service/AiChatService.java` (46-56행), `api/src/main/java/com/example/bootstrap/ai/application/dto/ChatRequest.java`
- **영향:** API 계약 위반. 클라이언트가 `model` 필드를 전달해도 무시됨
- **수정 방법:** `chatClient.prompt().options(ChatOptions.builder().model(request.model()).build())` 등으로 모델 선택 적용하거나, `model` 필드를 DTO에서 제거하고 API 문서에서도 제거

### `RefreshTokenRepository.findByExpiredAtBefore()` 메서드가 사용되지 않음

- **문제:** `RefreshTokenRepository`에 `findByExpiredAtBefore(LocalDateTime)` 메서드가 선언되어 있으나 코드베이스 어디에서도 호출되지 않는다. 만료 토큰 정리는 Batch Job이 JDBC `JdbcTemplate.update(DELETE SQL)` 방식으로 직접 수행한다.
- **파일:** `api/src/main/java/com/example/bootstrap/account/domain/repository/RefreshTokenRepository.java` (43행)
- **영향:** 데드 코드. 유지 비용 없지만 혼란을 줄 수 있음
- **수정 방법:** 미사용 메서드 제거

### 웹 프론트엔드가 실제 API와 완전히 미연결

- **문제:** `web/src/features/auth/` 전체가 `mock-auth-api.ts`를 사용한다. 750ms 지연 후 하드코딩된 응답을 반환하며, 실제 백엔드 API(`api/src/main/java/`)와의 HTTP 통신이 없다. `use-auth-mutation.ts`가 `mockLogin`/`mockSignup`을 직접 호출한다. 토큰 저장/관리 로직도 없다.
- **파일:** `web/src/features/auth/lib/mock-auth-api.ts`, `web/src/features/auth/hooks/use-auth-mutation.ts`, `web/src/features/auth/store/auth.store.ts`
- **영향:** 프론트엔드를 배포해도 인증이 동작하지 않는다. `auth.store.ts`가 JWT 토큰 없이 메모리 상태만 관리
- **수정 방법:** 실제 API 클라이언트 구현 (`axios`/`fetch` + base URL 설정), 토큰 저장 전략 결정 (메모리 + httpOnly 쿠키 또는 localStorage)

### AI 채팅 세션/메시지 DB 스키마는 있으나 API 미구현

- **문제:** `V1__init.sql`에 `ai_chat_sessions`와 `ai_chat_messages` 테이블이 완전히 정의되어 있으나, 해당 테이블을 사용하는 Repository, Service, Controller가 없다. `AiChatService`는 세션 없이 stateless 단일 요청만 처리한다.
- **파일:** `api/src/main/resources/db/migration/V1__init.sql` (103-158행), `api/src/main/java/com/example/bootstrap/ai/application/service/AiChatService.java`
- **영향:** 스키마와 구현의 불일치. 대화 이력 저장 불가
- **수정 방법:** 세션 관리 API 구현 또는 V1 마이그레이션에서 미사용 테이블 분리

### `spring.main.allow-bean-definition-overriding=true` 전역 활성화

- **문제:** `I18nConfig`가 WebFlux 기본 `FixedLocaleContextResolver` Bean을 재정의하기 위해 `spring.main.allow-bean-definition-overriding=true`가 `application.yml`에 설정되어 있다. 이는 다른 Bean 충돌을 자동으로 숨기는 부작용을 낳는다.
- **파일:** `api/src/main/resources/application.yml` (7행), `api/src/main/java/com/example/bootstrap/global/config/I18nConfig.java`
- **영향:** 의도치 않은 Bean 재정의가 경고 없이 발생 가능
- **수정 방법:** Spring WebFlux에서 `LocaleContextResolver` 재정의 방법 재검토. `WebFluxConfigurer.configureLocaleContextResolver()` 구현으로 대체 가능한지 확인

---

## 성능 병목

### Redis 장애 시 인증 필터 전체 실패 가능

- **문제:** `JwtAuthenticationFilter`가 모든 인증 요청에서 `jwtBlacklistService.isBlacklisted(token)`을 호출한다. `JwtBlacklistService.isBlacklisted()`는 `defaultIfEmpty(FALSE)`를 사용하지만 Redis 연결 에러(`ReactiveRedisConnectionFailureException`)에 대한 `onErrorReturn`/`onErrorResume` 처리가 없다. Redis 장애 시 에러가 필터 체인 위로 전파되어 정상 사용자 요청이 실패할 수 있다.
- **파일:** `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtBlacklistService.java` (73-76행), `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java` (55-71행)
- **원인:** `defaultIfEmpty`는 빈 Mono를 처리하지만 에러 시그널을 처리하지 않음
- **개선 방법:** `isBlacklisted()`에 `.onErrorReturn(Boolean.FALSE)` 추가. Redis 장애 시 fail-open 전략 적용

### DB 타임스탬프 컬럼이 timezone 없는 `TIMESTAMP` 타입 사용

- **문제:** `V1__init.sql`의 모든 타임스탬프 컬럼이 PostgreSQL `TIMESTAMP WITHOUT TIME ZONE`으로 정의되어 있다. 반면 `JwtTokenProvider.extractExpiresAt()`은 `ZoneOffset.UTC`로 변환하여 저장한다. 서버 JVM timezone과 PostgreSQL 서버 timezone이 다를 경우 `expired_at` 비교 로직이 어긋날 수 있다.
- **파일:** `api/src/main/resources/db/migration/V1__init.sql` (29, 57행), `api/src/main/java/com/example/bootstrap/global/security/jwt/JwtTokenProvider.java` (156-158행), `api/src/main/java/com/example/bootstrap/batch/application/job/ExpiredTokenCleanupJobConfig.java` (89행)
- **원인:** Batch Job이 `LocalDateTime.now()`(JVM local time)으로 `DELETE WHERE expired_at < ?`를 실행
- **개선 방법:** DB 컬럼을 `TIMESTAMPTZ`로 마이그레이션하거나 JVM timezone을 UTC로 고정 (`-Duser.timezone=UTC`)

---

## 취약한 영역

### `Modal.Ground`의 backdrop 클릭 로직 반전 버그

- **문제:** `modal.tsx`의 `closeModalByClick()`에서 `backdropDismiss === true`이면 `closeModal()`을 호출하지 않고 그냥 반환한다. 의미상 `backdropDismiss`는 "backdrop 클릭으로 닫기 허용" 플래그인데, 현재 구현은 반대로 동작한다.
- **파일:** `web/src/components/ui/modal/modal.tsx` (66-71행)
- **트리거:** `backdropDismiss: true`로 모달을 열면 backdrop 클릭으로 닫히지 않음
- **수정 방법:** 조건을 `if (modals[modalCount() - 1]?.backdropDismiss !== true)`로 수정

### `ModalProps` 타입 필드명 오타 (`forcusLockDisabled`)

- **문제:** `modal.types.ts`의 `ModalProps`에 `forcusLockDisabled`(오타)가 선언되어 있고, `modal.tsx`와 `modal-store.ts`에서 각각 `forcusLockDisabled`/`focusLockDisabled`로 혼용된다. TypeScript ambient type이므로 컴파일 에러가 없지만 양쪽이 다른 필드를 가리킨다.
- **파일:** `web/src/stores/modal.types.ts` (47행), `web/src/components/ui/modal/modal.tsx` (25행), `web/src/stores/modal-store.ts` (8행)
- **영향:** `ModalProps`로 `forcusLockDisabled: true`를 전달해도 스토어의 `focusLockDisabled` 상태가 갱신되는 것은 맞지만 타입 필드명 불일치로 코드 탐색 혼란
- **수정 방법:** `modal.types.ts`의 `forcusLockDisabled`를 `focusLockDisabled`로 수정

### 동시 Refresh Token 요청 시 Race Condition

- **문제:** `AuthService.refresh()`에서 `findByToken()` → `deleteByUserId()` → `issueTokens()` 흐름이 원자적이지 않다. 클라이언트가 동일 Refresh Token으로 동시에 두 개의 갱신 요청을 보내면 두 요청 모두 `findByToken()` 성공 후 새 토큰 두 개가 발급될 수 있다. R2DBC는 낙관적 잠금을 지원하지 않는다.
- **파일:** `api/src/main/java/com/example/bootstrap/account/application/service/AuthService.java` (82-101행)
- **원인:** R2DBC의 비동기 특성 + 토큰 테이블에 row-level lock 없음
- **개선 방법:** `refresh_tokens.token` 컬럼에 DB 레벨 unique 제약(이미 있음)을 활용하여 중복 삽입 시 에러 처리, 또는 SELECT FOR UPDATE 구문 적용 고려

---

## 테스트 커버리지 공백

### 웹 프론트엔드에 실제 컴포넌트 테스트 없음

- **테스트 미비 영역:** `web/src/features/auth/` 실제 구현 코드, `web/src/components/ui/modal/` 전체, `web/src/stores/` Zustand 스토어 로직
- **파일:** `web/src/features/auth/hooks/use-auth-mutation.ts`, `web/src/stores/modal-store.ts`, `web/src/components/ui/modal/modal.tsx`
- **위험:** `web/src/sample/` 디렉토리에만 테스트 파일이 있고, 실제 프로덕션 코드 (`web/src/features/`, `web/src/components/`, `web/src/stores/`)에 대한 테스트가 전무하다. 웹 프로젝트에 `vitest`/`jest` 설정 자체가 없다.
- **우선순위:** 높음 — vitest 설정 추가 및 최소한 modal store, auth mutation hook 테스트 필요

### AI 스트리밍 엔드포인트 통합 테스트 없음

- **테스트 미비 영역:** `GET /api/v1/ai/chat/stream` SSE 스트리밍 경로
- **파일:** `api/src/test/java/com/example/bootstrap/ai/controller/AiChatControllerTest.java`
- **위험:** SSE 연결 중단, 에러 전파, 백프레셔 동작 미검증
- **우선순위:** 중간

---

## 의존성 리스크

### Spring AI BOM이 milestone/snapshot 저장소에 의존

- **위험:** `build.gradle`에 `https://repo.spring.io/milestone`과 `https://repo.spring.io/snapshot`이 선언되어 있다. Spring AI 1.0.0 GA 이후로는 milestone 저장소가 불필요할 수 있으며, SNAPSHOT 의존성이 빌드에 유입될 경우 재현 불가능한 빌드가 발생한다.
- **파일:** `api/build.gradle` (27-29행)
- **영향:** CI 환경에서 빌드 불안정 가능성
- **수정 방법:** Spring AI 1.0.0 GA가 Maven Central에 배포되었는지 확인 후 milestone/snapshot 저장소 제거

---

*Concerns audit: 2026-05-27*
