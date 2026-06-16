<!-- forge-slug: svar-gantt-migration -->
# run.md — 프로젝트 간트 SVAR 교체 + 히스토리 상단 셀렉트

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행(팬아웃 워크플로우 불채택 — 단일 파일·의존 사슬·SVAR API 탐색형 작업이라 병렬 이득 없음, fg-run 비용 제약 적용)

## 계획대로 된 것
- **S1 의존성 교체** — `@svar-ui/react-gantt@2.7.0` 설치, `frappe-gantt@1.2.2` 제거, `web/src/types/frappe-gantt.d.ts` 삭제, `projects.tsx`의 frappe import 2줄 제거. 코드 전체 frappe 참조 0건(주석 1건 제외).
- **S3 SVAR 렌더 교체** — 명령형 `new Gantt(el,…)` → `<Willow><Gantt/></Willow>` 마운트. 일/주/월 토글 → `scalesFor()` 매핑, 좌측 그리드 숨김, `init`으로 api 취득해 `update-task`(inProgress 무시) 이벤트를 React state·dirty에 반영. 빈 작업 안내 유지.
- **S4 커스텀 편집** — `<Editor>` 미마운트로 내장 에디터 비활성, `api.intercept('show-editor')`로 막대 더블클릭 가로채 기존 `TaskEditDialog`(부서 포함) 오픈 + `return false`로 내장 차단. `+ 작업 추가`·삭제 유지.
- **S5 히스토리 셀렉트** — 우측 240px 패널 제거 → 간트 풀폭, 상단 툴바에 shadcn `Select`(첫 항목 "현재 일정 (편집 중)" + 버전 `날짜 · 메모 · N개`). 버전 선택=`loadVersion`, 현재=`restoreCurrent`. "열람 중" 배너 제거.
- **S6 검증** — `pnpm typecheck` 통과, `pnpm build`(vite) 성공(SVAR ESM/CSS 임포트 번들 해석 확인), biome 신규 이슈 0(파일 기존 진단 24건은 무관·기존 코드).

## 분기(Divergence)
- **S2 단위 테스트 미작성 (계획 대비 미달)** — 프론트엔드에 테스트 러너가 없다(vitest 미설치, `test` 스크립트 없음, `src/sample/*.test.ts`는 실행 불가 레거시). 두 순수 함수(`taskToSvar`/`applySvarChange`)를 위해 vitest 인프라(의존성+설정+CI)를 새로 세우는 것은 TDD=off·단순성 우선 신호에 반하는 범위 초과로 판단해 **보류**. 매퍼는 module-scope **export된 순수 함수**로 분리해 두어 추후 러너 도입 시 즉시 테스트 가능. 라운드트립 로직(특히 end inclusive↔exclusive ±1일, done↔progress)은 코드 검토로 정합 확인. → 실제 데이터 정합은 UAT(막대 날짜/폭)로 검증 필요.

## 현장 결정(설계 판단)
- **부서색 = `data-task-id` 스코프 CSS 변수 주입.** SVAR 컴파일 소스 분석 결과 `.wx-bar`는 transparent이고 막대 fill·진척은 `--wx-gantt-task-fill-color`/`--wx-gantt-task-color`를 쓰는데 이 셀렉터가 `.wx-task`(타입)에 스코프돼 있다. 따라서 `type`을 부서값으로 바꾸면 fill 렌더가 깨진다. 막대 div에 `data-task-id`가 박히는 점을 이용해 `.wx-bar[data-task-id="…"]{--wx-gantt-task-*}` 를 `<style>`로 주입(타입 오염 없이 per-task 색상, 네이티브 진척 오버레이 유지). ADR-0007의 "taskTemplate/CSS" 중 CSS 변수 경로 채택.
- **`columns={false}` 캐스트.** 좌측 그리드 숨김은 SVAR 문서상 `columns={false}`지만, 컴포넌트 타입이 `(false|IColumnConfig[]) & IGanttColumn[]` 교차라 `false`가 타입상 거부됨. 런타임 동작 보존 위해 `false as unknown as IColumnConfig[]`로 캐스트(주석 명시).
- **재마운트 키 전략.** 우리 변경(다이얼로그 저장/추가/삭제·히스토리 로드·복귀·뷰모드)에만 `reloadKey` 증가로 `<Gantt>` 재마운트, SVAR 자체 드래그 편집은 재마운트하지 않음(`svarTasks` 메모를 `[reloadKey]`로 스냅샷). biome `useExhaustiveDependencies`는 의도적이라 `biome-ignore`로 억제.
- **progress 0–100 확정**(컴파일 소스 `width:${progress}%`) — 우리 `done`과 동일 스케일, 변환 불필요.
- **end 날짜 inclusive↔exclusive** — 우리 end(포함)를 SVAR end(+1일, 배타)로, 역방향 −1일. 매퍼에 캡슐화.

## 코드 리뷰 메모
- 변경 범위: 프론트 단일 컴포넌트(`GanttTab`) + import + package.json. auth/데이터 변형/마이그레이션/API 계약 무관, 격리된 UI 변경이라 별도 어드버서리얼 리뷰 에이전트 불요(저위험). 핵심 리스크는 UAT 항목으로 위임.

## 미해결/UAT로 확인할 것
- 막대 더블클릭 → 우리 다이얼로그 오픈(show-편집기 인터셉트 동작) — 런타임 미검증.
- 부서색 5종이 막대에 실제 적용되는지 + 진척 오버레이 가시성.
- 드래그 이동/리사이즈/진척 핸들이 state·dirty에 반영되고 저장 시 반영되는지.
- 컨테이너 높이(`h-[60vh]`)에서 Willow/Gantt가 정상 채워지는지(그리드 숨김 후 차트 풀폭).
- 일/주/월 전환 시 시간축 라벨.
