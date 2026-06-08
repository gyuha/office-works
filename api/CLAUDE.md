<!-- ooo:START -->
<!-- ooo:VERSION:0.36.0 -->
# Ouroboros — Specification-First AI Development

> Before telling AI what to build, define what should be built.
> As Socrates asked 2,500 years ago — "What do you truly know?"
> Ouroboros turns that question into an evolutionary AI workflow engine.

Most AI coding fails at the input, not the output. Ouroboros fixes this by
**exposing hidden assumptions before any code is written**.

1. **Socratic Clarity** — Question until ambiguity ≤ 0.2
2. **Ontological Precision** — Solve the root problem, not symptoms
3. **Evolutionary Loops** — Each evaluation cycle feeds back into better specs

```
Interview → Seed → Execute → Evaluate
    ↑                           ↓
    └─── Evolutionary Loop ─────┘
```

## ooo Commands

Each command loads its agent/MCP on-demand. Details in each skill file.

| Command | Loads |
|---------|-------|
| `ooo` | — |
| `ooo interview` | `ouroboros:socratic-interviewer` |
| `ooo seed` | `ouroboros:seed-architect` |
| `ooo run` | MCP required |
| `ooo evolve` | MCP: `evolve_step` |
| `ooo evaluate` | `ouroboros:evaluator` |
| `ooo unstuck` | `ouroboros:{persona}` |
| `ooo status` | MCP: `session_status` |
| `ooo setup` | — |
| `ooo help` | — |

## Agents

Loaded on-demand — not preloaded.

**Core**: socratic-interviewer, ontologist, seed-architect, evaluator,
wonder, reflect, advocate, contrarian, judge
**Support**: hacker, simplifier, researcher, architect
<!-- ooo:END -->

---

# 코드베이스 가이드 (api/)

> 위 Ouroboros 블록은 `ooo` 도구가 `<!-- ooo:START/END -->` 마커 사이를 재생성하므로 **그 안쪽을 직접 수정하지 말 것**. 코드베이스 관련 내용은 이 마커 아래에만 작성한다. (모노레포 전체 가이드는 루트 `../CLAUDE.md` 참고.)

`office-works`의 FastAPI 백엔드. Python 3.14 / uv 기반이며 인증(JWT + OAuth2 + 이메일 인증)과 LLM 채팅 프록시 도메인을 제공한다.

## 명령어

[Task](https://taskfile.dev)(`Taskfile.yml`)가 정식 진입점이다. 모든 Python 실행은 `uv run` 경유이며 `PYTHONPATH=src`는 Taskfile이 자동 설정한다(`Justfile`은 동일 명령을 미러링하는 보조용).

```bash
task dev                # 인프라 기동 + 마이그레이션 + FastAPI 핫리로드
task serve              # 앱만 재시작 (인프라/마이그레이션 스킵)
task infra / infra-down # 인프라(Postgres/Redis/Mailpit) 컨테이너만

task test               # 전체 (커버리지 70% 강제 — pytest --cov-fail-under=70)
task test-unit          # 마커 unit 만
task test-integration   # 마커 integration 만 (인프라 필요)

# 단일 테스트
uv run pytest "tests/test_config.py::TestMailSettings::test_mail_from_uses_project_slug"

task lint               # ruff check + mypy strict
task format             # ruff format + ruff check --fix
task typecheck          # mypy 만

task migrate            # alembic upgrade head
task revision           # autogenerate 리비전 생성 (대화형)
task seed               # 조직설정 캐노니컬 데이터셋 upsert (idempotent, migrate 후)
```

> 통합 `check` 태스크는 없다 — 전체 검증은 `task lint && task test`.

## 아키텍처

`src/`는 **flat 레이아웃**이다(톱레벨 패키지 prefix 없음, `PYTHONPATH=src`로 `core`/`domains`/`infra`를 직접 import). 도메인별로 레이어를 적용한다:

```
{domain}/router → service → repository → models
{domain}/schemas (Pydantic 요청/응답 DTO)
core/  (config, database, redis, exceptions, logging, middleware)
infra/ (llm — provider_factory 등 외부 어댑터)
```

- `domains/auth/` — 회원가입·이메일 인증·로그인·토큰 회전·OAuth2(Google/Kakao/Naver). `oauth/`·`security`·`email` 모듈 포함
- `domains/chat/` — LLM 채팅(동기 + SSE 스트리밍). `infra/llm`의 langchain-litellm 어댑터 경유로 provider 이식성 확보
- `domains/shared/` — 도메인 공용 base 엔티티·이벤트·타입

`main.py`의 앱 팩토리(`create_app`)에서 라우터를 `/api/v1` prefix로 등록한다(`health_router`만 루트). 미들웨어는 `CorrelationIdMiddleware` + CORS, 예외 핸들러는 `register_exception_handlers`로 일괄 등록, 시작/종료는 `lifespan` 컨텍스트로 관리.

요청 흐름:

```
요청 → CorrelationIdMiddleware → 라우터(/api/v1) → 서비스 → 리포지토리 → DB(AsyncSession)
                                      ↓ AppError 발생
                          register_exception_handlers → {"detail": ...} + X-Correlation-ID
```

## 핵심 패턴 (여러 파일을 읽어야 보이는 것)

- **DB는 SQLAlchemy 2.0 async**(`AsyncSession` + asyncpg). 핸들러·서비스·리포지토리는 전부 `async def`. Alembic 마이그레이션만 동기 드라이버(psycopg2, `DATABASE_URL_SYNC`)를 쓴다.
- **DI는 FastAPI `Depends`** — `get_async_session`·`get_redis_dep`·`get_settings`로 주입하고, 라우터의 `_get_service` 헬퍼가 세션/Redis를 받아 서비스를 조립한다(서비스는 생성자 주입).
- **에러는 응답 envelope/`DOMAIN_NNN` 코드 체계가 없다.** 서비스가 `core/exceptions.py`의 `AppError` 계층(`NotFoundError`·`ConflictError`·`UnauthorizedError`·`ForbiddenError`, 각자 `status_code` 보유)을 raise → 핸들러가 `{"detail": ...}` JSON + `X-Correlation-ID` 헤더로 변환. 라우터에서 `HTTPException` 직접 raise도 허용.
- **DTO·검증은 Pydantic v2**(`schemas/`), 설정은 pydantic-settings `Settings`(`core/config.py`, LLM 설정은 `LLM_` prefix), 로깅은 structlog(JSON + `correlation_id` 바인딩).

## 테스트

pytest(`asyncio_mode = auto` — async 테스트에 데코레이터 불필요). 파일 `test_*.py`, 클래스 `Test*`, 함수명 `test_methodUnderTest_scenario_expectation`. 마커 `unit`/`integration`/`e2e`(`--strict-markers`). Redis는 `fakeredis`로 스텁. 커버리지 **70%** 강제(대상 `src`, `alembic/`·`tests/`·`migrations/` 제외).

## 주의 사항

- **Python 3.14로 개발할 것**(`requires-python = ">=3.14"`). 과거 langchain `pydantic.v1`이 3.14에서 깨졌으나 의존성 갱신으로 해소됨(전체 테스트 642 passed on 3.14). `.python-version`은 `api/.gitignore`가 무시하므로 버전 핀은 `pyproject.toml`이 담당.
- Alembic: 기존 리비전 수정 금지, 신규는 `task revision`. **리비전 id는 ≤32자** — `alembic_version.version_num`이 `varchar(32)`라 더 길면 upgrade의 version UPDATE가 `StringDataRightTruncation`으로 실패하며 트랜잭션이 롤백된다(파일명은 길어도 되지만 파일 안의 `revision = "..."` 문자열이 ≤32자여야 함).
- 인프라 호스트 포트(모두 `127.0.0.1` 바인딩): PostgreSQL 5432, Redis 6379, Mailpit SMTP 1025 / UI 8025. 메일은 dev=Mailpit, prod=SMTP(env).
