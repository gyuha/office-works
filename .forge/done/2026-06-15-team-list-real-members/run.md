<!-- forge-slug: team-list-real-members -->
# run.md — 팀관리 실제 구성원 표시·할당 (mock → 실제 users)

실행일: 2026-06-15 · 실행 방식: 직접 순차 실행(teams.tsx 멤버 로직 리라이트)

## 계획대로 된 것
- **S1 실제 user 로드 + 표시** — `TeamListScreen`에 `listUsers({page_size:1000})` 쿼리. `directMembers(id)` = `users.filter(u => u.department === getNode(id).name)`로 우측 패널이 실제 user(이름/사번/직급/등급/연락처) 표시. mock `teamMembers`/`MEMBERS_DATA`/`INITIAL_MEMBERS` 제거.
- **S2 카운트 실제화** — `memberCount(id)` = 노드+자손 이름 집합에 속한 user 수(department 일치). 직속 `dc` = directMembers.length. 트리/조직도 카운트 모두 이 함수 경유라 실제 반영.
- **S3 추가(할당)** — 모달 후보 `availMembers` = 이 팀에 없는 user(`department !== 노드이름`) + 검색(이름/사번/소속). 추가 = `updateUser` PATCH `{department: 노드이름}` → invalidate.
- **S4 제거(해제)** — 패널 X = `updateUser` PATCH `{department: ''}` → invalidate.
- **S5 정리·검증** — mock 데이터·`Member` 타입 제거, `GRADE_C`를 `Record<string,string>`로, `GradeTag`를 `string|null` 수용으로. `pnpm typecheck`·`pnpm build` 통과, teams.tsx biome 15→12(신규 에러 0, mock forEach 제거로 감소).

## 분기(Divergence)
- 없음 — 계획 5슬라이스대로. 트리 편집(이름변경/추가/삭제)·조직도 모달은 보존(트리는 여전히 클라 org-tree).

## 현장 결정(설계 판단)
- **invalidate 광범위** — PATCH 성공 시 `invalidateQueries()`로 users 목록 재조회(팀관리·구성원목록 동시 갱신).
- **GradeTag null 허용** — 실제 user.grade는 `string|null`이라 union 타입 GradeTag를 string|null 수용 + 미존재 grade는 기본 회색 fallback.
- **add 후보 = department != 노드이름** — 다른 팀 소속도 후보(추가 시 이동). 무소속(빈 department)도 후보.

## 코드 리뷰 메모
- 변경: teams.tsx(멤버 로직 전면 — mock→listUsers/updateUser), import 추가. 백엔드 무변경. 격리된 화면. 쓰기는 users:write 권한 필요.

## 미해결/UAT로 확인할 것
- 노드 선택 시 그 소속(department=노드이름)의 실제 user가 패널에 표시(빈 팀은 "직속 구성원 없음").
- 직속/하위 카운트가 실제 user 분포와 일치(트리·헤더·조직도).
- 구성원 추가 모달: 이 팀에 없는 user 후보, 추가 시 소속이 노드이름으로 바뀌고 패널/카운트 갱신.
- 제거 시 소속 비워지고 패널에서 사라짐.
- 권한 없을 때 PATCH 403 → 에러 토스트.
- 트리 편집/조직도 모달 기존대로.
- (알려진 한계) 시드 user department("개발팀")가 트리 이름("개발1팀")과 불일치하면 안 잡힘 — 신규/수정 데이터부터.
