<!-- forge-slug: detail-deeplink-routing-4of4 -->
<!-- task: 15 -->
<!-- tdd: off -->
<!-- part: 4/4 -->
# 상세 딥링크 라우팅 (4/4) — 팀(teams) 트리 노드 선택

## Goal / Non-goals
- Goal: 팀 관리의 트리 노드 선택을 URL에 반영한다. `/app/team-list/[nodeId]`로 특정 팀 노드를 선택한 상태로 직접 진입(딥링크/새로고침). 형태가 목록→상세가 아닌 **트리 마스터-디테일**이라 노드 선택 id를 URL에 매핑(ADR-0008의 형태 예외).
- Non-goals: 트리 편집(이름변경/추가/삭제)·조직도 모달의 URL 라우팅(내부 state 유지), 목록 URL 리네이밍(`team-list` 유지), 백엔드 변경, FE 단위 테스트.

## Source of truth
- Related ADRs: `.forge/adr/0008-screen-detail-deeplink-routing.md` (팀은 형태 예외로 명시됨)
- 선행: `detail-deeplink-routing-1of4`(공통 헬퍼/패턴 — soft order)
- 기존 구조: `web/src/features/office/screens/teams.tsx`(`selectedId` = 선택 트리 노드, 기본 't01'; `nodes`/`teamMembers`/`expandedIds` 등 트리 state, 선택 노드의 구성원을 우측 패널에 표시). 노드 데이터는 클라이언트 state(`INITIAL_NODES`).
- Definition of Done: 팀 관리(`/app/team-list`)에서 트리 노드 클릭 시 `/app/team-list/[nodeId]`로 URL 변경, 새로고침/직접 진입 시 해당 노드가 선택된 상태로 열림, 미존재 nodeId는 기본 노드/목록으로 폴백, 상세 경로에서 사이드바가 "팀 관리" 활성표시, 트리 편집/조직도 모달은 기존대로, `pnpm typecheck && pnpm build` 통과 + 신규 코드 biome 신규 에러 0.

## Work slices
- [ ] S1. nav.ts 매핑 확장 — Part 1의 `pathToScreen` 매핑에 `/app/team-list/[nodeId]` → `team-list` 추가. — 완료기준: 노드 경로에서 `pathToScreen`이 `team-list` 반환, 타입체크 통과.
- [ ] S2. 팀 노드 라우트 + 선택 동기화 — `web/src/routes/_app/app.team-list.$nodeId.tsx` 신설(또는 `team-list` 스크린이 optional `$nodeId`를 읽도록). route param `nodeId`로 `selectedId` 초기화/동기화, 미존재 nodeId는 기본 노드 폴백. 트리 노드 클릭 시 `navigate({to:'/app/team-list/$nodeId', params:{nodeId}})`로 URL 갱신(트리 state는 유지). — 완료기준: `/app/team-list/[nodeId]`가 해당 노드 선택 상태로 열리고 새로고침에 유지, 노드 클릭이 URL 갱신(수동). (depends: S1)
- [ ] S3. teams.tsx 재배선 — `selectedId` 변경 경로를 라우트 param과 동기화(노드 클릭 핸들러 → navigate, route param → selectedId 반영). 트리 편집/구성원 모달/조직도 모달은 기존 state 유지. `team-list` 진입 시(노드 미지정) 기본 노드로 표시. — 완료기준: 노드 선택↔URL 양방향 동기화, 편집/모달 기존대로(수동). (depends: S2)
- [ ] S4. 검증·정리 — `pnpm typecheck && pnpm build` 통과, 라우트 트리 반영, 신규 코드 biome 신규 에러 0, 미사용 import/state 제거. 수동 UAT: 노드 클릭→URL 갱신, 딥링크·새로고침 시 노드 선택 복원, 미존재 nodeId 폴백, 사이드바 활성표시, 트리 편집/모달 동작. — 완료기준: typecheck·build 통과 + 수동 체크리스트. (depends: S3)
