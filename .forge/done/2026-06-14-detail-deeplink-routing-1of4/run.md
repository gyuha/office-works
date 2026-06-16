<!-- forge-slug: detail-deeplink-routing-1of4 -->
# run.md — 상세 딥링크 라우팅 (1/4) 인프라 + 프로젝트

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행(단일 기능영역·기존 대형 컴포넌트 리와이어라 main 에이전트 직접 수행이 고충실도, 팬아웃 불채택)

## 계획대로 된 것
- **S1 사이드바 매핑** — `nav.ts`에 `DETAIL_BASE_TO_SCREEN = { proj: 'proj-list' }` + `pathToScreen` 확장(상세 base→목록 screenId; team-list/appr-sent는 base가 곧 screenId라 기존 경로로 처리).
- **S2 상세 레이아웃 라우트** — `src/routes/_app/app.proj.$projectId.tsx` 신설. `getProject` 쿼리로 id-fetch → `structuredClone(toUiProject(...))`로 편집용 draft, `updateProject` PUT + invalidate로 `persist`. 상세 셸(목록으로/브레드크럼/편집 버튼) + 탭바(`<Link>` activeProps) + `<Outlet/>`. 편집 모드는 라우트 내부 state로 `<EditView>` 렌더. q.isError → "찾을 수 없습니다 + 목록으로". draft/persist는 `ProjectDetailContext.Provider`로 자식에 전달.
- **S3 인덱스+탭 라우트** — `app.proj.$projectId.index.tsx`(→ `info` 탭 redirect), `app.proj.$projectId.$tab.tsx`(`useProjectDetail`로 draft/bump 취득, `tab` param→6개 탭 컴포넌트 매핑, 미지원 tab→info redirect, `beforeLoad`에서 VALID_TABS 검증).
- **S4 projects.tsx 리와이어** — `DetailView`(탭 내부 state) 제거 → `ProjectDetailContext`/`useProjectDetail`로 치환. 6개 탭 컴포넌트 + `EditView`/`StatusBadge`/`ChevL`/`DETAIL_TABS`/`TabId`/`Project`/`toUiProject` export. `ProjectsScreen`을 목록 전용으로 축소(목록 쿼리 + createMut + 다이얼로그), `onOpen`/생성 성공 → `navigate({to:'/app/proj/$projectId'})`. 사용 안 하게 된 `updateProject…PutMutation` import 제거(라우트로 이전).
- **S5 검증** — `pnpm typecheck` 통과, `pnpm build`(tsc -b + vite, routeTree.gen 재생성) 성공, 라우트 3파일·nav.ts biome 신규 에러 0, projects.tsx biome 에러 20(기존 그대로·orphan 없음).

## 분기(Divergence)
- 없음 — 계획 5슬라이스대로. `DetailView` 제거는 라우팅 전환으로 orphan이 된 것을 정리(계획의 "DetailView/탭바를 레이아웃·자식 라우트로 이전"에 부합).

## 현장 결정(설계 판단)
- **draft 재초기화 = useEffect([q.data]).** 레이아웃이 마운트 유지되며 탭 전환 간 draft 보존(ADR-0009). persist→invalidate→refetch 시 q.data 변경으로 draft 재clone되어 서버와 정합.
- **탭바 = `<Link activeProps/inactiveProps>`.** 내부 state 대신 라우트 활성상태로 탭 하이라이트 → URL이 단일 진실원.
- **목록 네비 = `/app/$screenId` 템플릿**(사이드바와 동일), 상세 = `/app/proj/$projectId` 신규 템플릿. 잘못된 id는 getProject 에러 → 목록 안내.
- **편집/생성은 라우팅 안 함**(ADR-0009) — 편집은 레이아웃 라우트 내부 state, 생성은 목록 화면 다이얼로그.

## 코드 리뷰 메모
- 변경: nav.ts(매핑), projects.tsx(export + DetailView→context + ProjectsScreen 축소), 신규 라우트 3파일. 라우팅/네비게이션 구조 변경이라 회귀 리스크는 "기존 탭/편집/생성 동작 보존"에 집중 — UAT 항목으로 위임. auth/데이터 변형/마이그레이션 무관.

## 미해결/UAT로 확인할 것
- 목록(`/app/proj-list`)에서 프로젝트 클릭 → `/app/proj/[id]/info` 이동.
- 6개 탭 클릭 시 URL `/app/proj/[id]/[tab]` 변경 + 해당 탭 렌더, **새로고침/직접 진입**에도 그 탭 열림.
- 탭 전환 간 draft(예: 간트 미저장 편집·멤버 변경) 보존.
- 잘못된 id 진입 → "찾을 수 없습니다 + 목록으로".
- 상세 경로에서 사이드바가 "프로젝트 관리" 활성표시 + 상단 타이틀.
- 편집 버튼 → EditView, 저장 시 반영. 목록 "프로젝트 추가" → 생성 후 상세로 이동.
- 뒤로가기(브라우저) 동작.
