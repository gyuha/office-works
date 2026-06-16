# 2026-06-14 — 프로젝트 간트를 SVAR React Gantt로 교체 + 저장 히스토리를 상단 바 셀렉트로 이전

## Plan vs actual
- What went as planned:
  - S1 의존성 교체(`frappe-gantt` 제거 → `@svar-ui/react-gantt@2.7.0`), S3 SVAR 렌더 교체(명령형 `new Gantt` → `<Willow><Gantt/></Willow>`), S4 커스텀 편집(`api.intercept('show-editor')` + `return false`로 내장 에디터 차단하고 기존 `TaskEditDialog` 오픈), S5 히스토리 셀렉트 이전(우측 240px 패널 제거 → 풀폭 + 상단 shadcn Select) 전부 계획대로.
  - 검증: `pnpm typecheck`·`pnpm build` 통과, frappe 참조 0건, 간트 코드 신규 lint 에러 0, 사용자 런타임 육안 확인(드래그/리사이즈/진척, 더블클릭 편집, 부서 5색, 일·주·월 토글, 히스토리 셀렉트 열람·복귀).
- Divergences:
  - **S2 매퍼 단위 테스트 미작성.** 프론트엔드에 테스트 러너 자체가 없음(vitest 미설치, `package.json`에 `test` 스크립트 없음, `src/sample/*.test.ts`는 실행 불가 레거시). 두 순수 함수(`taskToSvar`/`applySvarChange`)만을 위해 vitest 인프라(의존성+설정+CI)를 신규 구축하는 것은 TDD=off·단순성 우선 신호에 반하는 범위 초과라 보류. 매퍼는 module-scope **export된 순수 함수**로 분리해 둬서 추후 러너 도입 시 즉시 테스트 가능. 라운드트립(end inclusive↔exclusive ±1일, done↔progress)은 코드 검토 + UAT로 정합 확인.

## Learnings
- Do differently next time:
  - **프론트엔드(`web/`)에는 테스트 러너가 없다 — FE 작업 계획 시 "단위 테스트" 슬라이스를 넣으면 인프라 구축부터 필요해 범위가 튄다.** 검증 가능 로직은 (이번처럼) 순수 함수로 export 분리해 두되, 테스트 자체는 vitest를 의도적으로 도입하기로 별도 결정하기 전까지 계획에 넣지 말 것. (이번 보류는 "테스트 안 하기로 결정"이 아니라 단순 인프라 미구축 상태.)
  - **SVAR Gantt는 막대 색을 type 스코프 CSS 변수(`--wx-gantt-task-*`, `.wx-task`에 스코프)로 칠한다 — `type`을 부서값으로 바꾸면 fill이 깨진다.** 막대 div의 `data-task-id`를 이용해 `.wx-bar[data-task-id="…"]{--wx-gantt-task-*}`를 `<style>`로 주입하면 type 오염 없이 per-task 색상 + 네이티브 진척 오버레이 유지. (ADR-0007 "CSS 변수 경로" 범위 내, 코드 주석에 명시됨.)
  - **`columns={false}`(좌측 그리드 숨김)는 SVAR 문서값이지만 컴포넌트 타입이 교차 타입이라 거부됨** → `false as unknown as IColumnConfig[]` 캐스트 필요(런타임 동작 보존, 주석 명시).

## Doc updates
- CONTEXT.md promotion: none (신규 도메인 용어 없음 — 작업/스케줄 버전은 기존 개념)
- ADR added: none (부서색 CSS 변수 경로는 기존 ADR-0007 범위 내; 테스트 러너 부재는 사용자 판단으로 회고 로그에만 기록)
