# 도메인 용어 사전 (CONTEXT)

> 프로젝트의 핵심 도메인 용어 정의. 구현 세부는 담지 않는다 — 용어의 의미만.

> ⚠️ **주의**: 아래 "권한 체계 / 메뉴 접근 권한" 섹션은 **리라이트 이전 Spring(Java/R2DBC) 백엔드** 기준 용어다. 현재 백엔드는 Python FastAPI로 교체됐고(RBAC 미구현 상태), 그 용어들은 현 코드와 일치하지 않을 수 있다. 현행 시스템 용어는 맨 아래 "인증 / SSO" 섹션부터다.

## 권한 체계의 두 가지 "역할(Role)"

이 시스템에는 "역할/권한"으로 불릴 수 있는 **서로 다른 두 개념**이 공존한다. 혼동하면 안 된다.

- **레거시 권한 (`users.role`)** — `USER` | `ADMIN` 단일 문자열. JWT claim에 실려 Spring Security의 `ROLE_ADMIN` authority로 변환되며, `@PreAuthorize("hasRole('ADMIN')")` 같은 **엔드포인트 접근 게이트**를 결정한다. ADMIN 판정의 source는 이것뿐이다(DB 재조회 없음).
- **RBAC 역할 (`roles` / `Role` 엔티티)** — 관리자가 자유롭게 정의하는 역할. **메뉴 접근 권한의 집합 단위**로만 작동하며, Spring Security authority에는 **영향을 주지 않는다**. 즉 `roles` 테이블에 "ADMIN"이라는 행을 만들어 사용자에게 부여해도 그 사용자가 `@PreAuthorize` ADMIN 게이트를 통과하지는 못한다.

→ "관리 API"의 ADMIN 게이트는 **레거시 권한**으로 작동하고, 그 API가 관리하는 대상은 **RBAC 역할/권한**이다. 둘을 합치는 것(이중 체계 정리)은 별개 작업이다.

## 메뉴 접근 권한 용어

- **역할별 메뉴 권한 (`role_menu_permissions`)** — 특정 RBAC 역할이 특정 메뉴에 대해 갖는 `canRead` / `canWrite`.
- **개인 메뉴 권한 오버라이드 (`user_menu_permissions`)** — 특정 사용자에게 직접 부여하는 메뉴 권한. 역할에서 파생된 권한 위에 덮어쓴다(개별 오버라이드).
- **유효 메뉴 권한** — 한 사용자의 (그가 가진 모든 RBAC 역할의 권한 합집합) ∪ (개인 오버라이드). `/api/menus/my`가 반환하는 값. ADMIN(레거시)이면 전체 활성 메뉴를 read/write 전부 true로 우회.

## 인증 / SSO (현행 Python FastAPI 백엔드)

**OAuth 계정 연결 (oauth_account)**:
외부 IdP의 신원(provider + provider_user_id)을 앱의 User에 잇는 레코드. 한 User가 여러 provider 신원을 가질 수 있다.
_Avoid_: 소셜 계정, 외부 계정

**provider_user_id**:
provider 안에서 사용자를 가리키는 안정·불변 식별자. Microsoft Entra에서는 `oid` 클레임. **returning 사용자를 재식별하는 유일한 인가 키**(`oauth_account`를 `provider + provider_user_id`로 조회). 이메일은 바뀔 수 있으므로 재식별/인가 키로 절대 쓰지 않는다.
_Avoid_: 외부 ID, sub

**검증된 이메일 클레임**:
IdP가 디렉터리 차원에서 보증하는 이메일. Microsoft Entra에서는 `email` 클레임(디렉터리 mail, 관리자 통제·self-service 변경 불가). `preferred_username`·`upn`은 가변·소유 미검증이라 **검증된 이메일이 아니다** — 신원 도출이나 계정 연결 키로 쓰면 계정 탈취 경로가 된다.
_Avoid_: preferred_username·upn을 email로 취급

**JIT 프로비저닝**:
IdP 첫 로그인 시점에 앱 User를 즉석에서 생성하는 것. **생성-vs-연결 판단은 검증된 이메일 클레임으로만** 한다(일치하는 기존 User가 있으면 새로 만들지 않고 연결). 검증된 email이 없으면 가변 클레임으로 폴백하지 않고 거부한다. (이 판단은 JIT 1회용이며, 그 후 returning 사용자 재식별은 provider_user_id로 한다.)
_Avoid_: 자동 가입, 셀프 회원가입

**앱 JWT / IdP 토큰**:
"앱 JWT"는 우리 백엔드가 발급해 SPA가 사용하는 access/refresh 토큰. "IdP 토큰"은 Microsoft가 발급한 id_token·access_token으로 코드 교환 단계에서만 쓰고 SPA로 넘기지 않는다. 로그인 후 앱은 앱 JWT만 사용한다.
_Avoid_: 구분 없이 그냥 "토큰"
