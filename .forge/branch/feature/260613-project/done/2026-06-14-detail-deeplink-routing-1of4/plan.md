<!-- forge-slug: detail-deeplink-routing-1of4 -->
<!-- task: 12 -->
<!-- tdd: off -->
<!-- part: 1/4 -->
# 상세 딥링크 라우팅 (1/4) — 라우팅 인프라 + 프로젝트 화면

## Goal / Non-goals
- Goal: 프로젝트 화면의 목록→상세→탭 드릴다운을 TanStack 경로 라우트로 매핑한다. `/app/proj/[id]`로 프로젝트 상세 진입, `/app/proj/[id]/[tab]`로 6개 탭(info/gantt/members/contracts/issues/cost) 각각 딥링크. 이 part가 **공통 패턴/헬퍼를 확립**한다(상세 레이아웃 라우트 + Outlet 탭, id-fetch, 사이드바 활성표시 매핑) — 2~4 part가 재사용.
- Non-goals: 구성원/결재/팀 화면(각 후속 part), 편집(EditView)·생성(다이얼로그)의 URL 라우팅(내부 state 유지), 목록 URL 리네이밍(`proj-list` 유지), 백엔드 API 변경, 탭 쿼리파라미터 방식, e2e 자동화, FE 단위 테스트(러너 없음).

## Source of truth
- Related ADRs: `.forge/adr/0008-screen-detail-deeplink-routing.md` (라우팅 컨벤션 — 이 작업의 근거)
- 기존 구조: `web/src/routes/_app/app.$screenId.tsx`(단일 세그먼트 디스패처), `web/src/features/office/nav.ts`(`pathToScreen`/`screenToPath`/`SCREEN_LABELS`), `web/src/features/office/screens/projects.tsx`(`ProjectsScreen` = selectedId+draft+editing state머신, `DetailView` 내부 `tab` state, `EditView`, `CreateProjectDialog`), `web/src/features/office/components/app-shell.tsx`(`pathToScreen`로 사이드바 활성/타이틀).
- 기존 엔드포인트: `getProjectApiV1ProjectsProjectIdGetOptions`(GET /projects/{id} — 이미 존재), `updateProject…PutMutation`, `saveSchedule…`.
- Definition of Done: 목록(`/app/proj-list`)에서 프로젝트 클릭 시 `/app/proj/[id]/info`(기본 탭)로 이동, 탭 클릭 시 URL이 `/app/proj/[id]/[tab]`로 바뀌고 새로고침/직접 진입에도 해당 탭이 열림, 미저장 draft가 탭 전환 간 유지됨, 잘못된 id는 not-found/목록 리다이렉트, 상세 경로에서 사이드바가 "프로젝트 관리"를 활성표시, 편집/생성은 기존대로 동작, `pnpm typecheck && pnpm build` 통과 + 간트/라우팅 신규 코드 biome 신규 에러 0.

## Work slices
- [ ] S1. nav.ts 사이드바 매핑 헬퍼 — `pathToScreen`이 `/app/proj/[id]`·`/app/proj/[id]/[tab]`를 목록 screenId `proj-list`로 매핑하도록 확장(상세 base→목록 id 매핑 테이블 또는 정규식). `app-shell.tsx`의 타이틀/활성표시가 상세 경로에서도 "프로젝트 관리"로 뜸. — 완료기준: 상세 경로에서 `pathToScreen` 반환이 `proj-list`, 타입체크 통과.
- [ ] S2. 상세 레이아웃 라우트 — `web/src/routes/_app/app.proj.$projectId.tsx` 신설. route param `projectId`로 `getProject` 쿼리, 로드된 프로젝트를 `structuredClone`해 편집용 draft state 보관, `persist`(전체 PUT+invalidate) 정의. 상단 탭바 렌더 + `<Outlet/>`. draft/persist를 자식 탭에 Outlet context로 전달. id 미존재/에러 시 not-found 또는 `/app/proj-list` 리다이렉트. — 완료기준: `/app/proj/[id]`가 프로젝트를 fetch해 탭바+빈 Outlet 렌더, 잘못된 id는 리다이렉트(수동).
- [ ] S3. 기본 탭 인덱스 + 탭 라우트 — `app.proj.$projectId.index.tsx`(→ 기본 탭 `info`로 리다이렉트) + `app.proj.$projectId.$tab.tsx`(Outlet context의 draft/persist로 기존 탭 컴포넌트 `InfoTab`/`GanttTab`/`MembersTab`/`ContractsTab`/`IssuesTab`/`CostTab`를 `tab` 값에 매핑 렌더, 미지원 tab은 기본 탭 리다이렉트). 기존 탭 컴포넌트는 그대로 재사용. — 완료기준: `/app/proj/[id]/gantt` 등 6탭이 URL로 직접 열리고 새로고침에도 유지(수동). (depends: S2)
- [ ] S4. ProjectsScreen 재배선 — `projects.tsx`의 `DetailView` 내부 `tab` state를 라우트 기반으로 전환: 목록 `onOpen(id)`는 `navigate({to:'/app/proj/$projectId/$tab', params:{projectId:id, tab:'info'}})`, 탭 클릭은 `navigate`로 URL 변경. `DetailView`/탭바를 레이아웃 라우트(S2)와 자식(S3)으로 이전하고, `ProjectsScreen`(proj-list)은 목록+생성 다이얼로그만 담당. 편집(EditView)·생성은 기존 state/모달 유지. — 완료기준: 목록 클릭→상세 URL 이동, 탭 클릭→URL 변경, 편집/생성 기존대로(수동). (depends: S3)
- [ ] S5. 검증·정리 — `pnpm typecheck && pnpm build` 통과, 라우트 트리 생성(TanStack 라우트 자동생성/`routeTree.gen`) 반영 확인, 신규 코드 biome 신규 에러 0, 미사용 import/state 제거. 수동 UAT: 목록→상세 진입, 6탭 URL 딥링크·새로고침, draft 탭전환 보존, 잘못된 id 리다이렉트, 사이드바 활성표시, 편집/생성 동작. — 완료기준: typecheck·build 통과 + 수동 체크리스트. (depends: S4)
