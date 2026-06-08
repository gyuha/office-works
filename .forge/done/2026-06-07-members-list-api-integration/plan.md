<!-- forge-slug: members-list-api-integration --> <!-- task: 4 --> <!-- tdd: off --> <!-- priority: high -->

# 구성원 목록 화면 ↔ API 연결 (hey-api 생성 클라이언트)

`/app/members-list`(현재 mock `MEMBERS_DATA`)를 task 3에서 만든 `/api/v1/members` 실 API에 연결한다. 클라이언트는 hey-api(`@hey-api/openapi-ts`)로 OpenAPI에서 생성하고, 루트 Taskfile에 재생성 타깃을 추가한다.

## 배경 / 한 줄 요약

- 백엔드 `/api/v1/members`(목록·상세·생성·수정·soft delete·통계·/me·CSV)는 task 3(`member-management-api`, 봉인됨)에서 완성. `feat/member-management-api` 브랜치에 있음(미머지 — 이 작업 시작 전 머지 상태 확인 필요).
- 프론트 `web/src/features/office/screens/members.tsx`는 자족적 mock 화면(목록/상세/편집 + 클라이언트사이드 필터/정렬/페이지). `membersScreens: ScreenModule`로 `members-list` 키 등록(`registry.ts`), 라우트 `/app/members-list`.
- 토큰: `useAuthStore`(persist 'om-auth')에 `accessToken` 보유. 기존 수동 래퍼 `web/src/lib/api.ts`(`apiFetch`)는 auth feature가 사용 중(일부 mock).

## Source of truth

- `.forge/adr/0004-frontend-openapi-generated-client-heyapi.md` — codegen 접근(스냅샷 스펙·커밋 생성물·TanStack Query 플러그인·Taskfile 타깃·인증 인터셉터). **이 작업의 권위 결정.**
- `.forge/CONTEXT.md` — 구성원(Member)/구성원 연결/등급. (새 도메인 용어 없음 — codegen은 구현 영역)
- 기존 코드 계약: `web/src/lib/api.ts`(VITE_API_BASE_URL), `web/src/features/auth/store/auth.store.ts`(accessToken), `web/src/providers/app-providers.tsx`(QueryClient), `web/src/features/office/screens/members.tsx`(연결 대상), `api/src/domains/members/`(엔드포인트·스키마), 루트 `Taskfile.yml`(web:* 래퍼).
- hey-api 설정 문법은 버전별로 변하므로 **S2 실행 시 Context7로 현행 `@hey-api/openapi-ts` 문서를 확인**해 `openapi-ts.config.ts`를 작성한다(결정은 ADR-0004 고정, 문법만 확인).

## 확정된 결정 (그릴링)

1. **데이터 전략**: 서버사이드. 목록은 `q/department/grade/sort/order/page/page_size`를 TanStack Query key로, 페이지네이션은 서버 `total/total_pages`. 카드 통계는 `/stats`. (Q: 서버사이드)
2. **스펙 소스**: 커밋된 스냅샷 `api/openapi.json`(FastAPI `app.openapi()` 오프라인 export). (Q1)
3. **생성물**: `web/src/client/` + git 커밋, Biome ignore, 손편집 금지. (Q2)
4. **TanStack Query 플러그인** 사용(queryOptions/mutationOptions). (Q3)
5. **인증**: 생성 클라이언트 단일 인스턴스, baseURL=`VITE_API_BASE_URL`, request 인터셉터가 `useAuthStore.accessToken`을 Bearer 부착. **401 시 auth store clear + Teams 로그인 리다이렉트**(자동 갱신은 범위 밖). (Q4)
6. **부서 드롭다운**: `/members/stats` 응답에 `departments: string[]`(활성 distinct) 추가해서 사용. (Q5)
7. **동작 범위**: 읽기(목록·상세·카드) + 편집(PATCH) + **추가(POST 폼)** + **CSV 내보내기** + **삭제(soft delete)**. (Q6)
8. **Taskfile**: 루트 `Taskfile.yml`에 재생성 타깃 추가(export openapi.json → openapi-ts). 루트 Taskfile은 현재 untracked → 이 작업에서 커밋 대상에 포함.

## 슬라이스 (작업 단위)

### S1 — backend: /members/stats에 departments 추가
- `MemberStatsResponse`에 `departments: list[str]`(활성 distinct 부서명, 정렬) 추가, repository stats()/service 반영, 테스트 보강.
- **완료 기준**: `pytest tests/members/`(unit+integration) 통과, `/stats` 응답에 departments 배열 포함(테스트 assert).
- depends: (백엔드 members 코드가 워킹트리에 존재해야 함 — `feat/member-management-api` 머지/체크아웃 상태 선확인)

### S2 — hey-api 도입 + codegen 파이프라인 + Taskfile + 클라이언트 설정
- `@hey-api/openapi-ts`(+ client-fetch, tanstack-query 플러그인) devDependency 추가. `web/openapi-ts.config.ts` 작성(input=`api/openapi.json`, output=`web/src/client/`, plugins=[client-fetch, tanstack-query]). **Context7로 현행 문법 확인.**
- 루트 `Taskfile.yml`에 `gen-api` 타깃: (1) `cd api && uv run --python 3.12 python -c "...app.openapi()..." > openapi.json` (2) `cd web && pnpm openapi-ts`. 루트 Taskfile 커밋.
- 생성 클라이언트 설정 모듈(`web/src/lib/api-client.ts` 등): baseURL + Bearer 인터셉터(auth store) + 401 → clearUser + Teams 로그인 라우트 이동. Biome ignore `web/src/client/`. 생성물 커밋.
- **완료 기준**: `task gen-api`로 `api/openapi.json` + `web/src/client/` 생성, `pnpm typecheck` 통과, `pnpm build` 성공.

### S3 — members 화면 읽기 연동 (서버사이드)
- `members.tsx`를 생성된 query options로 재배선: 목록(q/department/grade/sort/order/page/page_size → 서버), 페이지네이션(서버 total/total_pages), 상세(GET /{id}), 요약카드(GET /stats: total·department_count·new_this_month·grade_distribution·departments). mock `MEMBERS_DATA` 제거. 필드 매핑(`employee_no→사번`, `department→소속`, `id`는 mutation 식별자). 로딩/에러/빈 상태.
- **완료 기준**: 실 백엔드 기동 상태에서 목록·필터·정렬·페이지·카드가 서버 데이터로 동작(typecheck/build 통과 + 수동 확인).

### S4 — mutations 연동
- 편집(PATCH /{id}), 구성원 추가(POST — '구성원 추가' 버튼을 실 폼으로, 사번 제외 입력), 삭제(상세/편집에 soft delete 액션 → DELETE /{id}), CSV 내보내기('내보내기' → GET /export 다운로드, 현재 필터 반영). 성공 시 관련 query invalidate + toast.
- **완료 기준**: 추가→목록 반영, 편집→상세 반영, 삭제→목록 제외, CSV 다운로드 동작(수동 확인 + typecheck/build).

## Non-goals

- auth feature를 mock→실 API/생성 클라이언트로 이전(기존 `apiFetch`·`mock-auth-api` 유지).
- 401 silent refresh(자동 토큰 갱신) — 만료 시 재로그인. auth 하드닝 후속.
- `/members/me` 사용(이 관리 화면 비대상).
- departments를 별도 엔티티로 정규화.
- Python 3.12 환경 빚 근본 정리(별도 작업) — codegen export는 `--python 3.12` 강제로 우회.
- 프론트 테스트 러너(vitest) 도입(TDD off).

## 리스크 / 주의

- **백엔드 코드 위치**: members API는 `feat/member-management-api` 브랜치에만 있고 main 미머지일 수 있음. S1 시작 전 머지/베이스 상태 확인(없으면 이 작업 베이스가 그 브랜치여야 함).
- **두 HTTP 레이어 공존**(생성 클라이언트 + 수동 apiFetch) — 혼선 방지 위해 members는 생성 클라이언트만.
- **스냅샷 stale 위험** — 백엔드 스펙 변경 시 `task gen-api` 재실행+커밋 잊으면 드리프트. diff로 드러남.
- **Python 3.14 환경 빚**(반복) — openapi export 명령에 `--python 3.12` 강제.
- hey-api 버전별 config 문법 차이 — Context7로 현행 확인 후 작성.
