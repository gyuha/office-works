<!-- forge-slug: detail-deeplink-routing-2of4 -->
<!-- task: 13 -->
<!-- tdd: off -->
<!-- part: 2/4 -->
# 상세 딥링크 라우팅 (2/4) — 구성원(members) 화면

## Goal / Non-goals
- Goal: 구성원 화면의 목록→상세 드릴다운을 경로 라우트로 매핑한다. `/app/members/[id]`로 구성원 상세 직접 진입(딥링크/새로고침). Part 1이 확립한 패턴(상세 base 라우트, id-fetch, 사이드바 활성표시 매핑)을 재사용.
- Non-goals: 편집/추가(add) 모드의 URL 라우팅(내부 state 유지), 목록 URL 리네이밍(`members-list` 유지), 구성원 상세 내 탭 신설(현재 단일 상세), 백엔드 변경, FE 단위 테스트.

## Source of truth
- Related ADRs: `.forge/adr/0008-screen-detail-deeplink-routing.md`
- 선행: `detail-deeplink-routing-1of4`(공통 헬퍼/패턴 — soft order, 먼저 완료 권장)
- 기존 구조: `web/src/features/office/screens/members.tsx`(`view: 'list'|'detail'|'edit'|'add'` + `activeId` state머신, 상세는 이미 `getUserApiV1UsersUserIdGetOptions({path:{user_id}})`로 id-fetch 중).
- Definition of Done: 목록(`/app/members-list`)에서 구성원 클릭 시 `/app/members/[id]`로 이동, 새로고침/직접 진입 시 해당 구성원 상세가 id-fetch로 열림, 잘못된 id는 not-found/목록 리다이렉트, 상세 경로에서 사이드바가 "구성원 관리" 활성표시, 편집/추가는 기존대로 동작, `pnpm typecheck && pnpm build` 통과 + 신규 코드 biome 신규 에러 0.

## Work slices
- [ ] S1. nav.ts 매핑 확장 — Part 1의 `pathToScreen` 매핑에 `/app/members/[id]` → `members-list` 추가. — 완료기준: 상세 경로에서 `pathToScreen`이 `members-list` 반환, 타입체크 통과.
- [ ] S2. 구성원 상세 라우트 — `web/src/routes/_app/app.members.$memberId.tsx` 신설. route param으로 기존 상세 컴포넌트(`getUser` 쿼리 사용)를 렌더, `onBack`은 `/app/members-list`로 navigate, `onEdit`/삭제는 기존 콜백 보존(편집은 state). id 미존재/에러 시 리다이렉트. — 완료기준: `/app/members/[id]`가 구성원 상세를 id-fetch로 렌더(수동). (depends: S1)
- [ ] S3. members.tsx 재배선 — `members.tsx`의 `view` state머신에서 목록 진입(`setView('detail')`+`activeId`)을 `navigate({to:'/app/members/$memberId', params:{memberId:id}})`로 전환. 상세 컴포넌트를 라우트(S2)로 이전하고 `members-list` 스크린은 목록+추가만 담당. 편집/추가(add)는 기존 state/모달 유지. — 완료기준: 목록 클릭→상세 URL 이동, 편집/추가 기존대로(수동). (depends: S2)
- [ ] S4. 검증·정리 — `pnpm typecheck && pnpm build` 통과, 라우트 트리 반영, 신규 코드 biome 신규 에러 0, 미사용 import/state 제거. 수동 UAT: 목록→상세 진입·딥링크·새로고침, 잘못된 id 리다이렉트, 사이드바 활성표시, 편집/추가 동작. — 완료기준: typecheck·build 통과 + 수동 체크리스트. (depends: S3)
