<!-- forge-slug: member-form-org-fields-2of2 -->
# run.md — 구성원 폼 조직 필드 (2/2) 프론트엔드

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행(백엔드 1/2 완료 후)

## 계획대로 된 것
- **S1 클라이언트 재생성 + 소속 상수 추출** — `task gen-api`로 UserCreate/UserUpdate `employee_no` 반영. `teams.tsx`의 `INITIAL_NODES`/`TreeNode`를 공용 모듈 `features/office/data/org-tree.ts`로 추출(+`DEPARTMENT_OPTIONS` = 조직도 전체 노드 이름). teams.tsx는 거기서 import(동작 불변).
- **S2 소속·직급 드롭다운** — `MemberForm`: 소속 옵션을 `DEPARTMENT_OPTIONS`(조직도 전체 노드)로(폴백 depts). 직급(rank)을 자유입력 → `listPositions` 쿼리 기반 select(`PositionResponse.name`, 옵션 0개 시 자유입력 폴백). 등급은 현행 grades select 유지.
- **S3 사번 입력·수정** — `MemberForm` form 상태에 `employee_no` 추가, 사번 EditField 입력 필드(추가: placeholder "비우면 자동 생성" / 편집: 기존값 채워 수정). body로 전송(UserCreate=빈값→백엔드 자동, UserUpdate=수정). 헤더 사번 표시도 form 값 반영. MemberAdd/MemberEdit는 기존 onSubmit 경로로 employee_no 자동 포함.
- **S4 검증** — `pnpm typecheck`·`pnpm build` 통과, members.tsx biome 0, org-tree.ts 클린, teams.tsx 신규 에러 0(15 기존 유지).

## 분기(Divergence)
- 없음 — 계획대로. `depts` prop은 제거 대신 폴백으로 유지(DEPARTMENT_OPTIONS가 항상 채워져 실사용은 조직도; prop 시그니처 변경 최소화).

## 현장 결정(설계 판단)
- **소속 = 공용 상수 추출.** teams 백엔드가 없어 `INITIAL_NODES`를 `data/org-tree.ts`로 빼서 teams 화면과 구성원 폼이 공유. teams 백엔드 생기면 이 상수만 교체.
- **직급/소속 빈옵션 폴백 유지** — positions 미구성 시 자유입력으로 떨어져 입력 자체는 막지 않음.
- **사번 빈값 처리** — 추가 시 빈 문자열은 백엔드 `blank_employee_no_to_none`이 None→자동생성으로 처리(프론트 추가 변환 불필요). 편집은 기존 사번 채워져 빈값 거의 없음.

## 코드 리뷰 메모
- 변경: 신규 `data/org-tree.ts`, teams.tsx(로컬 트리→공용 import), members.tsx(import + MemberForm 소속/직급/사번), 재생성 client. 격리된 UI + 생성 클라이언트. 위험 낮음.

## 미해결/UAT로 확인할 것
- 구성원 추가: 소속=조직도 전체 노드 드롭다운, 직급=직급체계(positions) 드롭다운, 등급=등급체계, 사번 직접 입력(비우면 자동).
- 사번 중복 입력 시 저장 → 백엔드 409 → 에러 토스트.
- 구성원 편집: 사번 수정 가능, 저장 반영.
- positions/조직도 옵션 정상 노출(설정/팀관리와 일치), 옵션 없을 때 자유입력 폴백.
- 팀관리(teams) 화면이 공용 상수 추출 후에도 정상 동작.

## UAT 중 추가 분기 (사용자 지시 — 소속 빈 값 허용)
- 요청: 소속(department)이 빈 값일 수 있어야 함. 봉인된 백엔드(1/2)까지 수정하기로 결정(사용자 승인), 본 part run에 접어 처리.
- 백엔드: `UserCreate.department` 필수→optional(`str|None`, 빈문자→None via `blank_to_none`), `UserUpdate.department`도 빈값→None(strip_text에서 제외). `repo.create(department: str|None)`. users.department 컬럼은 원래 nullable이라 마이그레이션 불요. import는 빈 dept 자동 통과(스키마가 처리).
- 프론트: 소속 select에 "— 소속 없음 —"(value="") 옵션 추가, form.department 기본값을 `initial?.department ?? ''`로(편집 시 빈 소속 보존 — 기존엔 첫 옵션 대표이사로 덮어쓰던 버그 수정).
- 검증: 백엔드 `task test` 697 passed·커버리지 79.66%·mypy/ruff 클린, 프론트 typecheck·build·biome 0.
