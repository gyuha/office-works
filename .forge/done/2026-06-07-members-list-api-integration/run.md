<!-- forge-slug: members-list-api-integration -->

# run — 구성원 목록 화면 ↔ API 연결 (hey-api)

실행: 2026-06-07 · **직접 순차 실행**(워크플로 미사용) · 브랜치 `feat/members-list-api-integration`(`feat/member-management-api` 위에 stacked). 커밋 4개.

| 커밋 | 슬라이스 |
|------|----------|
| `3bd45ef` | S1 — `/members/stats`에 `departments` 추가 |
| `eb891bd` | S2 — hey-api codegen + `gen-api` Taskfile + 클라이언트/인터셉터 |
| `051c7b7` | S3+S4 — members 화면 서버사이드 연동 + CRUD/내보내기 (한 파일이라 병합) |

## What went as planned

- **확정 결정 8개 전부 구현**: 서버사이드 목록(q/department/grade/sort/order/page), 커밋된 스냅샷 `api/openapi.json`, 생성물 `web/src/client/` 커밋, TanStack Query 플러그인, baseUrl+Bearer 인터셉터+401→`/login`, `/stats.departments` 드롭다운, 읽기+편집+추가+삭제+CSV.
- **hey-api 0.98.1 도입** — `@hey-api/openapi-ts`(dev) + client-fetch/tanstack-query 플러그인. `defineConfig`(input `../api/openapi.json`, output `./src/client`, runtimeConfigPath `./src/lib/hey-api`). `task gen-api`(export→codegen) 동작 확인.
- **정적 게이트 통과**: `pnpm typecheck` 0, `pnpm build` 성공, 변경 파일 Biome clean(생성물은 ignore). 백엔드 `pytest tests/members/` **15 passed**(S1 departments 테스트 +1), 변경분 ruff/mypy clean.
- ADR-0004대로 두 HTTP 레이어 공존(members=생성 클라이언트, auth=기존 apiFetch). Context7로 hey-api 0.98 현행 문법 확인 후 작성.
- 선결 조건(members 백엔드 존재) 충족 — `feat/member-management-api` 위에 stacked 브랜치로 진행.

## Divergences (계획 대비 실제)

- **[정보] S3·S4 병합** — 계획은 읽기(S3)/mutations(S4) 분리였으나 둘 다 `members.tsx` 단일 파일이라 한 번의 재작성으로 구현, 커밋 1개(`051c7b7`)로 합침. 슬라이스 완료기준은 둘 다 충족.
- **[정보] hey-api 클라이언트 번들** — `@hey-api/client-fetch` standalone 패키지는 deprecated(0.98). 플러그인이 클라이언트를 `web/src/client/client/`에 번들 생성하므로 외부 런타임 패키지 불필요(설치는 했으나 생성물이 자체 포함). runtimeConfigPath는 `.ts` 확장자 빼야 tsc 통과(`allowImportingTsExtensions` 회피).
- **[정보] 생성 함수명 장황** — FastAPI 기본 operationId 기반(`listMembersApiV1MembersGetOptions` 등). 깔끔한 이름은 백엔드 operation_id 커스터마이즈 필요 — 범위 밖, 생성명 그대로 사용.
- **[정보] '이번 달 신규' 카드** — mock의 하드코딩 "3"을 실 `/stats.new_this_month`로. 부제 문구도 "지난달 대비" → "최근 등록 기준"으로(데이터 없는 비교 제거).
- **[low] 검색 디바운스 없음** — 검색 입력마다 목록 쿼리 refetch(키스트로크당 요청). ~25명 규모라 수용. 디바운스는 후속 개선 후보.
- **[정보] openapi.json export 로그 오염 주의** — structlog가 stdout으로 로그를 찍어, 초기 `> openapi.json` 리다이렉트가 로그를 파일에 섞었다. 파이썬에서 파일에 직접 쓰는 방식으로 교정(Taskfile `gen-api:export`도 동일 방식).
- **[High · 해소] Python 3.14 환경 빚이 `task dev`에서 폭발 → 근원 수정(non-goal 끌어옴)** — UAT 중 사용자가 `task dev`를 돌리자 uvicorn `--reload` spawn 워커가 3.12/3.14 stdlib을 섞어 `_typing`의 `Union` import 실패로 크래시. 원인: `requires-python=">=3.12"` 상한 부재 → `uv run`이 기본 3.14 선택(`.python-version`은 `api/.gitignore:60`이 무시해 공유 안 됨 — 빚이 반복된 이유). plan은 "환경 빚 근본 정리"를 non-goal로 뒀으나 **런타임 자체를 막아** 최소 범위로 끌어옴: 추적되는 `pyproject.toml`의 `requires-python`을 `">=3.12,<3.13"`으로 좁힘(`7e08ab9`). 검증: `uv run`이 `--python` 없이 3.12.12 선택, uvicorn `--reload` health 200·Union 크래시 0. **teams-sso·member-management retro가 두 번 미뤄온 빚의 근원 해결.**
  - **[후속 정정 — 사용자 지시로 3.14 표준화]** 사용자가 "3.14를 쓰자"고 해서 실측한 결과 **"3.14 비호환"은 stale**이었음(의존성 갱신으로 chat/langchain이 3.14에서 동작): 3.14에서 app import OK·655 collect·642 passed(실패 12건은 무관한 stale Makefile 테스트)·uvicorn `--reload` 크래시 0, **코드 수정 불필요**. 그래서 `<3.13` 캡(`7e08ab9`)을 **되돌리고 `requires-python=">=3.14"`로 통일**(`761f9a2`): mypy/classifier/Dockerfile/Taskfile `gen-api`(`--python 3.12` 제거)/CLAUDE.md(root+api)/README 정합, uv.lock 재생성. 원래 크래시의 본질은 "3.14가 나쁘다"가 아니라 venv(3.12)/resolve(3.14) **불일치**였고, 3.14로 일관 통일해도 동일하게 해소된다.

## On-the-spot 결정

- 401 인터셉터는 `setupApiClient()`로 main.tsx 부팅 시 1회 등록(`registered` 가드). 토큰은 요청마다 `useAuthStore.getState()`로 fresh read.
- query invalidation은 단순화를 위해 mutation 성공 시 `queryClient.invalidateQueries()`(전체) — 이 화면 규모에선 충분.
- Add 폼: `stats.departments`가 비면 부서 select 대신 자유 텍스트 input으로 폴백.
- 상세/편집은 `getMember` 쿼리로 id 조회(목록 행 재사용 대신) — 편집 후 신선도 보장.

## 자체 적대 검토 (직접 실행이라 self-review, critical/high 0)

- 401 인터셉터 `/login` 경로가 `_app.tsx` 가드와 일치 + `pathname!=='/login'` 루프 가드. 생성 클라이언트는 members만 사용해 auth 경로와 간섭 없음.
- export query 파라미터가 백엔드 export 시그니처와 정확히 일치, `parseAs: 'blob'`로 다운로드.
- 삭제/생성 후 `setPage(1)` + invalidate로 페이지 범위 정합.
- 스키마 변경(stats.departments)은 additive, 유일 소비자가 이 프론트, 스냅샷·타입 재생성 반영됨.

## 막힌 곳 / 미완

- **런타임 UAT(프론트 클릭) 일부 미수행** — `task dev` 크래시는 위 환경 수정으로 해소(uvicorn 라이브 기동·members 401 게이트·`/openapi.json` departments 라이브 확인). 다만 인증된 SPA 세션(Teams 로그인 + members:write admin)으로의 브라우저 클릭 검증은 사람 확인 대상. `verified: yes`는 정적 게이트 + 라이브 백엔드 + 기동 가능한 dev 런타임 기준으로 사용자가 수용.
- **사전 게이트 빚(보고만)**: web 전체 `pnpm lint`는 사전 존재 57건(sidebar/teams/teams-login 등 미변경 파일의 biome 위반). 내 변경분은 clean. 백엔드 test_member_service.py에 사전 unused-ignore 3건.

## fg-learn 입력 후보

- hey-api 0.98 도입 패턴(번들 클라이언트, runtimeConfigPath 확장자 함정, gen-api Taskfile) — ADR-0004에 이미 결정 반영. 회고에선 "생성 클라이언트 도입 시 정적 게이트 통과 후 런타임 UAT를 별도로 강제" 정도.
- 두 HTTP 레이어 공존 → auth를 생성 클라이언트로 이전하는 후속.
- 검색 디바운스, 생성 함수명 정리(operation_id), web의 사전 biome 빚 정리.
