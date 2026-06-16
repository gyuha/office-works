<!-- forge-slug: team-management-api-3of3-teams-screen --> <!-- task: 13 --> <!-- tdd: off --> <!-- part: 3/3 -->

# 팀관리 프론트 ② — teams.tsx mock → 실 API 연동

## Goal / Non-goals
- Goal: 팀관리 화면(`web/src/features/office/screens/teams.tsx`)의 하드코딩 mock(MEMBERS_DATA·INITIAL_NODES·INITIAL_MEMBERS)을 실 `/api/v1/teams` API로 교체해, 시드 데이터(팀 14개·하위 포함 20명)가 화면에 보이고 모든 쓰기 동작이 서버에 반영되게 한다.
- Non-goals: 조직도 보기(차트) 렌더 방식 개편(기존 렌더 로직에 실 데이터만 공급), 화면 디자인 변경, 팀 이동(parent 변경) UI(API에 없음 — ADR-0008 non-goal), '준비 중인 화면입니다' 헤더 문구 제거 외 헤더 개편.

## Source of truth
- Glossary terms: `팀(Team)`, `구성원(Member)` in .forge/CONTEXT.md
- Related ADRs: .forge/adr/0008-team-single-affiliation-drop-department.md, 0004(생성 클라이언트)
- Definition of Done: 브라우저에서 `/app/team-list`가 시드 트리(대표이사 하위 포함 20명)를 표시하고, 팀 추가/이름 변경/삭제(cascade 경고 포함)/구성원 추가(이동 시맨틱)/구성원 제거가 서버 왕복 후 화면에 반영된다. typecheck·build·Biome green.

## 전제 (소프트 순서)
1of3(API·시드)과 2of3(클라이언트 재생성)이 선행된 상태를 권장한다.

## Work slices
- [ ] S1. 읽기 연동 — MEMBERS_DATA·INITIAL_NODES·INITIAL_MEMBERS 제거, `GET /teams`·`GET /teams/{id}/members`를 TanStack Query(생성된 query options)로 연동. 트리 구성·하위 포함 인원 집계는 기존 클라이언트 로직 재사용(이제 1:N이라 중복제거 불필요). 로컬 `Member` 타입을 생성된 API 타입으로 교체(CONCERNS §11 teams/members 타입 이원화 해소). — 완료기준: 화면이 시드 데이터(팀 14개, 대표이사 하위 포함 20명, 무소속 5명은 '구성원 추가' 후보에 노출)를 표시.
- [ ] S2. 쓰기 연동 — 팀 추가(루트/하위)·이름 변경·삭제·구성원 추가/제거를 mutations로 교체, 성공 시 query invalidate + 실패 토스트. '구성원 추가' 모달의 후보 목록은 전체 구성원(타 팀 소속자 포함 — 추가 시 이동됨을 안내 문구로 표시). **모달 후보 행과 직속 구성원 표시에 사번(employee_no)을 함께 표시 — 동명이인 구분(2of3 UAT 중 사용자 요구)**. — 완료기준: 각 쓰기 동작이 새로고침 후에도 유지(서버 영속 확인) + 모달 후보 행에 사번 표시. (depends: S1)

## 리스크 / 주의
- 화면 mock과 시드의 의도된 차이(ADR-0008): 대표이사·전무 직속 0명, 연구실 0명 — UAT에서 "스크린샷과 다르다"로 오판하지 말 것(1:N 전환의 파생).
- 쓰기 동작은 `users:write` 권한 필요 — admin 부트스트랩 갭(CONCERNS §3)으로 브라우저 UAT가 막히면 merge-members retro의 전례대로 DB 직접 role 부여로 우회하고, 부트스트랩은 별도 백로그 후보로 남긴다.
