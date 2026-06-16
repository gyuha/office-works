<!-- forge-slug: detail-deeplink-routing-3of4 -->
<!-- task: 14 -->
<!-- tdd: off -->
<!-- part: 3/4 -->
# 상세 딥링크 라우팅 (3/4) — 결재 상신함(approval) 문서 상세

## Goal / Non-goals
- Goal: 결재 상신함의 목록→문서상세 드릴다운을 경로 라우트로 매핑한다. `/app/appr-sent/[docId]`로 결재 문서 상세 직접 진입(딥링크/새로고침). Part 1 패턴 재사용.
- Non-goals: 작성(write) 모드의 URL 라우팅(내부 state 유지), 다른 결재 화면(appr-home/write/draft/inbox 류)의 드릴다운(이번 범위는 상신함 문서상세만), 목록 URL 리네이밍(`appr-sent` 유지), 백엔드 변경, FE 단위 테스트.

## Source of truth
- Related ADRs: `.forge/adr/0009-screen-detail-deeplink-routing.md`
- 선행: `detail-deeplink-routing-1of4`(공통 헬퍼/패턴 — soft order)
- 기존 구조: `web/src/features/office/screens/approval.tsx`(`SentScreen` = `SentView: 'list'|'detail'|'write'` + `selectedId` + `docs` state, `DocDetail` 컴포넌트). 결재 문서 데이터는 현재 클라이언트 mock(`APPROVAL_DATA`) — 백엔드 get-by-id 없음.
- Definition of Done: 상신함(`/app/appr-sent`) 목록에서 문서 클릭 시 `/app/appr-sent/[docId]`로 이동, 새로고침/직접 진입 시 해당 문서상세가 열림(mock 데이터에서 docId로 조회), 미존재 docId는 목록 리다이렉트, 상세 경로에서 사이드바가 "상신함" 활성표시, 작성(write)은 기존대로, `pnpm typecheck && pnpm build` 통과 + 신규 코드 biome 신규 에러 0.

## Work slices
- [ ] S1. nav.ts 매핑 확장 — Part 1의 `pathToScreen` 매핑에 `/app/appr-sent/[docId]` → `appr-sent` 추가. — 완료기준: 상세 경로에서 `pathToScreen`이 `appr-sent` 반환, 타입체크 통과.
- [ ] S2. 결재 문서 상세 라우트 — `web/src/routes/_app/app.appr-sent.$docId.tsx` 신설. route param `docId`로 `APPROVAL_DATA`(mock)에서 문서 조회해 기존 `DocDetail` 렌더, `onBack`은 `/app/appr-sent`로 navigate. 미존재 docId는 목록 리다이렉트. (mock 데이터 출처를 라우트에서 접근 가능하게 export 정리 필요 시 포함) — 완료기준: `/app/appr-sent/[docId]`가 문서상세 렌더, 미존재 리다이렉트(수동). (depends: S1)
- [ ] S3. approval.tsx 재배선 — `SentScreen`의 `SentView` 전환에서 문서 진입(`setView('detail')`+`selectedId`)을 `navigate({to:'/app/appr-sent/$docId', params:{docId:id}})`로 전환. `DocDetail`을 라우트(S2)로 이전, `appr-sent` 스크린은 목록+작성 진입만 담당. 작성(write)은 기존 state 유지. — 완료기준: 목록 클릭→상세 URL 이동, 작성 기존대로(수동). (depends: S2)
- [ ] S4. 검증·정리 — `pnpm typecheck && pnpm build` 통과, 라우트 트리 반영, 신규 코드 biome 신규 에러 0, 미사용 import/state 제거. 수동 UAT: 상신함→문서상세 진입·딥링크·새로고침, 미존재 리다이렉트, 사이드바 활성표시, 작성 동작. — 완료기준: typecheck·build 통과 + 수동 체크리스트. (depends: S3)
