# OAuth 브라우저 로그인 완료는 프론트엔드 fragment redirect로 처리한다

상태: accepted

## Context / Decision

`/api/v1/auth/oauth/{provider}/callback`은 원래 `TokenResponse`(JSON)를 반환해 **브라우저 SSO를 완료하지 못했다** — provider가 브라우저를 콜백으로 리다이렉트시키면 날 JSON이 화면에 표시될 뿐, SPA로 토큰이 전달되지 않는다(API-first로만 설계됨).

Teams(Microsoft Entra) SSO를 실제 동작시키기 위해, 콜백이 성공 시 `302 → {frontend_url}/auth/callback#access_token=…&refresh_token=…`로 리다이렉트하고, SPA의 `/auth/callback` 라우트가 fragment에서 **앱 JWT**를 꺼내 저장하도록 바꾼다. 실패(사용자 거부·state 불일치·코드 교환 오류) 시 `302 → {frontend_url}/login?error=oauth`. 콜백은 공유 핸들러라 google/kakao/naver에도 동일하게 적용된다(현재 프론트엔드가 사용하지 않으므로 회귀 없음).

## Considered Options

- **Fragment redirect (선택)** — bearer-JWT 모델 유지, 신규 인프라 없음. 토큰이 잠시 redirect URL fragment(브라우저 이력)에 노출.
- **일회용 코드 교환** — 콜백이 토큰을 Redis에 저장하고 `?code=`로 redirect, SPA가 code를 POST해 교환. URL에 토큰 미노출이나 교환 엔드포인트 추가.
- **httpOnly 쿠키** — 저장 관점 가장 안전하나, 앱 전체 인증을 헤더 bearer → 쿠키로 전환해야 해 변경 폭이 큼.

## Consequences

- 콜백 응답 계약이 JSON → 302로 바뀐다. OAuth 콜백을 프로그램적으로(JSON 기대) 소비하던 클라이언트가 있으면 깨진다(현재 없음). 기존 콜백 테스트는 redirect 기대로 갱신.
- 토큰이 redirect URL fragment에 잠깐 실린다(fragment는 서버로 전송되지 않으나 브라우저 이력엔 남을 수 있음). 내부 사내 도구 맥락에서 수용하며, 더 강한 보안이 필요하면 일회용 코드 교환으로 승급 가능.
- id_token은 토큰 엔드포인트에서 TLS로 직접 수신하므로 JWKS 서명검증 없이 클레임만 디코드한다(기존 Google 어댑터 신뢰모델과 동일).
