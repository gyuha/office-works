<!-- forge-slug: member-allocation-gantt -->
# run.md — "투입 인력" 탭 간트 뷰 추가 (테이블 ↔ 간트 토글)

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행(팬아웃 워크플로우 불채택 — 단일 파일·의존 사슬·SVAR 패턴 재사용 작업이라 병렬 이득 없음, 직전 svar-gantt-migration과 동일 판단)

## 계획대로 된 것
- **S1 등급색 맵 + 매핑 순수 함수** — `GRADE_COLORS`(특급 `#0066ff`·고급 `#00bf40`·중급 `#ff9200`·초급 `#94a3b8`) 추가. `memberToSvar`(end +1일 exclusive, progress 0), `applySvarChangeToMember`(end −1일 inclusive 복원), `memberStyleCss`(등급색 + 비활성 `opacity:0.45`) 를 module-scope 함수로 작성. 기존 `parseYMD`/`addDays`/`fmtYMD` 재사용. 단위 테스트 미작성(러너 부재 — 회고 학습대로).
- **S2 뷰 토글** — `MembersTab`에 `view: 'table'|'gantt'` 로컬 state, 헤더 우측에 `[테이블|간트]` 세그먼트 토글(GanttTab 일/주/월 토글 스타일 차용), 기본 테이블. `총 N명`·`+ 인력 추가`·`MemberModal` 두 뷰 공통 유지.
- **S3 멤버 간트 렌더** — `MembersGanttView` 컴포넌트 신설(`GanttTab` 미수정). `<Willow><Gantt columns={false as unknown…} cellHeight={38} readonly={false}/></Willow>`, 일/주/월 토글(기본 월, `scalesFor` 재사용), 등급 4색 범례, `data-task-id` 스코프 CSS 주입(등급색 + 비활성 흐리게). 투입 시작·종료 둘 다 있는 멤버만 막대, 누락 멤버는 하단 "N명 투입일 미지정 — 간트 미표시" 안내, dated 0건 시 안내 문구.
- **S4 편집 배선** — `api.on('update-task')`(inProgress 무시)에서 드래그/리사이즈 커밋 → 해당 `p.members` 항목 `start`/`end` in-place 변형 + `bump()`(테이블/모달과 동일 영속). `api.intercept('show-editor')`로 더블클릭 가로채 `onEdit(i)` → 기존 `MemberModal` 오픈(`return false`로 내장 에디터 차단).
- **S5 검증** — `pnpm typecheck` 통과, `pnpm build`(vite) 성공, 멤버 간트 신규 코드 biome 신규 에러 0(기존 에러 20건은 행만 밀림 — 내 추가분 +6/+139 시프트로 1:1 대응 확인).

## 분기(Divergence)
- 계획 5개 슬라이스 전부 계획대로 구현. 단위 테스트 미작성은 계획에 이미 명시된 비목표(러너 부재)라 분기 아님.
- **UAT 중 추가 요청(계획 밖, 사용자 지시):** `MemberModal`(인력 추가/편집) 개선 — 등급을 수동 Select로 입력하던 것을 제거하고 **구성원 마스터 데이터값으로 자동**(저장 시 `src.grade`), 구성원 선택 시 **읽기 전용 패널(이름/팀/등급/직급)** 표시. "팀"은 `MEMBERS_DATA`에 팀 필드가 없어 `teams.tsx`의 멤버 데이터(dept=개발팀/기획팀/…) 값을 projects.tsx `MEMBERS_DATA`에 `team` 필드로 복사 추가(같은 EMP-id). `ReadOnlyField` 헬퍼 신설. 역할(role)은 프로젝트별 편집 필드라 입력 유지. → 간트 색(등급 기반)과 직결되고 간트 더블클릭이 이 모달을 열어 관련성 있어 현재 run에 접어 처리. typecheck·build 통과, biome 신규 에러 0.
  - 잔여 기술부채(범위 외): `MEMBERS_DATA`가 projects.tsx·teams.tsx에 중복 정의됨(이번에 팀 필드까지 양쪽에 존재). 통합은 별도 작업감 — 기존 중복이라 손대지 않음.

## 현장 결정(설계 판단)
- **재마운트 = content signature 키.** `GanttTab`은 자체 `tasks` state를 소유해 reloadKey 이중 전략을 쓰지만, 멤버는 `p.members`를 부모가 소유(모달이 in-place 변형)한다. 그래서 `key={`${viewMode}:${sig}`}`(sig = id:start:end:active 조인)로 멤버 집합/날짜/활성 변화 시 재마운트 — 드래그 커밋·모달 편집·추가/삭제가 모두 반영된다. 드래그 커밋 후 재마운트는 막대가 이미 드롭 위치에 있어 무해(커밋 이벤트 1회).
- **드래그 편집 영속 = in-place + bump.** 멤버엔 저장 버튼/히스토리 API가 없으므로(테이블/모달과 동일), 커밋 시 `p.members` 객체의 start/end를 직접 변형하고 `bump()`로 부모 리렌더. GanttTab의 local-state+save 모델과 다름(의도된 차이).
- **진척 핸들 없음** — `memberToSvar`의 progress=0 고정, 멤버엔 done 개념 없음.

## 코드 리뷰 메모
- 변경 범위: 프론트 단일 컴포넌트(`MembersTab` + 신규 `MembersGanttView`) + 모듈 헬퍼 3개 + 색상맵. auth/데이터 변형/마이그레이션/API 계약 무관, 격리된 클라이언트 UI 변경(저위험). `GanttTab`(직전 봉인 기능) 무수정 — 회귀 위험 차단. 별도 어드버서리얼 리뷰 에이전트 불요.

## 미해결/UAT로 확인할 것
- `[테이블|간트]` 토글 전환, 기본 테이블.
- 간트 뷰: 멤버 막대가 등급 4색으로, 비활성 멤버 흐리게.
- 막대 드래그 이동/좌우 리사이즈 → 투입 시작/종료 변경이 테이블에도 반영(bump).
- 막대 더블클릭 → 기존 MemberModal 오픈(SVAR 내장 에디터 안 뜸).
- 일/주/월 전환.
- 투입일 미지정 멤버 카운트 안내 표시.
