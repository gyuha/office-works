<!-- forge-slug: detail-deeplink-routing-4of4 -->
# run.md — 상세 딥링크 라우팅 (4/4) 팀 트리 노드

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행(Part 1 패턴 응용, 트리 형태 예외)

## 계획대로 된 것
- **S1 nav.ts 매핑** — 변경 불필요. `team-list`가 이미 screenId라 `/app/team-list/[nodeId]`는 기존 `pathToScreen`이 사이드바 "팀 관리" 활성표시 처리(appr-sent와 동일 케이스).
- **S2 팀 노드 라우트 + 선택 동기화** — `src/routes/_app/app.team-list.$nodeId.tsx` 신설 → `<TeamListScreen nodeId={nodeId} />`. `TeamListScreen`에 optional `nodeId` prop 추가, `selectedId` 초기값을 `nodeId ?? 't01'`로, `useEffect([nodeId])`로 URL 변경(딥링크·뒤로가기) → selectedId 단방향 동기화.
- **S3 teams.tsx 리와이어** — `selectNode(id)` 헬퍼(setSelectedId + `navigate({to:'/app/team-list/$nodeId'})`) 추가, 트리 노드 클릭(`onClick`)을 `setSelectedId` → `selectNode`로 교체. 트리 편집/구성원·조직도 모달은 기존 state 유지. `TeamListScreen` export.
- **S4 검증** — `pnpm typecheck` 통과, `pnpm build`(routeTree 재생성) 성공, 신규 라우트 biome 클린, teams.tsx 신규 lint 0(추가한 useEffect의 의도적 partial-dep은 biome-ignore로 정당화; 기존 에러 15건은 무관).

## 분기(Divergence)
- 없음 — 계획대로(트리 형태 예외 포함). ADR-0009에 팀은 "목록→상세가 아닌 트리 노드 선택, 형태 예외"로 명시됨.

## 현장 결정(설계 판단)
- **단방향 동기화로 루프 방지.** 노드 클릭 → setSelectedId + navigate(nodeId) → URL 변경 → useEffect는 `nodeId===selectedId`라 no-op. 딥링크/뒤로가기 시에만 useEffect가 selectedId 갱신. 무한 루프 없음.
- **selectedId 초기값 = nodeId ?? 't01'.** 라우트 진입 시 즉시 올바른 노드 선택(useEffect 보정 전에도). base `/app/team-list`(registry)는 nodeId 없어 't01' 기본.
- **트리 편집/추가/삭제의 setSelectedId는 URL 미반영(범위 외).** 사용자 노드 선택만 URL 동기화 — add/delete 후 자동선택은 내부 state로 둠(소폭, 폴리시 아님).

## 코드 리뷰 메모
- 변경: teams.tsx(import + nodeId prop + useEffect + selectNode + 클릭 1곳 교체 + export), 신규 라우트 1파일. 트리 state머신 자체는 미변경(선택 경로만 URL 연동). 위험 낮음.

## 미해결/UAT로 확인할 것
- 팀 관리(`/app/team-list`)에서 트리 노드 클릭 → URL `/app/team-list/[nodeId]` 변경 + 해당 노드 선택 표시.
- 새로고침/직접 진입(`/app/team-list/t05`) → 해당 노드 선택 상태로 열림.
- 브라우저 뒤로가기 → 이전 노드 선택 복원.
- 미존재 nodeId 진입 시 동작(getNode null → 우측 패널 빈 상태, 크래시 없음).
- 사이드바 "팀 관리" 활성표시.
- 트리 편집(이름변경/추가/삭제)·구성원 모달·조직도 모달 기존대로.
