<!-- forge-slug: team-list-real-members -->
<!-- task: 20 -->
<!-- tdd: off -->
# 팀관리에서 실제 구성원 표시·할당 (mock → 실제 users)

## Goal / Non-goals
- Goal: 팀관리(`/app/team-list`)가 클라이언트 mock(`teamMembers`/`MEMBERS_DATA`/`INITIAL_MEMBERS`) 대신 **실제 구성원(`/api/v1/users`)**을 보여주고 할당한다. 선택한 팀 노드의 구성원 = `department`가 그 노드 이름과 일치하는 user. 직접/하위 트리 카운트도 실제 user에서 산출. "구성원 추가"는 user의 `department`를 노드 이름으로 PATCH(이 팀에 없는 user 후보), "구성원 제거"는 `department`를 비움.
- Non-goals: 백엔드 변경(listUsers·updateUser 기존 사용), teams 백엔드/멤버십 join 신설, 조직도 트리 노드의 백엔드 영속(트리는 여전히 클라이언트 `org-tree` 상수), 노드 이름 변경 시 user.department 캐스케이드(트리 rename은 기존 user 소속을 자동 갱신하지 않음 — 알려진 한계), 기존 시드 user의 department 용어 보정.

## Source of truth
- Glossary terms: `.forge/branch/feature/260613-project/CONTEXT.md` — "소속(department)", "팀 구성원(team membership)"(department 문자열 일치, join 없음).
- Related ADRs: none (기존 필드/엔드포인트 활용, 마이그레이션·신규 도메인 없음)
- 기존 코드: `teams.tsx`(`TeamListScreen` — `selectedId`(URL 동기), `teamMembers`/`MEMBERS_DATA`/`INITIAL_MEMBERS` mock, `directMembers`/`memberCount`, 구성원 추가 모달 `showMemModal`/`availMembers`/addMember/removeMember, 조직도 모달). `org-tree.ts`(`INITIAL_NODES`/`DEPARTMENT_OPTIONS`). `listUsersApiV1UsersGetOptions`(department 필터 지원), `updateUserApiV1UsersUserIdPatchMutation`. members.tsx의 listUsers/blob 패턴 참고.
- Definition of Done: 노드 선택 시 우측 패널이 그 소속(department=노드이름)의 **실제 user**(이름/직급/등급 등) 목록을 표시, 직접·하위 카운트가 실제 user 기준, "구성원 추가"가 선택 user의 department를 노드 이름으로 PATCH해 패널/카운트 갱신, "구성원 제거"가 department를 비워 갱신. mock(`teamMembers`/`MEMBERS_DATA`/`INITIAL_MEMBERS`) 제거. `pnpm typecheck && pnpm build` 통과 + 신규 코드 biome 신규 에러 0. (쓰기는 admin 권한 필요)

## Work slices
- [ ] S1. 실제 user 로드 + 우측 패널 표시 — `TeamListScreen`에서 `listUsers`(큰 page_size로 전체) 1회 조회. 선택 노드의 구성원 = `users.filter(u => u.department === selNode.name)`로 우측 패널 렌더(기존 카드 UI 재사용 — 이름/직급/등급/사번). `directMembers` mock 경로 대체. — 완료기준: 노드 선택 시 그 소속의 실제 user가 패널에 표시(수동). 
- [ ] S2. 카운트 실제화 — 직접 카운트 = `department==노드이름` user 수, 하위 트리 카운트 = 노드+자손 노드 이름 집합에 속한 user 수. 로드한 users에서 클라이언트 집계(department→count 맵 + 트리 자손 이름). `memberCount`/`dc`/`tc` mock 대체. — 완료기준: 트리/패널의 직접·하위 카운트가 실제 user 분포와 일치(수동). (depends: S1)
- [ ] S3. 구성원 추가(할당) — 구성원 추가 모달 후보 = **이 팀에 없는 user**(`department !== 노드이름`, 실제 users에서). 선택 시 `updateUser` PATCH `{department: 노드이름}` → invalidate(목록 재조회). 다중 선택/단건은 기존 모달 UX 유지. — 완료기준: 모달에서 user 선택→추가 시 그 user의 소속이 노드이름으로 바뀌고 패널/카운트 갱신(수동, admin). (depends: S1)
- [ ] S4. 구성원 제거(소속 해제) — 패널의 제거 액션 → `updateUser` PATCH `{department: ''}`(빈 값=미지정) → invalidate. — 완료기준: 제거 시 그 user가 패널에서 사라지고 소속이 비워짐(수동, admin). (depends: S1)
- [ ] S5. mock 제거 + 검증 — `teamMembers` state·`MEMBERS_DATA`·`INITIAL_MEMBERS`·관련 헬퍼 중 실제 데이터로 대체돼 orphan이 된 것 제거(트리 편집/조직도 모달이 쓰는 부분은 보존). `pnpm typecheck && pnpm build` 통과, 신규 코드 biome 0, 미사용 import 제거. 수동 UAT: 노드별 실제 구성원·카운트, 추가(할당)·제거(해제), 권한 없을 때 PATCH 403 에러, 트리 편집/조직도 모달 기존대로. — 완료기준: typecheck·build 통과 + 수동 체크리스트. (depends: S2, S3, S4)
