---
last_mapped_commit: 494e665f81fbd274fdf9d64df89b97a66a3839b3
mapped: 2026-06-05
---

# 기술 부채 및 위험 영역 지도

## 프론트엔드 인증 문제

### 모의 API 계속 사용 중 (상용화 미완료)
- **파일**: `/Users/gyuha/workspace/office-works/web/src/features/auth/lib/mock-auth-api.ts`
- **문제**: 프론트엔드 인증 시스템이 여전히 `mockLogin()`, `mockSignup()` 함수(라인 5-29)를 사용 중
- **의존처**: `/Users/gyuha/workspace/office-works/web/src/features/auth/hooks/use-auth-mutation.ts` (라인 4, 13, 25)
- **영향**: 라인 13과 25에서 `mockLogin(data)`, `mockSignup(data)`를 `mutationFn`으로 설정하여 실제 백엔드 API와 연결되지 않음
- **개선**: 실제 API 엔드포인트(`/api/v1/auth/login`, `/api/v1/auth/signup`)로 교체 필요

---

## 백엔드 인증 & 보안

### 1. Authorization 헤더 파싱 시 null 체크 부재 (fragile)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/account/controller/AccountController.java`
- **라인**: 96
- **코드**: `String accessToken = authorization.substring(7);`
- **문제**: 
  - `authorization` 파라미터는 Spring의 `@RequestHeader` 검증으로 전달 보장되지만, 명시적 null 체크 없음
  - `Bearer ` 문자열이 정확히 7자 인지 보장되지 않음
  - 문자열 길이 < 7일 경우 `StringIndexOutOfBoundsException` 발생 가능
- **개선**: `authorization.startsWith("Bearer ") ? authorization.substring(7) : ""` 패턴이나 정규식 사용

### 2. JWT로부터 추출한 권한만으로 ADMIN 판정 (재조회 없음)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java`
- **라인**: 62-65
- **코드**: JWT claim에서 직접 `role` 추출 → `SimpleGrantedAuthority("ROLE_" + role)` 생성
- **문제**:
  - 토큰 발급 후 사용자의 권한이 DB에서 변경되어도 기존 토큰은 여전히 이전 권한으로 유효
  - 토큰 만료(30분) 전까지 권한 강제 해제/차단 불가능 (revocation 지연)
  - ADMIN 권한 남용 사용자를 즉시 제외할 수 없음
- **설계 영향**: JWT stateless 설계의 tradeoff로, Redis 블랙리스트 외 권한 변경은 토큰 갱신 시점까지 반영 지연
- **개선**: (1) 토큰 만료시간 단축, (2) 권한 변경 시 기존 토큰 블랙리스트 등록, (3) 중요 액션(삭제, 설정)에는 권한 DB 재조회

### 3. 사용자 권한 dual source of truth (레거시 + RBAC 병행)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/account/domain/model/Account.java`
- **라인**: 29, 122-133
- **스키마**:
  - `users.role` 컬럼 (V1__init.sql 라인 26): "USER" | "ADMIN" (레거시, CHECK 제약)
  - `roles`, `user_roles` 테이블 (V3__menu_rbac.sql): 새로운 RBAC 시스템
- **문제**:
  - 두 시스템이 병행 운영되며, 어느 것이 source of truth인지 불명확
  - `users.role` 업데이트 후 `user_roles` 미동기화 위험
  - 마이그레이션 미완료 상태 (기존 데이터는 role 컬럼만 사용)
- **개선**: 신규 RBAC로 완전 전환 후 `users.role` 컬럼 제거 또는 감사용 read-only 필드로 전환

### 4. JWT 토큰에 role 정보 포함 (갱신 필요)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/global/security/jwt/JwtTokenProvider.java`
- **라인**: 64-75
- **코드**: `generateAccessToken()` 메서드에서 역할을 claim으로 직접 내장
- **문제**: 토큰 발급 후 사용자 권한 변경 시, 기존 토큰의 role claim은 stale 상태
- **영향**: 권한 해제 후에도 토큰 유효기간(30분) 동안 이전 권한으로 동작 가능

---

## 데이터베이스 설계

### 레거시 권한 컬럼 계속 유지
- **스키마**: `/Users/gyuha/workspace/office-works/api/src/main/resources/db/migration/V1__init.sql` (라인 26)
- **테이블**: `users.role` VARCHAR(20) NOT NULL DEFAULT 'USER'
- **상태**: 새로운 `roles` 테이블(V3__menu_rbac.sql 라인 42-49) 생성 후에도 기존 컬럼 유지
- **영향**: 데이터 일관성 위험, 권한 조회 시 로직 혼동 가능

---

## OAuth2 처리

### OAuth 토큰 보안
- **파일**: 
  - `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/GoogleOAuth2Handler.java`
  - `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/KakaoOAuth2Handler.java`
- **설계**: 프론트엔드에서 OAuth provider access token을 직접 프로덕션 API에 전달 → 백엔드에서 userinfo API 호출
- **위험**:
  - 프론트엔드에서 OAuth 토큰 노출 가능성
  - Authorization 헤더 구성 시 문자열 연결 (라인 "Bearer " + token)
- **개선**: 프론트엔드→백엔드에서만 authorization code 전달, 백엔드에서 token exchange 처리

### 신규 OAuth 계정 기본 role 설정
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/account/infrastructure/oauth2/AbstractOAuth2Handler.java`
- **라인**: 21-22, 122
- **코드**: `private static final String DEFAULT_ROLE = "USER"; ... account.setRole(DEFAULT_ROLE);`
- **상태**: OAuth 신규 가입 시 항상 "USER" role로 설정, 하드코드됨
- **영향**: RBAC 체계로 전환 후에도 기존 메커니즘 유지, 이중 권한 체계 강화

---

## JWT 설정 및 시크릿

### 기본값 placeholder 사용 (운영 환경 미배포 위험)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/resources/application.yml`
- **라인**: 110
- **코드**: `jwt.secret: ${JWT_SECRET:bootstrap-secret-key-change-in-production-must-be-32-chars}`
- **문제**:
  - 환경변수 미설정 시 placeholder 값 사용 → 모든 배포 인스턴스가 동일 secret 사용
  - 시크릿 길이 32자 최소 요구사항이 주석으로만 명시
  - 프로덕션 환경에서 secret 로테이션 메커니즘 없음
- **개선**: 
  - CI/CD에서 mandatory 환경변수 검증 추가
  - 시크릿 길이 검증 로직 구현
  - 정기적 로테이션 전략 수립

### 액세스 토큰 유효시간 (30분)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/resources/application.yml`
- **라인**: 111
- **값**: `access-token-expiry: 1800` (초)
- **특성**: 권한 변경 시 최대 30분 지연 (위의 권한 재조회 미실시 문제와 연관)

---

## CORS 설정

### 기본 로컬 호스트 허용 (개발 편의)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/global/config/WebFluxConfig.java`
- **라인**: 19, 29-35
- **기본값**: `http://localhost:3000, http://localhost:5173` (application.yml 라인 116)
- **설정**:
  - `allowedHeaders("*")` - 모든 헤더 허용 (라인 32)
  - `allowCredentials(true)` - 자격증명 포함 요청 허용 (라인 34)
- **고려사항**:
  - 로컬 개발 환경에서는 편리하나, 프로덕션에서는 명시적 화이트리스트 필수
  - `allowedHeaders("*")`는 CORS 프리플라이트 요청에서 제약 있을 수 있음

---

## 테스트 코드 내 블로킹 호출

### OAuth2 핸들러 테스트에서 .block() 사용
- **파일**: 
  - `/Users/gyuha/workspace/office-works/api/src/test/java/com/example/bootstrap/account/infrastructure/oauth2/GoogleOAuth2HandlerTest.java` (라인 128, 142)
  - `/Users/gyuha/workspace/office-works/api/src/test/java/com/example/bootstrap/account/infrastructure/oauth2/KakaoOAuth2HandlerTest.java` (라인 167, 180)
- **패턴**: `handler.fetchUserInfo(TEST_TOKEN).block();`
- **특성**: 테스트 전용 블로킹이므로 권장 (테스트 컨텍스트에서는 필요), 프로덕션 코드는 아님

---

## 인증서 및 기본 설정

### 기본 JDBC 자격증명 (로컬 개발용)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/resources/application.yml`
- **라인**: 22-24
- **기본값**:
  ```yaml
  datasource:
    url: ${JDBC_URL:jdbc:postgresql://localhost:5432/bootstrap}
    username: ${DB_USERNAME:bootstrap}
    password: ${DB_PASSWORD:bootstrap}
  ```
- **특성**: 개발 환경 편의, 프로덕션 환경변수 필수

### OpenAI API 키 placeholder
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/resources/application.yml`
- **라인**: 63
- **값**: `api-key: ${OPENAI_API_KEY:placeholder-key}`
- **문제**: Placeholder 값으로 실제 API 호출 시 인증 실패, 의도된 설계

---

## 로깅 및 에러 처리

### 광범위한 예외 처리 (catch Exception)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/global/security/jwt/JwtAuthenticationFilter.java`
- **라인**: 75-80
- **코드**:
  ```java
  private Claims tryParseClaims(final String token) {
      try {
          return jwtTokenProvider.parseClaims(token);
      } catch (Exception e) {
          return null;  // 모든 예외를 무시하고 null 반환
      }
  }
  ```
- **문제**:
  - 구체적 예외 유형(JwtException, IllegalArgumentException)을 구분하지 않음
  - 예기치 않은 예외도 무음 처리되어 디버깅 어려움
  - 로깅 없음
- **개선**: 특정 예외만 catch, 그 외는 로깅 및 재던짐

### SecurityConfig의 예외 처리
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/global/config/SecurityConfig.java`
- **라인**: 50-52
- **설정**: 기본 exception handler 사용 (로그 없음)

---

## 기타 설계 고려사항

### JWT 블랙리스트 저장소 (Redis)
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/java/com/example/bootstrap/global/security/jwt/JwtBlacklistService.java`
- **특성**: Redis 스토어 사용, TTL 기반 자동 만료
- **설계**: 액세스 토큰 만료 후 자동 제거되므로 스토리지 정체 위험 낮음
- **고려**: Redis 장애 시 블랙리스트 조회 실패 가능성 (fallback 정책 필요)

### Refresh Token 관리
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/resources/db/migration/V1__init.sql`
- **라인**: 52-74
- **특성**: DB에 저장, rotation 방식 사용 (새 토큰 발급 시 기존 토큰 유효)
- **설계**: 토큰 재사용 감지 메커니즘 미구현 (rotation 표준은 이전 토큰 폐기 요구)

### Flyway 마이그레이션 분리 계정
- **파일**: `/Users/gyuha/workspace/office-works/api/src/main/resources/application.yml`
- **라인**: 36-40
- **설계**: FLYWAY_USER와 DB_USERNAME 분리 가능 (최소권한 원칙)
- **상태**: 개발 환경에서는 미사용, 운영 환경 설정 권장

---

## 요약: 주요 위험 영역

| 영역 | 심각도 | 항목 | 파일/라인 |
|------|--------|------|-----------|
| 인증 | 높음 | Authorization 헤더 null 체크 부재 | AccountController.java:96 |
| 권한 | 높음 | JWT 권한 갱신 지연 (30분) | JwtAuthenticationFilter.java:62-65 |
| 설계 | 중간 | 레거시/RBAC 권한 이중 체계 | Account.java, V3__menu_rbac.sql |
| 보안 | 중간 | JWT 시크릿 환경변수 필수화 미약 | application.yml:110 |
| 운영 | 중간 | 기본 CORS allowedHeaders("*") | WebFluxConfig.java:32 |
| 테스트 | 낮음 | 테스트 코드 .block() 사용 | GoogleOAuth2HandlerTest.java 등 |

---

**문서 작성**: 2026-06-05  
**최종 검증 커밋**: 494e665f81fbd274fdf9d64df89b97a66a3839b3
