<!-- forge-slug: member-only-login -->
# run.md — 구성원(기존 user)만 로그인

워크플로우: backend(순차 TDD) || frontend → adversarial 리뷰. 3 에이전트, ~369k 토큰.

## 계획대로 된 것
- **S1 게이트**: `oauth_provision_user`에서 JIT 생성 분기 제거. 이메일 매칭 user 없으면 `ForbiddenError`(행 존재 기준, employee_no 무관). 기존 user는 OAuth 부착+토큰 발급 유지. → `test_oauth_provision_service.py` 2 passed.
- **S2 신호 분기**: `oauth_callback`에서 `ForbiddenError`만 `?error=not_member`, 그 외 실패는 `?error=oauth`. except 순서(ForbiddenError → AppError) 올바름. → `test_oauth_callback_route.py` 6 passed.
- **S3 teardown**: `/signup`·`/verify-email` 라우트, `signup`/`signup_and_send_email`/`verify_email` 서비스, `send_verification_email`·페이로드, email-verification 리포 메서드, `EmailVerification` 모델/관계, 고아 스키마·import 제거. `AuthEmailSender`·비밀번호 재설정·`is_verified` 로그인 체크 유지. → 라우트 404, mypy clean(91 files).
- **S4 마이그레이션**: `0012_drop_email_verifications`(revision id 21자) drop. 라이브 Postgres upgrade→downgrade→upgrade 왕복 검증, downgrade가 스키마 충실 재생성.
- **S5 모달**: `/login` 라우트 `validateSearch`로 `error` 검증, `LoginScreen` 래퍼가 `error==='not_member'`에서만 dialog 모달("로그인할 수 없습니다 / 등록된 구성원만 로그인할 수 있습니다. 계정 등록은 관리자에게 문의하세요."). `error=oauth`는 모달 없이 기존 인라인 유지(TeamsLogin 불변).
- **S6 프론트 signup 제거**: `signup-form.tsx` + 고아 라우트 `routes/auth/signup.tsx` 삭제, `auth.schema`의 signupSchema, `useSignupMutation`, mock `mockSignup`, `SignupInput` 정리. typecheck/build 통과.

독립 재검증: web `pnpm typecheck` exit 0, api `mypy` clean, 신규 auth 테스트 9 passed.

## 계획과 달랐던 것 (divergences)
- **teardown 블래스트 반경이 계획보다 큼**: S3가 다수 기존 테스트로 파급. signup/verify 전용 테스트 5파일 삭제(test_signup_route·_schemas·_password_hashing·_mailpit_integration·test_verify_email_route), signup/verify를 setup으로 쓰던 흐름 테스트(test_auth_flows·test_login_route·test_password_reset_route)는 conftest의 새 `seed_verified_user` 헬퍼로 직접 시드하도록 재작성, test_email_backend의 verification 발송/페이로드 테스트 2건 제거. 계획서엔 "코드 제거"만 적혀 테스트 파급은 미명시 — DoD(task test 통과) 충족을 위해 불가피.
- **무관 파일 1건 편집**: `tests/users/test_user_service.py`(미접촉 파일)에 import-정렬 autofix만 적용(사전 존재 I001을 task lint 게이트 통과 위해). 동작 변경 없음 — surgical 원칙 경미 위반.
- **잔재 1 — `scripts/smoke_test.py` stale**: 제거된 `/signup`·`/verify-email`를 호출하는 수동 e2e 스크립트가 stale. lint/test 게이트 대상 아님, S3 범위 밖이라 미수정. **별도 정리 필요.**
- **잔재 2 — `src/core/ids.py`의 `EMAIL_VERIFICATION` 상수 고아**: 모델 제거로 미사용. scope creep 회피로 잔존. 무해한 죽은 상수.
- **프론트 repo-wide `pnpm lint` 실패(56건)**: 전부 사전 존재(dashboard/*·sidebar·teams-login·icons 등 미접촉 파일의 forEach 등). 내 변경 6파일은 biome 단독 통과. S5 완료기준 "pnpm lint 통과"가 레포 전체로는 미충족이나 변경분 자체는 클린. 사전 부채.
- **리뷰 에이전트 보고 빈약**: 6개 렌즈 "all pass, zero defect"로 보고했으나 근거가 매우 짧음. 메인 세션에서 mypy/테스트/라우트/typecheck를 독립 재검증해 결함 없음을 직접 확인함(리뷰 단독 신뢰 아님).
- 사전 실패 12건(test_dev_server·test_migrations의 stale Makefile 테스트)은 CLAUDE.md에 "무관"으로 명시된 기존 실패 — 이번 변경과 무관.
