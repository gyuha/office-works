<!-- forge-slug: member-form-org-fields-2of2 -->
<!-- task: 19 -->
<!-- tdd: off -->
<!-- part: 2/2 -->
# 구성원 폼 조직 필드 (2/2) — 프론트엔드 (소속/직급 드롭다운 + 사번 입력·수정)

## Goal / Non-goals
- Goal: 구성원 추가/편집 폼(`MemberForm`)에서 **소속**은 팀관리 소속(teams 트리 전체 노드), **직급**은 직급 체계(positions API), **등급**은 등급 체계(grades API, 현행) 드롭다운으로 입력. **사번**은 추가 시 직접 입력(비우면 자동생성)·편집 시 수정 가능. 옵션이 비면 자유 입력 폴백.
- Non-goals: 백엔드(1/2 완료 전제), teams 백엔드 API 신설(소속은 클라이언트 트리 공용 상수에서), 소속/직급 자유입력 완전 제거(옵션 없을 때 폴백 유지), 프로젝트 화면 인력 모달 변경.

## Source of truth
- Glossary terms: none
- 선행: `member-form-org-fields-1of2`(백엔드 employee_no — soft order, 먼저 완료: 클라이언트 재생성이 백엔드 스키마에 의존).
- 기존 코드: `members.tsx` `MemberForm`(소속=`depts`(stats.departments) select, 직급=자유입력, 등급=`useGrades()` select, 사번="자동 생성" 표시·입력 없음), `MemberAdd`/`MemberEdit`. `teams.tsx` `INITIAL_NODES`(조직 트리 — 소속 출처, 클라이언트 mock). `listPositionsApiV1PositionsGetOptions`(직급), `listGradesApiV1GradesGetOptions`(등급) 클라이언트 존재.
- Definition of Done: 추가/편집 폼에서 소속=팀 트리 전체 노드 드롭다운, 직급=positions 드롭다운, 등급=grades 드롭다운(현행), 사번 입력 필드(추가: 비우면 자동·채우면 그 값 / 편집: 수정 가능), 중복 사번 저장 시 백엔드 409 → 에러 토스트, 옵션 0개 시 자유입력 폴백. `pnpm typecheck && pnpm build` 통과 + 신규 코드 biome 신규 에러 0.

## Work slices
- [ ] S1. 클라이언트 재생성 + 소속 상수 추출 — `task gen-api`로 `UserCreate.employee_no`·`UserUpdate.employee_no`·import 템플릿 employee_no 반영. `teams.tsx`의 `INITIAL_NODES`(+`TreeNode`)를 공용 모듈(예 `features/office/data/org-tree.ts`)로 추출해 teams.tsx와 members 폼이 공유(소속 노드 이름 목록 export). — 완료기준: 생성 클라이언트에 employee_no 필드 존재, 공용 상수 import로 teams.tsx 동작 불변, `pnpm typecheck` 통과. (선행: 1/2)
- [ ] S2. 소속·직급 드롭다운 — `MemberForm`: 소속 select 옵션을 팀 트리 전체 노드 이름으로 교체(기존 `depts` prop 대신 공용 상수; 비면 자유입력 폴백 유지). 직급(rank)을 자유입력 → `listPositions` 쿼리 기반 select(`PositionResponse.name`; 비면 자유입력 폴백). 등급은 현행 유지. — 완료기준: 소속=트리 노드, 직급=positions 드롭다운 렌더, 옵션 없을 때 자유입력(수동). (depends: S1)
- [ ] S3. 사번 입력·수정 — `MemberForm`에 사번 입력 필드 추가: 추가 모드는 빈 값 허용(placeholder "비우면 자동 생성"), 편집 모드는 기존 `employee_no` 채워 수정 가능. `form`에 employee_no 포함해 `UserCreate`/`UserUpdate` body로 전송(빈 문자열은 undefined로). MemberAdd/MemberEdit 결선. — 완료기준: 추가 시 사번 직접 입력/빈값 자동생성, 편집 시 사번 수정 전송(수동). (depends: S1)
- [ ] S4. 검증·정리 — `pnpm typecheck && pnpm build` 통과, 신규 코드 biome 신규 에러 0, 미사용 import 제거. 수동 UAT: 소속=팀 트리 드롭다운, 직급=직급체계, 등급=등급체계, 사번 직접 입력(추가)·수정(편집), 중복 사번 저장 시 에러 토스트, 옵션 미구성 시 자유입력 폴백. — 완료기준: typecheck·build 통과 + 수동 체크리스트. (depends: S2, S3)
