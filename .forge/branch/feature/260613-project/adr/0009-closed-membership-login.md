---
status: accepted
---

# 폐쇄형 멤버십 로그인 — 셀프 가입·JIT 자동 프로비저닝 폐기

단일 테넌트 사내 도구이고 구성원은 admin이 디렉터리에서 사전 등록하므로([[ADR-0006]] 병합 모델), 로그인이 신원을 즉석 생성할 이유가 없다. 따라서 **앱 JWT는 이미 존재하는 `users` 행에만 발급**한다: OAuth 첫 로그인은 검증된 이메일과 일치하는 기존 user가 있을 때만 OAuth를 부착하고([[ADR-0003]] 이메일 기준 신원 도출 유지), 일치하는 행이 없으면 `ForbiddenError`로 거부한다(기존의 JIT user 생성 분기 제거). 셀프 회원가입(`POST /signup`)과 그에 딸린 이메일 인증 체인(`POST /verify-email`·`email_verifications` 테이블)도 함께 폐기한다 — 이들이 살아 있으면 "사전 등록된 사람만 로그인"이 우회되기 때문이다.

## Considered Options

- **행 존재 기준 게이트(채택)** — `employee_no` 보유가 아니라 user 행 존재 여부로 판별. employee_no 없는 admin·시스템 user를 잠그지 않으면서 미등록 외부인만 차단. admin 부트스트랩을 건드릴 필요가 없다.
- `employee_no IS NOT NULL` 엄격 게이트(기각) — 도메인상 "구성원" 정의에는 더 충실하나, employee_no 없는 dev admin·role-only 시스템 계정을 로그인 불가로 만든다.
- signup만 막고 JIT 유지 / JIT만 막고 signup 유지(기각) — 둘 중 하나만 막으면 나머지가 신규 행 생성 구멍으로 남아 폐쇄형 멤버십이 반쪽이 된다.

## Consequences

- 사전 등록된 구성원은 `is_verified=False`라도 OAuth로 로그인된다(OAuth 경로는 verified를 게이트하지 않음). 의도된 동작.
- 미등록 이메일 OAuth 거부는 `oauth_callback`에서 `?error=not_member`로 구분 리다이렉트되어, 로그인 화면이 일반 OAuth 오류와 다른 "등록된 구성원이 아님" 안내 모달을 띄운다.
- `is_active=False`(정지/소프트삭제) user의 OAuth 로그인 차단은 이 결정 범위 밖(non-goal) — 별도 작업.
