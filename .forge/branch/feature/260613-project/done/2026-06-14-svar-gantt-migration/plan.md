<!-- forge-slug: svar-gantt-migration -->
<!-- task: 10 -->
<!-- tdd: off -->
# 프로젝트 간트를 SVAR React Gantt로 교체 + 저장 히스토리를 상단 바 셀렉트로 이전

## Goal / Non-goals
- Goal: `web/src/features/office/screens/projects.tsx`의 `GanttTab`을 `frappe-gantt`에서 `@svar-ui/react-gantt`로 교체한다. SVAR은 렌더+드래그/리사이즈/진척만 담당하고, 더블클릭 편집은 기존 `TaskEditDialog`, 부서별 5색·일/주/월 토글·작업추가·저장/히스토리 동작은 보존한다. 우측 240px 히스토리 패널을 제거하고 간트를 풀폭으로, 저장 히스토리는 상단 바 셀렉트 박스(첫 항목 "현재 일정(편집 중)" + 버전 목록)로 이전한다.
- Non-goals: 태스크 간 의존선(links)·계층/요약 작업·베이스라인, 백엔드 스케줄 버전 API 변경, 다크모드 토큰 통합, frappe 모양 픽셀 재현, e2e 자동화, auth 흐름 변경.

## Source of truth
- Glossary terms: none (도메인 용어 신규 없음 — 작업/스케줄 버전은 기존 개념)
- Related ADRs: .forge/adr/0007-svar-gantt-render-only-custom-dialog.md (이 작업으로 신설)
- Definition of Done: 일정 탭이 SVAR Gantt로 렌더되고 — 드래그 이동/리사이즈/진척 편집, 막대 더블클릭→우리 다이얼로그 편집, 부서별 5색, 일/주/월 토글이 동작하고 — 저장 히스토리가 상단 바 셀렉트로 열람·복귀되며(우측 패널 없음), `frappe-gantt` 의존성·`frappe-gantt.d.ts`가 제거되고, `pnpm typecheck && pnpm lint`가 통과한다.

## Work slices
- [ ] S1. 의존성 교체 — `web/`에 `@svar-ui/react-gantt` 추가(`pnpm add`), `frappe-gantt` 제거(`pnpm remove`), `web/src/types/frappe-gantt.d.ts` 삭제, `projects.tsx`의 frappe import 2줄 제거. 정확한 import 경로(`{ Gantt, Willow } from '@svar-ui/react-gantt'` + `'@svar-ui/react-gantt/all.css'`)와 Willow가 동일 패키지 export인지 설치 후 확인. — 완료기준: `package.json`에 svar 있고 frappe 없음, `pnpm install` 성공, 코드베이스 전체에 `frappe-gantt` 참조 0건(`grep`).
- [ ] S2. 데이터 매핑 순수 함수 — `Task{id,name,start,end,done,dept}` ↔ SVAR task`{id,text,start:Date,end:Date,progress,type:'task'}` 양방향 변환과 `dept`→CSS 클래스 매핑을 순수 함수로 분리하고 단위 테스트. `done`(0–100) ↔ `progress`, `YYYY-MM-DD` 문자열 ↔ `Date`(로컬 타임존 자정 기준, off-by-one 주의) 왕복 보존. — 완료기준: 매핑 함수 왕복(round-trip) 단위 테스트 통과(`pnpm test` 또는 vitest), 빈 start/end·진척 경계값(0/100) 케이스 포함.
- [ ] S3. SVAR 렌더 교체 — `GanttTab`에서 `new Gantt(el,…)`(명령형) 대신 `<Willow><Gantt .../></Willow>` 마운트. `scales`를 일/주/월 토글에 매핑(`GANTT_VIEW_MODES` 유지), 좌측 그리드 off(`columns` 최소/빈 설정), Willow 기본 테마 + 부서색 5종 CSS, `init={(api)=>…}`로 api 취득해 `api.on`의 drag/resize/progress 이벤트를 `tasks` state·`dirty`에 반영. 빈 작업(0건) 안내 문구 유지. — 완료기준: 일정 탭이 SVAR로 렌더되고 막대 드래그·리사이즈·진척 조작이 `tasks` state와 `dirty=true`에 반영됨(수동). (depends: S1, S2)
- [ ] S4. 커스텀 편집 다이얼로그 배선 — SVAR 내장 에디터 비활성(`Editor` 미마운트 또는 readonly), 막대 더블클릭을 `api.intercept('show-editor' 류 액션)`으로 가로채 기존 `TaskEditDialog`(부서 포함) 오픈, 저장 시 SVAR 데이터 반영. `+ 작업 추가` 버튼·삭제 동작 유지. 정확한 인터셉트 액션명은 설치된 패키지 소스/데모로 확정. — 완료기준: 막대 더블클릭 시 우리 다이얼로그가 열리고 저장 결과가 간트·state에 반영되며 SVAR 자체 에디터 폼은 뜨지 않음(수동). (depends: S3)
- [ ] S5. 히스토리 셀렉트 이전 — 우측 240px 패널 제거 → 간트 풀폭 레이아웃, 상단 툴바에 `[히스토리 ▾]` 셀렉트 추가(첫 항목 "현재 일정(편집 중)", 이후 버전 `날짜시간 · 메모 · N개`). 버전 선택=`loadVersion`, "현재 일정" 선택=`restoreCurrent`. 기존 "📌 히스토리 열람 중" 배너 제거(셀렉트가 상태 표시). `historyQuery`/`loadVersion`/`restoreCurrent` 로직 재사용. — 완료기준: 셀렉트로 버전 열람/복귀가 동작하고 우측 패널이 없으며 간트가 풀폭(수동). (depends: S3)
- [ ] S6. 검증·정리 — `pnpm typecheck && pnpm lint` 통과, 사용한 svar 외 잔여 import/변수 제거. 브라우저 수동 로그인(Teams SSO)으로 일정 탭 육안 체크리스트: 드래그/리사이즈/진척, 더블클릭 편집, 부서 5색, 일/주/월 전환, 히스토리 셀렉트 열람·복귀, 저장 후 히스토리 추가. — 완료기준: typecheck·lint 통과 + 수동 체크리스트 전 항목 확인. (depends: S4, S5)
