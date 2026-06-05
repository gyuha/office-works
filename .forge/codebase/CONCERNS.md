---
last_mapped_commit: b8943aa32230936b80046e2f9b1a4dec458255df
mapped: 2026-06-05
---

# CONCERNS — 기술 부채 · 알려진 이슈 · 위험 영역

이 문서는 디스크상의 실제 코드 상태를 검증해 작성했다. 각 항목은 파일·라인을 직접 확인한 결과다. 추정·미확인 항목은 신뢰 수준 태그를 붙였다.

## 0. 형상관리 / 리포지토리 상태

- **`api/` 전체가 git 미추적(untracked).** `git status`에서 `?? api/`로 나오며, `git ls-files api/`는 빈 결과를 반환한다. 새 FastAPI 백엔드 전체(약 50개 소스 파일 + Alembic 마이그레이션 + Docker/Task 설정)가 한 번도 커밋되지 않은 상태다. 이 매핑의 기준 커밋 `b8943aa`("api reset")는 `api/`를 추적하지 않는다. 백엔드가 사실상 버전관리 밖에 있다는 것이 가장 큰 단일 리스크다.
- 반대로 `.forge/codebase/` 문서들(`ARCHITECTURE.md`, `CONCERNS.md` 등)은 `git status`에서 `D`(삭제됨)로 표시된다 — 이전 매핑 문서가 작업트리에서 삭제된 상태이며, 이 매핑이 재생성하는 중이다.
- 루트 `web/package.json`과 `CLAUDE.md`는 수정됨(`M`)으로 표시된다.
- `api/htmlcov/`(커버리지 HTML 리포트 ~80개 파일)와 `api/.pytest_cache/`가 작업트리에 존재한다. 빌드 산출물이 소스 트리에 섞여 있다 — `.gitignore`로 배제되는지 미확인이나 정리 대상.

## 1. 프론트엔드 — 실 API 미연동 (mock 전용)

- `web/src/features/auth/lib/mock-auth-api.ts` — 로그인/회원가입이 `setTimeout(750ms)` 지연 후 하드코딩 응답을 반환하는 순수 mock이다. `fail@example.com` / `taken@example.com` 같은 매직 이메일로만 에러를 흉내 낸다.
- 이 mock은 `web/src/features/auth/hooks/use-auth-mutation.ts`의 `mutationFn`에 직접 연결돼 있다(`mockLogin`/`mockSignup` import).
- **프론트엔드 전체에 실 HTTP 클라이언트가 없다.** `web/src/features`·`lib`·`providers`에서 `fetch(`·`axios`·`/api/v1`·`import.meta.env`·`VITE_API` 검색 결과가 모두 0건이다. 백엔드 `/api/v1/auth/*`가 구현돼 있으나 프론트는 그것을 호출하지 않는다. 두 절반이 완전히 분리돼 있다. `web/.env*` 파일도 없어 API base URL 설정 자체가 부재하다. `[높음]`

## 2. Python 버전 민감성 (chat 도메인 테스트 collection 실패 위험)

- `api/pyproject.toml`: `requires-python = ">=3.12"`, mypy `python_version = "3.12"`. 의존성에 `langchain>=0.3.0`, `langchain-core>=0.3.0`, `langchain-community>=0.3.0`, `langchain-litellm>=0.2.0`, `litellm>=1.50.0`가 고정 없이 하한만 지정돼 있다.
- chat 라우터(`api/src/domains/chat/router/chat_router.py`)는 모듈 최상단에서 `from langchain_core.messages import ...`를 런타임 import 한다. Python 3.14 + langchain의 `pydantic.v1` 비호환 시 chat 도메인 테스트가 **collection 단계에서** 실패한다. 반드시 Python 3.12로 개발해야 한다. `[중간]` — 비호환 자체는 환경 사실로 보고됐고, import 경로는 코드에서 확인.
- 반면 `api/src/domains/chat/service/chat_service.py`는 langchain 타입을 `TYPE_CHECKING` 블록에서만 import 해 런타임 로딩을 피한다(헥사고날 경계 의도). 라우터는 이 보호가 없다.

## 3. CONCERN: chat LLM 프록시 엔드포인트가 인증 없음 (비용/남용 위험)

`api/src/domains/chat/router/chat_router.py`:

- `POST /api/v1/chat/complete`, `POST /api/v1/chat/stream`, `GET /api/v1/chat/provider` 세 엔드포인트에 `get_current_user`/`require_permission` 의존성이 **전혀 없다.** 누구나 인증 없이 LLM provider를 호출할 수 있다 — 실제 OpenAI/Anthropic 키가 설정되면 무인증 비용 발생·남용·키 소진 위험.
- 반면 conversation 관리 엔드포인트(`/chat/conversations*`, `/chat/conversations/{id}/messages`)는 `Depends(get_current_user)` 및 일부는 `require_permission("chat:write")`로 보호된다. 보호 정책이 엔드포인트별로 일관되지 않다. `[높음]`

## 4. CONCERN: 레이트 리미터가 설치만 되고 적용은 0건

- `api/src/main.py`에서 `slowapi`의 `Limiter`를 인스턴스화하고(`limiter = Limiter(key_func=_get_user_key)`) `app.state.limiter`에 등록한다.
- 그러나 `api/src/domains` 전체에 `@limiter.limit(...)` 데코레이터가 **하나도 없다**(검색 0건). 즉 `/auth/login`, `/auth/signup`, `/auth/password-reset` 등에 브루트포스/열거 방어가 실제로 걸려 있지 않다. 인프라만 있고 정책은 미적용. `[높음]`
- 부수: `_get_user_key`는 `request.state.user`를 읽지만, 인증은 FastAPI `Depends`로만 수행되며 `request.state.user`를 세팅하는 미들웨어가 없어 항상 IP 폴백으로 동작한다. `[중간]`

## 5. BUG: `python -m` 직접 실행 시 uvicorn 타깃이 깨져 있음

`api/src/main.py` 266–285:

```python
uvicorn.run(
    "\1",          # ← 정규식/sed 치환 잔재. 유효한 "module:attr" import 문자열이 아님
    ...
)
```

- `if __name__ == "__main__"` 블록의 `uvicorn.run()` 첫 인자가 리터럴 `"\1"`이다. cookiecutter 템플릿 치환 누락으로 보이며(원래 `"main:app"` 류여야 함), `uv run python -m src` 직접 실행 경로는 크래시한다.
- 단, 정식 진입점인 `task dev`/`task serve`는 `uvicorn ... main:app`을 외부에서 지정할 가능성이 높아 이 버그를 우회할 수 있다(Taskfile의 정확한 커맨드는 본 매핑에서 미확인). `[높음]` (코드 라인 직접 확인)

## 6. 문서/코드 불일치

- **`api/CLAUDE.md` 상단 블록은 Ouroboros 스펙-우선 워크플로우 문서**("Specification-First AI Development", `ooo` 명령 등)로, 실제 스택(FastAPI/uv)과 무관하다. 마커 아래쪽에는 정상적인 코드베이스 가이드가 있으나, 상단의 Ouroboros 내용이 혼란을 준다. `[높음]`
- `api/src/main.py` docstring이 `make dev`/`make serve`/`app.main:app`을 안내하지만, 실제 진입점은 Taskfile이고 레이아웃은 flat `src/`(top-level `main:app`)다. Makefile은 존재하지 않는다. `[중간]`
- `api/src/domains/chat/service/chat_service.py` 등 여러 docstring이 `app.domains.chat...`·`app.core...` 경로를 참조하나, 실제는 `PYTHONPATH=src` 기반 flat 레이아웃이라 `app.` prefix가 없다(`domains.chat...`). cookiecutter `app/` 패키지 레이아웃에서 flat로 옮기며 docstring을 업데이트하지 않은 잔재. `[높음]`

## 7. RBAC 스키마 상태 — 보고된 내용과 코드가 불일치

- 출발점 가설은 "RBAC가 스키마에 미구현(계획 단계), 마이그레이션은 `0001_initial_schema` 하나뿐"이었다. **마이그레이션이 하나뿐인 것은 사실**(`api/alembic/versions/0001_initial_schema.py`)이나, **RBAC 테이블은 이미 그 안에 전부 정의돼 있다**: `permissions`, `roles`, `role_permissions`, `user_roles`. ORM 모델(`api/src/domains/auth/models/auth_models.py`)도 `Permission`/`Role`/`User.roles`/`User.has_permission()`을 완전 구현했고, `require_permission()` 의존성(`security.py`)과 `chat_router`의 `require_permission("chat:write")`가 이를 사용한다.
- 따라서 "RBAC 미구현"은 **현재 코드 기준으로 부정확하다.** pyproject의 description("auth (JWT+OAuth+RBAC)")과 일치한다. 단, **role/permission을 시드(seed)하는 마이그레이션·스크립트·기본 데이터가 없다** — `signup`/`oauth_provision_user`는 `get_role_by_name("user")`가 존재할 때만 기본 역할을 부여하는데, "user" 역할이나 "chat:write" 권한을 생성하는 코드가 없다. 결과적으로 `require_permission("chat:write")`로 보호된 엔드포인트는 시드 부재 시 모든 사용자에게 403을 반환한다. 이것이 진짜 incomplete 영역이다. `[높음]`

## 8. 보안 민감 영역 (검토 결과)

### 시크릿 로딩
- `api/.env`는 `.gitignore`에 의해 추적 제외 확인됨(`git check-ignore .env` → ignored). 내용은 **placeholder 값**(`SECRET_KEY=change-...`, `JWT_SECRET_KEY=change-...`, `GOOGLE_CLIENT_SECRET=your-g...`, `OPENAI_API_KEY=sk-...`(6자, 자리표시))으로, 실제 노출된 시크릿은 발견되지 않았다. 실 키가 채워지면 추적 제외라 안전하나, 현재 기본값 그대로면 `secret_key`/`jwt_secret_key`가 `"change-me..."`로 동작한다(`core/config.py` 288, 327 기본값). 프로덕션에서 이 기본값이 그대로 쓰일 위험 — 기동 시 강제 검증(예: production에서 기본값 거부)이 없다. `[높음]`

### JWT
- `api/src/domains/auth/security.py`: HS256, access 15분 / refresh 7일, `jti` 기반 Redis 블랙리스트, refresh 토큰 회전 + 재사용 탐지(`auth_service.refresh`). refresh 토큰의 raw는 SHA-256 해시로만 DB 저장. 설계는 견고하다.
- 단주의: `security.py`의 `JWT_ALGORITHM = "HS256"`, `ACCESS_TOKEN_EXPIRE_MINUTES = 15`가 **모듈 상수로 하드코딩**돼 있어 `core/config.py`의 동명 설정(`jwt_algorithm`, `jwt_access_token_expire_minutes`)과 이중화돼 있다. `.env`로 만료/알고리즘을 바꿔도 토큰 생성 코드는 상수를 쓰므로 반영되지 않는다. 설정 출처가 둘로 갈라진 상태. `[높음]`

### OAuth state (CSRF)
- `auth_router.py`: state nonce를 Redis에 `oauth:state:{state}`로 저장(TTL 600s), 콜백에서 `stored_provider != provider` 비교 후 삭제. Redis 클라이언트는 `decode_responses=True`(`core/redis.py`)라 문자열 비교가 정상 동작한다. 로직 자체는 타당.
- 잠재 문제: `oauth_login`은 **인증 없이** 호출 가능해 누구나 state를 무제한 발급해 Redis에 쓸 수 있다(레이트 리밋 없음, 항목 4 참조). DoS/Redis 채우기 표면. `[중간]`
- `oauth_callback`의 502 에러 응답이 `detail=f"OAuth provider error: {exc!s}"`로 **예외 메시지를 그대로 클라이언트에 노출**한다(338–341). provider 응답 내부 정보 누출 가능. chat 라우터의 `LLM provider error: {exc!s}`도 동일 패턴. `[중간]`

### OAuth 토큰 저장
- `oauth_accounts.access_token`/`refresh_token`이 **평문(Text) 컬럼**으로 저장된다(`auth_models.py` 327–328, 마이그레이션 194–195). provider access/refresh 토큰이 DB에 암호화 없이 보관된다. `[중간]`

### CORS
- `main.py`: `allow_origins=settings.cors_origins_list`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`. origin은 설정 기반(기본 localhost:3000/8000)이라 와일드카드는 아니나, `allow_credentials=True` + 메서드/헤더 전체 허용 조합은 origin 목록 관리가 느슨해지면 위험. 현재는 명시 목록이라 수용 가능. `[낮음]`

## 9. 에러 처리 / 견고성 갭

- **회원가입 시 인증메일 전송 실패를 삼킨다.** `auth_service.signup_and_send_email`는 메일 예외를 잡아 로깅만 하고 가입을 성공 처리한다(183–186). 재전송 엔드포인트가 라우터에 보이지 않아(`/auth/signup`, `/verify-email/{token}`만 존재), 메일이 실패한 사용자는 영구히 미인증·로그인 불가 상태가 될 수 있다. `[중간]`
- **SSE 스트리밍 중 에러 처리가 절단된 응답을 남긴다.** chat 라우터의 `_event_gen`/`send_message`는 스트림 중 예외를 `{"event": "error"}` 이벤트로 흘리고, `finally`에서 그때까지 모인 chunk를 assistant 메시지로 DB에 저장한다(521–542). 부분 응답이 완전한 메시지로 영구 저장되며 `finish_reason="stop"`으로 기록돼, 실패한 응답과 정상 완료를 구분할 수 없다. `[중간]`
- `verify_email`/`confirm_password_reset` 등은 `datetime.now(UTC)` 비교로 만료를 직접 검사하는데, DB의 timezone-aware 컬럼과 비교 시 naive/aware 혼선 여지. 코드상 `expires_at`은 aware로 저장돼 일관돼 보임. `[낮음]`

## 10. 테스트 / 검증 갭

- **`web/`에 테스트 러너가 없다.** `web/package.json` scripts에 `test`가 없고(`dev`/`build`/`preview`/`typecheck`/`lint`/`lint:fix`/`format`만), `vitest` 의존성도 없다. 그런데 `web/src/sample/` 아래에 `*.test.ts` 파일이 ~10개 존재한다(`sign-in-page.test.ts` 등은 `node:fs`/`typescript`로 소스를 정적 파싱하는 형태). 실행할 수단이 wiring 안 됨 — 죽은 테스트. `[높음]`
- `web/src/sample/`은 대규모 스캐폴드(admin shell, dashboard, tasks, users, settings, help-center 등)로 실제 `office-works` 기능과 무관한 데모 코드다. `@faker-js/faker`가 prod dependency에 포함돼 있다(데모용 더미 데이터). 정리 대상 후보. `[중간]`
- API 커버리지 70% 강제(`pytest --cov-fail-under=70`)는 있으나 `web`은 커버리지 게이트 없음.

## 11. 기타 관찰

- `api/src/main.py`의 라우터 등록은 `try/except ImportError`로 감싸 auth/chat 라우터가 import 실패해도 조용히 스킵된다(226–241). langchain import 실패(항목 2) 시 chat 라우터가 등록 안 된 채 앱이 정상 기동돼, 404로만 드러나고 원인이 숨는다. `[중간]`
- `LLMSettings`(`core/config.py`)와 root `Settings`에 LLM 필드가 **이중 정의**돼 있고, `Settings.llm` 프로퍼티가 매 접근마다 새 `LLMSettings`를 생성한다(537). provider 키 설정이 두 모델에 흩어져 유지보수 부담. `[낮음]`
- `.forge/codebase/STACK.md` 등 자매 문서가 작업트리에서 삭제 상태(항목 0)라, 이 CONCERNS 문서가 참조할 동반 맵이 현재 부재할 수 있다.

---

## 우선순위 요약 (영향도 순)

| # | 항목 | 신뢰 | 영향 |
|---|------|------|------|
| 0 | `api/` 전체 git 미추적 | 높음 | 백엔드 형상관리 부재 |
| 3 | chat LLM 프록시 무인증 | 높음 | 비용/남용 |
| 4 | 레이트 리밋 적용 0건 | 높음 | 브루트포스/열거 |
| 5 | `uvicorn.run("\1")` 깨진 진입점 | 높음 | 직접 실행 크래시 |
| 7 | RBAC role/permission 시드 부재 | 높음 | 보호 엔드포인트 전원 403 |
| 8 | 기본 SECRET/JWT 키 강제검증 부재 | 높음 | prod 약한 키 |
| 8 | JWT 설정 상수/Settings 이중화 | 높음 | 설정 무효화 |
| 1 | 프론트 실 API 미연동(mock 전용) | 높음 | 기능 미완성 |
| 6 | docstring `app.` 경로·Makefile 불일치, Ouroboros 문서 | 높음 | 혼란 |
| 10 | web 테스트 러너 부재(죽은 .test.ts) | 높음 | 검증 불가 |
| 8 | OAuth provider 에러 메시지 노출 / 토큰 평문 저장 | 중간 | 정보 누출 |
| 9 | 메일 실패 삼킴 / SSE 부분응답 저장 | 중간 | 데이터 무결성 |
| 2 | Python 3.14 langchain 비호환 | 중간 | 테스트 collection 실패 |
| 11 | 라우터 import 실패 무음 스킵 | 중간 | 장애 은폐 |
