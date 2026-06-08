# 2026-06-07 — 구성원 목록 화면 ↔ API 연결 (hey-api 생성 클라이언트 · 서버사이드 · CRUD/CSV)

## Plan vs actual

- **What went as planned**:
  - 직접 순차 실행(워크플로 미사용)로 S1~S4 + 환경 수정까지 `feat/members-list-api-integration`(`feat/member-management-api` 위 stacked)에 4커밋 안착: `3bd45ef`(stats.departments) · `eb891bd`(hey-api codegen+gen-api+인터셉터) · `051c7b7`(화면 서버사이드 연동+CRUD+CSV) · `7e08ab9`(env 수정).
  - 확정 결정 8개 전부 구현. hey-api 0.98.1 도입, `task gen-api`(export→codegen) 동작, 생성물 `web/src/client/` 커밋, Biome ignore. 정적 게이트 통과(`pnpm typecheck` 0·`build` 성공·변경분 Biome clean·백엔드 `pytest tests/members/` 15 passed).
  - Context7로 hey-api 0.98 현행 문법 확인 후 작성(plan이 지시한 대로). ADR-0004대로 두 HTTP 레이어 공존.
- **Divergences**:
  - **[High · 해소] retro가 두 번 미뤄온 Python 3.14 환경 빚이 `task dev` UAT에서 폭발 → 근원 수정**. uvicorn `--reload` spawn 워커가 3.12/3.14 stdlib을 섞어 `_typing` `Union` import 실패로 크래시. `requires-python=">=3.12"` 상한 부재로 `uv run`이 기본 3.14 선택(`.python-version`은 `api/.gitignore`가 무시해 공유 안 됨). non-goal이었으나 런타임을 막아 끌어옴: `pyproject.toml` `requires-python`을 `">=3.12,<3.13"`으로 좁힘. 검증 uvicorn 라이브 기동·Union 크래시 0.
  - [정보] S3·S4를 단일 파일(`members.tsx`) 재작성으로 병합, 커밋 1개.
  - [정보] hey-api 0.98: `@hey-api/client-fetch` standalone deprecated(플러그인이 클라이언트 번들), `runtimeConfigPath`는 `.ts` 확장자 빼야 tsc 통과, 생성 함수명이 operationId 기반으로 장황.
  - [정보] '이번 달 신규' 카드 하드코딩 → 실 `/stats.new_this_month`, openapi export 로그 오염 교정(파일 직접 쓰기).
  - [low] 검색 디바운스 없음(키스트로크당 refetch, ~25명 규모라 수용).

## Learnings

- **Do differently next time**:
  - **dev 런타임을 막는 환경 빚은 처음 관측될 때 추적되는 곳(pyproject)에 핀하라 — `--python` 플래그 우회는 빚을 반복시킨다.** 이 빚은 teams-sso·member-management 회고에서 두 번 "별도 작업"으로 미뤄졌고, 매번 `uv run --python 3.12`로 우회됐다. 결과적으로 `task dev`(우회 플래그 없는 문서화된 실행 경로)가 깨진 채 남아 UAT에서 터졌다. `.python-version`은 `api/.gitignore`가 무시하므로 공유 핀으로 쓰지 말 것(추적되는 pyproject가 정답).
  - **★ 오래 문서화된 "비호환" 경고는 그대로 믿지 말고 실측하라 — 이번 최대 교훈.** CLAUDE.md·codebase 맵·retro 3곳이 한목소리로 "Python 3.14 + langchain pydantic.v1 비호환"이라 적어 두 작업 내내 3.12로 우회했는데, **사용자 지시로 실제 3.14에서 돌려보니 642 passed로 멀쩡**했다(의존성이 그 사이 갱신됨). 즉 우리가 줄곧 우회해온 제약이 이미 사라졌는데 문서만 남아 빚으로 작용했다. 원래 크래시도 "3.14가 나쁘다"가 아니라 venv(3.12)/resolve(3.14) **불일치**였다. → **장기 우회 중인 "환경 제약"은 주기적으로 한 번 실측해 아직 유효한지 확인할 것.** 결국 `<3.13` 캡을 되돌리고 `>=3.14`로 통일, 코드 수정 0.
  - **정적 게이트(typecheck/build/test) 통과 ≠ "앱에서 동작". DoD에 런타임이 있으면 문서화된 실행 명령을 실제로 띄워라.** 이번에 `verified: yes`를 정적 게이트 기준으로 먼저 줬는데, 사용자가 붙여준 `task dev` 크래시가 이를 교정했다. **프론트/풀스택 연동 작업의 UAT는 "문서대로 `task dev`가 떠서 화면이 데이터를 렌더하는가"를 최소 1회 확인하는 단계를 포함해야 한다.** 헤드리스 자동화가 어려우면(인증 SPA 세션) 최소한 dev 서버 부팅과 라이브 엔드포인트 응답까지는 찍을 것.
  - **외부 라이브러리 버전별 함정은 Context7로 미리 확인하면 싸다.** hey-api 0.98의 번들 클라이언트·`runtimeConfigPath` 확장자 함정은 추측했으면 시행착오였을 것. 그릴링에서 "실행 시 Context7로 현행 문법 확인"을 plan에 명시한 게 적중.
  - (구현 디테일, retro 한정) 생성 클라이언트 함수명이 FastAPI 기본 operationId라 장황 — 깔끔한 이름을 원하면 라우트에 `operation_id`를 주거나 `generate_unique_id_function`을 설정해야 한다. 이번엔 범위 밖.

## Doc updates

- CONTEXT.md promotion: **none** — 새 도메인 용어/의미 변화 없음(codegen·환경 핀은 구현 영역).
- ADR added: **none** — ADR-0004(hey-api 생성 클라이언트)는 fg-ask 그릴링에서 이미 추가. Python 버전 핀(`>=3.14`)은 ADR 바 미달(되돌리기 쉽고, 이유가 커밋·CLAUDE에 명시).
- **기타 문서 갱신(코드 변경 커밋에 포함)**: 3.14 표준화로 `CLAUDE.md`(root+api)의 "3.12 / 3.14 비호환" 문구 정정, `api/pyproject.toml`(requires-python·classifier·mypy), `api/Dockerfile`(ARG), 루트 `Taskfile.yml`(gen-api), `api/README.md` 갱신(`761f9a2`). `.forge/codebase/*` 맵의 "3.12 필수" 기술은 stale로 남음 → 다음 `fg-map` 재실행 시 갱신 대상.

## 후속 작업 후보 (fg-cleanup 후 fg-ask 대상)

1. **브랜치 머지 전략** — `feat/member-management-api`(백엔드)와 그 위 stacked `feat/members-list-api-integration`(프론트)이 미머지/미푸시. 개별 PR vs 묶음 PR 결정 후 머지.
2. **auth를 생성 클라이언트로 이전** — 현재 두 HTTP 레이어 공존(members=생성, auth=수동 apiFetch + mock). auth도 hey-api 생성 클라이언트로 통합.
3. **인증 SPA 클릭 UAT** — members:write admin 계정으로 브라우저 클릭 검증(추가/편집/삭제/내보내기 라운드트립).
4. **사전 게이트 빚 정리** — web `pnpm lint` 사전 57건(sidebar/teams/teams-login 등), 백엔드 test_member_service.py unused-ignore 3건. 별도 청소 작업.
5. 검색 디바운스, 생성 함수명 정리(operation_id), 401 silent refresh(자동 토큰 갱신, 현재 재로그인).
