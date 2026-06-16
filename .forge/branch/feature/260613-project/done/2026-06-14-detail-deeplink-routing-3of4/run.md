<!-- forge-slug: detail-deeplink-routing-3of4 -->
# run.md — 상세 딥링크 라우팅 (3/4) 결재 상신함

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행(Part 1 패턴 재사용)

## 계획대로 된 것
- **S1 nav.ts 매핑** — 변경 불필요. `appr-sent`가 이미 screenId라 `/app/appr-sent/[docId]`는 기존 `pathToScreen`(SCREEN_LABELS 경로)이 사이드바 "상신함" 활성표시를 처리(ADR-0008의 "base가 곧 screenId인 화면" 케이스).
- **S2 결재 문서 상세 라우트** — `src/routes/_app/app.appr-sent.$docId.tsx` 신설. `beforeLoad`에서 `APPROVAL_DATA`에 docId 없으면 `/app/appr-sent` redirect. 컴포넌트는 docId로 문서 조회 후 기존 `DocDetail` 렌더, onBack → `/app/$screenId`(appr-sent) navigate.
- **S3 SentScreen 리와이어** — `SentView`를 `'list'|'detail'|'write'` → `'list'|'write'`로 축소, `selectedId`/`selected` 제거. `DocTable onRowClick` → `navigate({to:'/app/appr-sent/$docId'})`. `view==='detail'` 분기 제거(라우트로 이전), 작성(write)은 기존 state 유지. `APPROVAL_DATA`·`DocDetail`·`ApprovalDoc` export.
- **S4 검증** — `pnpm typecheck` 통과, `pnpm build`(routeTree 재생성) 성공, 신규 라우트 biome 클린, approval.tsx biome 에러 0·orphan 없음.

## 분기(Divergence)
- 없음 — 계획대로. nav.ts S1이 no-op인 점은 계획에도 "appr-sent는 base=screenId라 기존 경로로 처리"로 명시됨.

## 현장 결정(설계 판단)
- **상세는 module-level `APPROVAL_DATA`(mock)에서 조회.** docs는 원래 SentScreen 로컬 state(작성 시 prepend)지만 `DocDetail`은 표시 전용이라 시드 데이터 조회로 충분. **한계**: 세션 중 새로 작성한 mock 문서는 APPROVAL_DATA에 없어 딥링크 시 목록 redirect(계획의 "미존재 docId 목록 리다이렉트"에 부합) — 백엔드 없는 mock의 본질적 제약.
- **onBack = navigate(appr-sent)** — 브라우저 뒤로가기와 별개로 명시적 목록 복귀.

## 코드 리뷰 메모
- 변경: approval.tsx(import 0 추가 — useNavigate 기존 존재, 3개 export + SentScreen 축소), 신규 라우트 1파일. 격리된 라우팅 변경. mock 데이터·표시 전용이라 위험 낮음.

## 미해결/UAT로 확인할 것
- 상신함(`/app/appr-sent`)에서 문서 클릭 → `/app/appr-sent/[docId]` 이동, 문서상세 표시.
- 새로고침/직접 진입 시 해당 문서상세 열림.
- 미존재 docId 진입 → 상신함 목록 redirect.
- 문서상세 "뒤로" → 상신함 목록.
- 상세 경로에서 사이드바 "상신함" 활성표시.
- 작성(write) 흐름 기존대로(상신함에서 작성하기).
- (한계) 세션 중 새로 작성한 문서 클릭 시 동작(APPROVAL_DATA 미포함이면 redirect).
