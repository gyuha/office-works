# v1.1 Research Summary: Microsoft Teams (Azure AD) OAuth2 소셜 로그인

## Executive Summary

신규 의존성 없음, 신규 아키텍처 없음. `AbstractOAuth2Handler` 상속 핸들러 1개, V4 Flyway 마이그레이션 1개, `AuthController` switch 1줄이 구현 전체다.

가장 큰 기술적 함정: `/oidc/userinfo`의 `sub`는 앱 재등록 시 변경 — `oid`(불변 GUID)를 Graph API `/v1.0/me`에서 가져와야 한다.

## Stack Additions

추가 의존성 없음 — 기존 `WebClient`로 충분.

| 항목 | 결론 |
|------|------|
| spring-cloud-azure-starter | 배제 — WebFlux 미지원, GA 미달 |
| MSAL4J | 배제 — 블로킹 API |
| Graph API URL | `https://graph.microsoft.com/v1.0/me` (`User.Read` scope 필요) |
| Scope (프론트 MSAL) | `openid profile email User.Read` |

## Feature Table Stakes

- `MicrosoftOAuth2Handler` — Graph `/v1.0/me` 호출, `id` 필드(=oid)를 providerId로 매핑
- V4 Flyway — `oauth_accounts.provider` CHECK 제약에 `'microsoft'` 추가
- `AuthController` switch 분기 1줄
- email fallback 3단계: `email` → `preferred_username` → `microsoft_{oid}@social.placeholder`
- 단위 테스트 (null email 케이스 포함, JaCoCo 60%)

## Deferred

- `tenantId` 저장 — 비즈니스 요구사항 없음
- 프로필 이미지 — Graph API Bearer 없이 접근 불가 → `null` 처리
- 개인/조직 계정 구분

## Watch Out For

1. **`sub` 대신 `oid` 사용** — `sub`는 앱 재등록 시 변경, 사용자 데이터 오염
2. **email nullable** — 조직 관리자 설정에 따라 absent, 3단계 fallback 필수
3. **Azure App Registration `accessTokenAcceptedVersion: 2`** — 기본값 null = v1.0 토큰 = Graph API 401
4. **프론트 MSAL scope `User.Read` 누락** → Graph API 403
5. **`azure-spring-boot-starter` 추가 금지** — SecurityWebFilterChain 덮어씀
6. **tenant 유형 결정 선행** — 단일 조직이면 특정 tenantId, common 혼용 시 `AADSTS50194` 에러

## Roadmap Implications

| Phase | 내용 |
|-------|------|
| Phase 4 (Azure 사전 설정) | App Registration, tenantId 결정, `accessTokenAcceptedVersion: 2` |
| Phase 5 (백엔드 구현) | V4 마이그레이션 → MicrosoftOAuth2Handler → AuthController → 테스트 |

*프론트엔드 MSAL 연동은 mock-auth-api.ts 실 연동 범위 확인 후 별도 진행.*
