<!-- forge-slug: member-allocation-gantt -->
<!-- task: 11 -->
<!-- tdd: off -->
# "투입 인력" 탭에 간트 차트 뷰 추가 (테이블 ↔ 간트 보기 전환)

## Goal / Non-goals
- Goal: `web/src/features/office/screens/projects.tsx`의 `MembersTab`에 **테이블 ↔ 간트 보기 전환**을 추가한다. 헤더 우측에 `[테이블 | 간트]` 세그먼트 토글(기본 테이블, 로컬 state)을 두고, 간트 뷰는 각 멤버의 투입 기간(`start`~`end`)을 막대 하나로 그린다(막대 라벨=멤버 이름). 막대는 **등급별 4색**으로 칠하고, **드래그/리사이즈로 투입 시작/종료를 편집**하며(진척 핸들 없음), **막대 더블클릭 → 기존 `MemberModal`** 을 연다. 편집은 `p.members` in-memory 변형 + `bump()`(테이블/모달과 동일, 저장 버튼·히스토리 없음). 간트 뷰에 일/주/월 스케일 토글(기본 월)을 둔다.
- Non-goals: 기존 `GanttTab`(프로젝트 일정 간트) 수정/리팩터 일절 금지(방금 봉인·검증된 기능 보호), 공유 `<GanttView>` 컴포넌트 추출, 멤버 단위 테스트 작성(프론트엔드에 테스트 러너 없음 — 회고 학습), 멤버용 백엔드 영속/스케줄 버전 API, 진척(`done`)·의존선·요약작업, 다크모드 토큰 통합, e2e 자동화.

## Source of truth
- Glossary terms: none (신규 도메인 용어 없음 — 투입 인력/투입 기간은 기존 개념)
- Related ADRs: `.forge/adr/0008-svar-gantt-render-only-custom-dialog.md` (SVAR 렌더 전용 + 커스텀 다이얼로그 패턴 — 이 작업도 동일 패턴 적용)
- 직전 회고 재사용: `.forge/retro/2026-06-14-svar-gantt-migration.md` — ① 부서색 = `.wx-bar[data-task-id]` 스코프 CSS 변수 주입(type 오염 없이 per-task 색), ② `columns={false as unknown as IColumnConfig[]}` 캐스트, ③ end inclusive↔exclusive ±1일 매퍼, ④ FE 테스트 러너 없음 → 단위테스트 슬라이스 금지.
- Definition of Done: "투입 인력" 탭에서 `[테이블|간트]` 토글로 두 뷰를 오가며, 간트 뷰가 멤버 투입 기간을 등급별 4색 막대로 렌더하고 — 막대 드래그 이동/좌우 리사이즈로 투입 시작/종료가 바뀌어 `p.members`에 반영되고, 막대 더블클릭 시 기존 `MemberModal`이 열리며, 일/주/월 토글이 동작하고, 투입일 미지정 멤버는 막대에서 제외되어 카운트 안내로 표시되며, 비활성 멤버 막대는 흐리게 표시되고, `pnpm typecheck` 통과 + 간트 코드에 신규 lint 에러 0.

## Work slices
- [ ] S1. 등급색 맵 + 멤버↔SVAR 매핑 순수 함수 — `GRADE_COLORS: Record<string,string>` 추가(특급 `#0066ff` · 고급 `#00bf40` · 중급 `#ff9200` · 초급 `#94A3B8`, 미지정 fallback `#94A3B8`). `memberToSvar(m: Member): ITask`(text=name, start/end = `parseYMD`, end는 `addDays(+1)`로 exclusive, type='task', progress 없음/0) 와 `applySvarChangeToMember(m, {start?,end?})`(end는 `addDays(-1)`로 inclusive 복원, name/grade는 SVAR이 안 건드림) 를 module-scope export 순수 함수로 작성. 기존 `parseYMD`/`addDays`/`fmtYMD` 재사용. **단위 테스트 미작성**(러너 부재 — 회고). — 완료기준: 함수가 타입체크 통과하고 export됨, end ±1일·빈 날짜 처리 로직이 코드상 명확(빈 start/end는 S3에서 제외 처리하므로 매퍼는 유효 날짜만 받는 전제).
- [ ] S2. 뷰 토글 — `MembersTab`에 `const [view, setView] = useState<'table'|'gantt'>('table')`. 헤더 우측(`총 N명`·`+ 인력 추가`와 같은 줄)에 `[테이블 | 간트]` 세그먼트 토글 추가 — `GanttTab`의 일/주/월 토글과 동일한 둥근 테두리 버튼 스타일 차용. `총 N명`·`+ 인력 추가`·`MemberModal`은 두 뷰 공통 유지. `view==='table'`이면 기존 테이블 그대로, `view==='gantt'`이면 S3 컴포넌트 렌더. — 완료기준: 토글로 테이블↔간트가 전환되고 기본이 테이블이며 헤더 컨트롤이 두 뷰에서 모두 보임(수동).
- [ ] S3. 멤버 간트 렌더 — `MembersGanttView({ p, bump, onEdit })` 컴포넌트 신설(같은 파일 내, `GanttTab` 미수정). `<Willow><Gantt columns={false as unknown as IColumnConfig[]} cellHeight={38} init={…}/></Willow>` 마운트, 일/주/월 토글(기본 월, `scalesFor` 재사용 — 한국어 라벨), 등급 범례(`GRADE_COLORS` 4종), `data-task-id` 스코프 CSS 변수 주입으로 등급색 + 비활성 멤버 막대 `opacity` 낮춤. **투입 시작·종료 둘 다 있는 active/비활성 멤버만 막대**로 매핑하고, 누락 멤버는 간트 하단에 "N명 투입일 미지정 — 간트 미표시" 안내. 멤버 0명/막대 0개일 때 안내 문구. — 완료기준: 간트가 멤버 투입 기간을 등급색 막대로 렌더, 누락 멤버 제외+카운트 표시, 비활성 흐리게, 일/주/월 전환 동작(수동). (depends: S1)
- [ ] S4. 편집 배선 — `init`의 `api.on('update-task')`(inProgress 무시)에서 드래그/리사이즈 커밋 시 해당 `p.members` 항목의 `start`/`end`를 `applySvarChangeToMember` 결과로 in-place 변형 후 `bump()` (테이블/모달과 동일 영속). `api.intercept('show-editor')`로 막대 더블클릭을 가로채 `onEdit(memberIndex)` → 기존 `MemberModal` 오픈(`return false`로 SVAR 내장 에디터 차단). `GanttTab`처럼 우리 변경(모달 저장/추가/삭제·뷰모드)에만 재마운트하는 `reloadKey` 패턴 적용. — 완료기준: 막대 드래그/리사이즈가 `p.members` 날짜에 반영되고, 더블클릭 시 `MemberModal`이 열리며 SVAR 자체 에디터는 안 뜸(수동). (depends: S3)
- [ ] S5. 검증·정리 — `pnpm typecheck` 통과, `pnpm build` 성공, 간트 추가 코드에 신규 biome 에러 0(잠재 이슈는 `biome-ignore`로 정당화), 미사용 import/변수 제거. 수동 UAT 체크리스트: 토글 전환, 등급 4색, 드래그/리사이즈→날짜 반영, 더블클릭 편집, 일/주/월, 미지정 멤버 카운트 안내, 비활성 흐리게. — 완료기준: typecheck·build 통과 + 수동 체크리스트 전 항목 확인. (depends: S2, S4)
