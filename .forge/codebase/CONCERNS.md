---
last_mapped_commit: 7813838ac56097621569a9ce37a8afe4f10f0b54
mapped: 2026-06-11
---

# 기술 부채 · 알려진 이슈 · 취약 영역

> 모든 항목은 2026-06-11 워킹 트리 기준으로 직접 확인한 사실이다. 커밋되지 않은 변경(메모 기능)이 포함된 상태에서 매핑했다.

## 0. 진행 중(in-flight) 작업 — 커밋되지 않은 워킹 트리

`member-memo-tiptap-editor` 작업(`.forge/done/2026-06-09-member-memo-tiptap-editor/`, `.forge/retro/2026-06-09-member-memo-tiptap-editor.md`)의 결과물이 아직 커밋되지 않았다:

- 신규 마이그레이션 2건(untracked): `api/alembic/versions/0010_user_employment_type.py`, `api/alembic/versions/0011_user_memo.py`
- 신규 공용 에디터(untracked): `web/src/components/ui/rich-text-editor.tsx` (Tiptap 기반, ADR `.forge/adr/0007-tiptap-default-rich-text-editor.md`)
- 수정(modified): `api/src/domains/users/schemas/user_schemas.py`(memo 필드), `api/src/domains/users/repository/user_directory_repository.py`, `api/src/domains/users/service/user_directory_service.py`, `api/src/domains/auth/models/auth_models.py`, `web/src/features/office/screens/members.tsx`, `web/src/client/types.gen.ts`, `api/openapi.json`, 관련 테스트 2건

이 문서의 일부 항목(memo 관련)은 이 미커밋 상태를 전제로 한다.

```
0010/0011 마이그레이션 → user_schemas.py memo 필드 → members.tsx 편집 폼 → rich-text-editor.tsx
                                  (전부 미커밋 — 하나라도 빠지면 기능 깨짐)
```

## 1. `task lint` 게이트 깨짐 — ruff 12건 (사전 존재 + 신규 혼재)

`api/`에서 `task lint`가 현재 실패한다(`uv run ruff check .` 12 errors). 전체 목록:

| 파일 | 규칙 | 내용 |
|------|------|------|
| `api/alembic/versions/0009_string_ids.py:60` | RUF100 | 불필요한 `noqa: E501` |
| `api/tests/auth/conftest.py:14` | I001 | import 정렬 |
| `api/tests/auth/test_auth_flows.py:98, 129` | RUF059 | `raw_token` 미사용 언패킹 |
| `api/tests/auth/test_auth_flows.py:195` | RUF043 | `match=` 패턴 메타문자 비이스케이프 |
| `api/tests/auth/test_auth_flows.py:308, 321, 439, 773` | RUF059 | `user` 미사용 언패킹 |
| `api/tests/users/test_user_service.py:15` | I001 | import 정렬 |
| `api/tests/users/test_user_service.py:199, 206` | N802 | camelCase 테스트 함수명 (`test_create_withMemo_…`, `test_create_withoutMemo_…`) |

N802 2건은 프로젝트 테스트 명명 규약(`test_methodUnderTest_scenario_expectation`, `CLAUDE.md`)과 ruff 기본 규칙이 충돌하는 구조적 문제다 — 같은 규약을 따르는 다른 테스트가 계속 추가되면 매번 lint가 깨진다. ruff 설정에서 tests 경로의 N802 예외 처리가 필요하다. 3건은 `--fix`로 자동 수정 가능.

## 2. 프론트엔드 인증 — 로그인/가입이 여전히 mock

- `web/src/features/auth/lib/mock-auth-api.ts`의 `mockLogin`/`mockSignup`이 `web/src/features/auth/hooks/use-auth-mutation.ts`에서 그대로 사용된다. 로그인 폼으로는 실제 JWT를 절대 받을 수 없다.
- 반면 토큰 인프라 자체는 존재한다: `web/src/lib/api-client.ts`가 hey-api 클라이언트에 Bearer 토큰 부착 + 401 시 세션 클리어/로그인 리다이렉트 인터셉터를 등록하고, `web/src/features/auth/store/auth.store.ts`는 `accessToken`/`refreshToken`을 persist한다.
- 실제 토큰을 세팅하는 유일한 경로는 OAuth 콜백(`web/src/routes/auth/callback.tsx`의 `store.setTokens(tokens)`)뿐이다. 즉 **이메일/비밀번호 로그인 → API 호출** 플로우는 끝까지 연결되지 않은 상태다. mock 로그인으로 `isAuthenticated=true`가 되어도 `accessToken`이 없으므로 보호된 화면(`members`, `settings`)의 API 호출은 401 → 즉시 로그아웃 리다이렉트된다.
- 토큰 자동 갱신(refresh)은 의도적으로 범위 밖(ADR-0004, `api-client.ts` 주석) — 401이면 무조건 재로그인.

```
[로그인 폼] → mockLogin → user만 저장(토큰 없음) ─┐
[OAuth 콜백] → setTokens(실제 JWT) ──────────────┤→ api-client 인터셉터 → Bearer 부착
                                                  ↓ 401
                                          세션 클리어 → /login 이동 (갱신 없음)
```

## 3. RBAC — 스키마·가드는 완성, 운영 데이터가 불완전

스키마(`roles`/`permissions`/`role_permissions`/`user_roles`, `api/src/domains/auth/models/auth_models.py`)와 가드(`require_permission`, `api/src/domains/auth/security.py:383`)는 동작하고, 쓰기 엔드포인트에 실제 적용돼 있다(`api/src/domains/users/router/user_router.py`의 `users:write`, `api/src/domains/org/router/config_router.py`의 `org:write`, `api/src/domains/chat/router/chat_router.py`의 `chat:write`). 그러나 시드 데이터에 구멍이 있다:

- `api/scripts/seed.py`는 `admin` 롤과 `org:write`/`users:write` 퍼미션만 생성한다. **`chat:write` 퍼미션은 어디서도 시드되지 않는다** → chat 쓰기 엔드포인트는 전원 403.
- `api/src/domains/auth/service/auth_service.py:166`은 회원가입 시 `"user"` 롤을 기본 부여하려 하지만, **`user` 롤 자체가 시드에 없다** → `get_role_by_name("user")`이 None을 반환하고 조용히 건너뛴다. 신규 가입자는 롤 0개.
- 사용자에게 `admin` 롤을 부여하는 API 엔드포인트가 없다(`assign_role_to_user`는 `api/src/domains/auth/repository/auth_repository.py:106`에 있으나 가입 기본 롤 경로에서만 호출). 운영에서 쓰기 권한을 주려면 DB 직접 조작이 필요하다.

## 4. `members.tsx` — 전체 폼 PATCH가 `exclude_unset`을 무력화 (last-write-wins)

`web/src/features/office/screens/members.tsx`의 편집 플로우(`MemberForm`, 872행~)는 `UserCreate` 타입의 **전체 필드 객체**를 상태로 들고, 833행에서 그대로 `updateUserApiV1UsersUserIdPatchMutation`의 body로 보낸다. 서버는 `api/src/domains/users/service/user_directory_service.py:109`에서 `payload.model_dump(exclude_unset=True)`로 부분 업데이트를 의도하지만, 클라이언트가 항상 모든 필드를 채워 보내므로 `exclude_unset`이 사실상 무의미하다. 두 사용자가 같은 구성원을 동시에 편집하면 나중 저장이 앞선 저장을 통째로 덮어쓴다(낙관적 잠금·버전 필드도 없음). PATCH의 부분 업데이트 계약을 살리려면 폼에서 dirty 필드만 전송하거나, 서버에 `updated_at` 기반 충돌 감지를 추가해야 한다.

## 5. memo(리치텍스트) — 길이 가드·서버측 sanitize 부재

- **길이 가드 없음:** 백엔드는 `api/src/domains/users/schemas/user_schemas.py:39,72`에서 `max_length=100_000`을 강제하지만, `web/src/components/ui/rich-text-editor.tsx`에는 어떤 길이 제한/카운터도 없다. 초과 시 422가 떨어지고 사용자는 `members.tsx:815`의 일반 토스트("저장에 실패했습니다.")만 본다 — 원인을 알 수 없다.
- **sanitize는 클라이언트 렌더 시점에만:** 서버는 memo HTML을 원문 그대로 저장한다(`user_schemas.py` 주석: "렌더 시 sanitize (ADR-0007)"). 현재 유일한 표시 경로인 `RichTextView`(`rich-text-editor.tsx:191`)는 DOMPurify로 sanitize하므로 안전하지만, **이 보호는 모든 미래 소비자가 RichTextView를 쓴다는 가정에 의존**한다. memo를 raw로 렌더하는 화면/이메일/외부 연동이 하나라도 생기면 stored XSS가 된다. CSV export(`api/src/domains/users/router/user_router.py:156`)는 memo 컬럼을 포함하지 않아 현재는 무관.

## 6. 레거시 execCommand 에디터 2곳 — 공용 에디터 미이관

ADR-0007이 Tiptap(`web/src/components/ui/rich-text-editor.tsx`)을 표준으로 정했지만, 두 화면이 deprecated `document.execCommand` 기반 contenteditable 에디터를 그대로 쓴다:

- `web/src/features/office/screens/approval.tsx:624` (결재 문서 작성기, 823행에 비-sanitize `dangerouslySetInnerHTML` — 단 입력원은 정적 템플릿)
- `web/src/features/office/screens/projects.tsx:2026` (이슈 설명 에디터, 2009/2092행에 비-sanitize `dangerouslySetInnerHTML` — 입력원은 샘플 데이터)

현재는 두 화면 모두 정적/샘플 데이터만 렌더하므로 실질 XSS는 아니지만, 이 화면들이 서버 데이터에 연결되는 순간 위험이 현실화된다. 이관 시 sanitize 경로(`RichTextView`)로 함께 통일해야 한다.

## 7. 화면별 API 연동 격차 — 절반이 아직 하드코딩 mock

API에 실제 연결된 화면은 2개뿐이다(`useQuery` 사용 기준):

| 화면 | 파일 | 상태 |
|------|------|------|
| 구성원 관리 | `web/src/features/office/screens/members.tsx` | 실 API (users CRUD) |
| 설정 | `web/src/features/office/screens/settings.tsx` | 실 API (positions/grades/org config) |
| 팀 관리 (`team-list`) | `web/src/features/office/screens/teams.tsx` | **하드코딩** — 25명 `MEMBERS_DATA` 배열(34행)과 `INITIAL_NODES` 조직트리(62행). members와 같은 직원 데이터를 다루면서 users API 미연동 → 두 화면의 데이터가 서로 다르다 |
| 근태 | `web/src/features/office/screens/attendance.tsx` | 전부 클라이언트 생성 샘플 데이터 |
| 결재 | `web/src/features/office/screens/approval.tsx` | 샘플 문서(210행 "수신함별 샘플 문서") |
| 프로젝트 | `web/src/features/office/screens/projects.tsx` | 샘플 데이터(82행 "sample data (projects.js)") |

또한 nav id `att-analysis`는 `SCREEN_REGISTRY`(`web/src/features/office/screens/registry.ts`)에 구현이 없어 `web/src/features/office/components/app-shell.tsx:16`의 "준비 중인 화면입니다" 폴백으로 떨어진다.

## 8. chat 도메인 — 운영 보호장치 미비 (사전 존재)

- **레이트리밋 미적용:** `api/src/main.py:103`에 slowapi `Limiter`가 만들어지고 주석은 "routers import this to apply per-route limits"라고 하지만, `@limiter.limit` 데코레이터를 쓰는 라우트가 **코드베이스 전체에 0개**다. LLM 호출 비용 통제가 없다.
- **메시지 목록 무페이지네이션:** `api/src/domains/chat/router/chat_router.py:410` `list_messages`가 대화의 전체 메시지를 limit 없이 반환한다(users 쪽 `list_users`는 `page`/`page_size` 페이지네이션이 있는 것과 대조적).
- SSE 스트리밍 중 에러는 200 응답 시작 후 SSE error 이벤트로만 전달되고, 스트림 종료 후 `finally`에서의 메시지 persist 실패는 로그만 남고 클라이언트에 전달되지 않는다(스트림 핸들러 구조상 불가피하나 클라이언트 측 보정 로직이 없음).
- 입력 길이는 메시지당 `max_length=32_000`(`api/src/domains/chat/schemas/chat_schemas.py:61`)으로 막혀 있으나 메시지 개수 제한은 없다.

## 9. 백엔드 보안 잔여 이슈 (사전 존재, 재확인됨)

- **OAuth 토큰 평문 저장:** `api/src/domains/auth/models/auth_models.py:355-356` — `OAuthAccount.access_token`/`refresh_token`이 암호화 없이 `Text` 컬럼에 저장된다.
- **만료 토큰 정리 부재:** `refresh_tokens`, `email_verifications`, `password_resets` 테이블에 만료/사용 완료 행의 배치 삭제 메커니즘이 없다 — 운영에서 무한 증가.
- CORS가 `allow_methods=["*"]`, `allow_headers=["*"]`로 광범위하다(`api/src/main.py`).

## 10. 테스트 커버리지 격차

- **web에 테스트 러너가 없다:** `web/package.json`에 `test` 스크립트도 vitest/jest 의존성도 없다. 그런데 `web/src/sample/` 아래에 `*.test.ts` 파일 9개가 존재한다(예: `web/src/sample/auth/sign-in-page.test.ts`) — 실행 수단이 없는 고아 테스트다. `members.tsx`(1,000줄+)의 폼/뮤테이션 로직, `api-client.ts`의 인터셉터 등 핵심 프론트 로직이 전부 무테스트.
- API는 커버리지 70% 게이트(`--cov-fail-under=70`)가 있으나, 회원가입→이메일인증→로그인→권한 호출로 이어지는 도메인 횡단 E2E 시나리오 테스트는 없다(`api/tests/`는 도메인별 분리: `auth/`, `chat/`, `users/`, `org/`).

## 11. 기타 / 소소한 부채

- `web/src/sample/` — 644KB 분량의 데모/샘플 코드가 `/sample` 라우트로 프로덕션 번들에 포함된다(`web/src/routes/sample.tsx`). `web/src/routes/test/modal.tsx`라는 테스트용 라우트도 번들에 들어간다.
- `web/src/features/office/screens/teams.tsx`와 `members.tsx`가 각각 `Member` 타입을 따로 정의한다(teams는 로컬 하드코딩 타입, members는 생성된 API 타입) — teams 이관 시 통합 필요.
- users CSV export(`api/src/domains/users/router/user_router.py:150`)는 `page_size=10_000` 하드캡으로 전체를 한 번에 조회한다 — 직원 1만 명 초과 시 잘린다(현 규모에선 비현실적이므로 낮은 우선순위).
- TODO/FIXME/HACK 주석은 자체 작성 코드에 사실상 없다 — 유일한 1건은 hey-api 생성 코드(`web/src/client/client/client.gen.ts:214`)로 수정 대상 아님.
- `api/CLAUDE.md`는 현 스택과 무관한 Ouroboros 워크플로우 문서다(루트 `CLAUDE.md`에 명시) — 신규 기여자 혼동 요인.

## 심각도 요약

| 항목 | 심각도 | 근거 |
|------|--------|------|
| 프론트 로그인 mock (§2) | **높음** | 이메일/비번 로그인으로 앱 사용 불가 — E2E 단절 |
| RBAC 시드 구멍 (§3) | **높음** | chat 전면 403, 신규 가입자 롤 0개, admin 부여 수단 없음 |
| `task lint` 실패 (§1) | **높음** | CI/검증 게이트가 깨진 상태로 방치 — 신규 위반 검출 불가 |
| 전체 폼 PATCH (§4) | 중간 | 동시 편집 시 조용한 데이터 덮어쓰기 |
| memo 길이/서버 sanitize (§5) | 중간 | UX 불친절 + 미래 소비자의 XSS 잠재 위험 |
| execCommand 에디터 (§6) | 중간 | deprecated API + 비-sanitize 렌더, 서버 데이터 연결 시 위험 |
| chat 레이트리밋/페이지네이션 (§8) | 중간 | LLM 비용 무제한, 대화 비대 시 성능 저하 |
| OAuth 토큰 평문·토큰 테이블 비대 (§9) | 중간 | 운영 장기화 시 보안/용량 문제 |
| mock 화면들 (§7), web 무테스트 (§10) | 중간 | 기능 격차이지 버그는 아님 — 로드맵 항목 |
