<!-- forge-slug: team-management-api-2of3-members-screen --> <!-- task: 12 --> <!-- tdd: off --> <!-- part: 2/3 -->

# 팀관리 프론트 ① — 클라이언트 재생성 + members.tsx 부서→팀 교체

## Goal / Non-goals
- Goal: 1of3의 API 계약 변경(department 제거·team 추가)을 프론트에 반영한다 — hey-api 클라이언트 재생성 후, 구성원 화면(members.tsx)의 부서 표면을 팀으로 교체해 기존 화면을 복구한다.
- Non-goals: teams.tsx 실 API 연동(3of3), 팀 필터/그룹핑 등 신규 기능 추가(부서가 하던 역할의 1:1 교체만).

## Source of truth
- Glossary terms: `팀(Team)`, `구성원(Member)` in .forge/CONTEXT.md
- Related ADRs: .forge/adr/0008-team-single-affiliation-drop-department.md, 0004(생성 클라이언트)
- Definition of Done: members 화면에서 구성원 목록·상세에 팀이 표시되고, 생성/수정 폼에서 팀 선택(무소속 포함)이 동작하며 저장 왕복이 정상. `pnpm typecheck`·`pnpm build`·Biome green.

## 전제 (소프트 순서)
1of3(백엔드)이 먼저 실행·시드 적용된 상태를 권장한다 — `task gen-api`가 새 openapi.json을 읽어야 하므로.

## Work slices
- [ ] S1. `task gen-api`로 `web/src/client/` 재생성 — 완료기준: types.gen.ts에서 UserResponse의 department 부재 + team_id/team_name 존재, 신규 teams SDK 함수 생성 확인.
- [ ] S2. `web/src/features/office/screens/members.tsx` 개편 — 목록·상세의 부서 컬럼/Field를 팀(team_name, 무소속은 '—' 표시)으로 교체, 생성/수정 폼의 부서 입력을 `GET /api/v1/teams` 기반 팀 선택(무소속 옵션 포함)으로 교체, 검색/필터에서 department 참조 제거. — 완료기준: typecheck 0 에러 + 브라우저에서 구성원 추가→팀 지정→저장→상세 표시→편집 재로드 왕복 정상. (depends: S1)

## 리스크 / 주의
- members.tsx는 1,000줄+ 단일 파일이고 직전 작업(memo)의 미커밋 변경이 올라가 있다 — surgical 편집, 무관 라인 불수정.
- 편집 폼의 풀폼 PATCH 패턴(CONCERNS §4)은 기존 부채 — 이번에 고치지 않고 team_id도 같은 패턴으로 보낸다(부분수정 전환은 별도 백로그 후보).
