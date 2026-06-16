<!-- forge-slug: member-only-login -->
<!-- task: 22 -->
<!-- tdd: on -->
# 구성원(기존 user)만 로그인 — 셀프 가입·OAuth JIT 자동생성 폐기

## Goal / Non-goals
- Goal: 앱 JWT를 **이미 존재하는 `users` 행에만** 발급한다. OAuth 첫 로그인은 검증 이메일과 일치하는 기존 user가 있을 때만 OAuth를 부착하고, 없으면 거부한다. 셀프 회원가입과 이메일 인증 체인을 코드·DB까지 제거한다. 미등록 거부는 프론트에서 전용 모달로 안내한다.
- Non-goals:
  - `is_active=False`(정지/소프트삭제) user의 OAuth 로그인 차단 (별도 작업).
  - `employee_no` 기준 게이트 (게이트는 **행 존재** 기준 — admin·시스템 user는 통과).
  - 비밀번호 로그인·리프레시·비밀번호 재설정 흐름 변경 (그대로 유지).
  - `AuthEmailSender` 제거 (비밀번호 재설정에 계속 사용 — verification 메일 부분만 제거).

## Source of truth
- Glossary terms: "로그인 자격(login eligibility)", "JIT 프로비저닝(폐기)" in .forge/branch/feature/260613-project/CONTEXT.md
- Related ADRs: .forge/branch/feature/260613-project/adr/0010-closed-membership-login.md (후속: ADR-0003 OAuth 신원 도출, ADR-0006 병합)
- Definition of Done: 미등록 이메일로 OAuth 로그인 시 user가 생성되지 않고 `/login?error=not_member`로 리다이렉트되어 로그인 화면에 안내 모달이 뜬다. 기존 user 이메일은 정상 로그인(OAuth 부착)된다. `POST /signup`·`POST /verify-email`는 404. `task lint && task test` 통과(커버리지 70% 유지).

## Work slices

### 백엔드 — 게이트
- [ ] S1. `oauth_provision_user`의 JIT 생성 분기 제거 — OAuth 계정도 없고 이메일 매칭 user도 없으면 `ForbiddenError`(미등록 구성원)를 raise. 기존 user 매칭 시에는 종전대로 OAuth 부착 + 토큰 발급. — 완료 기준(TDD): 미등록 이메일 입력 시 `ForbiddenError`가 나고 `users`에 행이 추가되지 않으며, 기존 user 이메일 입력 시 OAuth 부착 후 토큰이 발급되는 단위 테스트 통과.
- [ ] S2. `oauth_callback`에서 위 거부(`ForbiddenError`)만 `?error=not_member`로 구분 리다이렉트, 그 외 실패는 종전 `?error=oauth` 유지. — 완료 기준: 미등록 거부 경로가 `{frontend}/login?error=not_member`로 302, 교환/state 실패는 여전히 `?error=oauth`로 302 (테스트로 분기 확인).

### 백엔드 — signup·이메일 인증 teardown
- [ ] S3. `POST /signup`·`POST /verify-email` 라우트 + `signup`/`signup_and_send_email`/`verify_email` 서비스 메서드 + `send_verification_email` 발송 + email-verification 리포지토리 메서드 + `EmailVerification` 모델/관계 제거. 내 변경으로 고아가 된 import·스키마만 함께 정리. — 완료 기준: `POST /api/v1/auth/signup`·`POST /api/v1/auth/verify-email` 호출이 404; `task typecheck` 통과(미사용 참조 없음).
- [ ] S4. `email_verifications` 테이블 drop 마이그레이션 추가(`task revision` autogenerate, revision id ≤32자). — 완료 기준: `task migrate` 후 `email_verifications` 테이블 부재, `downgrade`로 재생성 가능. (depends: S3)

### 프론트엔드 — 안내 모달 + signup 제거
- [ ] S5. `/login` 라우트가 `search.error`를 읽어 `error === 'not_member'`이면 안내 모달(기존 `dialog`/`alert-dialog` 프리미티브)로 "등록된 구성원만 로그인할 수 있습니다. 관리자에게 문의하세요." 표시. 일반 `error=oauth`는 종전 인라인 처리 유지. — 완료 기준: `/login?error=not_member` 진입 시 모달 노출, `/login?error=oauth`는 모달 없이 기존 동작. `pnpm typecheck && pnpm lint` 통과.
- [ ] S6. 프론트 `signup-form.tsx` + auth 스키마/뮤테이션의 signup 부분 제거. 내 변경으로 고아가 된 mock-auth signup 경로만 정리. — 완료 기준: signup 관련 import 부재, `pnpm build` 통과. (depends: S5 아님 — 독립)
