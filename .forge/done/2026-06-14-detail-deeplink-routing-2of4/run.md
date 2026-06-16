<!-- forge-slug: detail-deeplink-routing-2of4 -->
# run.md — 상세 딥링크 라우팅 (2/4) 구성원

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행(Part 1 패턴 재사용, 팬아웃 불요)

## 계획대로 된 것
- **S1 nav.ts 매핑** — `DETAIL_BASE_TO_SCREEN`에 `members: 'members-list'` 추가 → 상세 경로에서 사이드바 "구성원 관리" 활성표시.
- **S2 구성원 상세 라우트** — `src/routes/_app/app.members.$memberId.tsx` 신설. route param `memberId`로 기존 `MemberDetail`(getUser 쿼리) 렌더. Part 1 프로젝트 패턴과 동일하게 **편집(MemberEdit)을 라우트 내부 `editing` state로** 처리(ADR-0009: 편집은 라우팅 안 함). depts는 `userStats` 쿼리(목록 화면과 동일 출처). onBack/onDeleted → `/app/$screenId`(members-list) navigate + invalidate.
- **S3 members.tsx 리와이어** — `MembersScreen`의 `view`를 `'list'|'detail'|'edit'|'add'` → `'list'|'add'`로 축소, `activeId` 제거. `openDetail(id)` → `navigate({to:'/app/members/$memberId'})`. detail·edit 분기 제거(라우트로 이전), add는 기존 state 유지. `MemberDetail`·`MemberEdit` export.
- **S4 검증** — `pnpm typecheck` 통과, `pnpm build`(routeTree 재생성) 성공, 신규 라우트 biome 클린(import 정렬 자동수정), members.tsx biome 에러 0·orphan 없음.

## 분기(Divergence)
- 없음 — 계획대로. 편집을 상세 라우트의 내부 state로 둔 것은 Part 1 프로젝트 패턴·ADR-0009과 일치(목록 화면이 아닌 상세에서 편집 진입).

## 현장 결정(설계 판단)
- **편집 진입점 위치** — 원래 MembersScreen state머신은 detail↔edit를 list 화면 state로 오갔다. 라우팅 후 edit를 list 화면에 두면 상세 라우트→편집 전환이 어색해지므로, Part 1처럼 **상세 라우트가 editing state를 보유**해 자체적으로 MemberEdit를 렌더. add만 목록 화면에 남김(상세 진입 전 동작).
- **invalidate 위치** — 기존 MembersScreen.refresh(전체 invalidate)를 라우트의 onSaved/onDeleted로 이전.

## 코드 리뷰 메모
- 변경: nav.ts(매핑 1줄), members.tsx(import + MembersScreen 축소 + 2개 export), 신규 라우트 1파일. 격리된 라우팅 변경. auth/데이터 변형/마이그레이션 무관. 회귀 리스크는 "목록→상세→편집→삭제, 추가" 흐름 보존 — UAT 위임.

## 미해결/UAT로 확인할 것
- 구성원 목록(`/app/members-list`)에서 구성원 클릭 → `/app/members/[id]` 이동, 상세 표시.
- 새로고침/직접 진입 시 해당 구성원 상세 열림(id-fetch).
- 상세에서 편집 → MemberEdit, 저장 시 반영 후 상세 갱신. 취소 동작.
- 상세에서 삭제 → 목록으로 이동 + 목록 갱신.
- 잘못된 id → MemberDetail의 not-found 처리.
- 상세 경로에서 사이드바 "구성원 관리" 활성표시.
- 목록 "구성원 추가"(add) 기존대로 동작.
