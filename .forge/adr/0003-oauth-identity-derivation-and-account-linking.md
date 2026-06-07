# OAuth 신원 도출과 계정 연결 정책 (Microsoft Entra 외)

## Status
accepted

## 결정
OAuth 로그인에서 (1) returning 사용자 재식별·인가는 `provider_user_id`(Entra `oid`)로만 하고, (2) JIT 첫 로그인의 "생성 vs 기존 User 연결" 판단에 쓰는 이메일은 **IdP가 검증한 이메일 클레임으로만** 도출한다. Microsoft의 경우 `email` 클레임만 쓰고, 부재 시 `preferred_username`/`upn`으로 폴백하지 않고 명확한 설정 오류로 거부한다(운영자는 Entra Token configuration에서 optional `email` 클레임을 추가). single-tenant 강제를 위해 id_token의 `aud == client_id`·`tid == microsoft_tenant_id`·`exp` 미만료를 디코드 후 검증한다. 검증된 이메일 기반 JIT 자동 연결은 **유지**하며, 명시적 계정 연결(재인증) 플로우는 만들지 않는다.

## 맥락 / 왜
코드리뷰가 계정 탈취 경로를 발견했다: `email → preferred_username → upn` 폴백으로 도출한 이메일을 `oauth_provision_user`가 기존 User 연결 키로 써서, Entra에서 가변·소유 미검증인 `preferred_username`/`upn`이 병합 키가 됐다. 이는 CONTEXT.md 글로서리("이메일은 매칭/인가 키로 쓰지 않는다")와도 모순이었다. `User.email`이 `NOT NULL·UNIQUE` 자연키라 폴백이 데이터 모델 제약을 메우려 도입됐던 것이 근본 원인이다.

## 고려한 대안
- **가변 클레임 폴백 유지(원안)** — 더 많은 로그인이 성공하지만 탈취 벡터. 기각.
- **자동 cross-provider 병합 제거 + 명시적 재인증 연결 플로우** — 가장 안전하나 라우트·UI·재인증 상태가 필요한 별도 작업 규모. single-tenant MVP에 과설계라 보류(후속 후보).
- **이메일을 신원에서 분리(oid 기반 계정 + email 표시용)** — `User.email` NOT-NULL·UNIQUE 스키마 변경 필요. 범위 밖.

## 결과
- single-tenant 배포에서 Entra `email` 클레임이 없는 테넌트는 운영자가 optional claim을 켜야 로그인 가능(설정 의존성 증가, 대신 탈취 벡터 제거).
- "검증된 email을 가진 기존 계정도 정당한 소유자"라는 신뢰 가정에 의존한다(로컬 가입은 이메일 인증을 거치고, 타 provider도 검증된 조직 email을 반환). 이 가정이 깨지는 배포(미검증 로컬 가입 허용 등)에서는 명시적 연결 플로우를 재검토해야 한다.
- 게스트/cross-tenant 계정은 `tid` 검증으로 거부된다.
