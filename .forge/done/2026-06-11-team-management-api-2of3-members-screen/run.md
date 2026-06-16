# RUN — 팀관리 프론트 ① (team-management-api-2of3-members-screen)

실행일: 2026-06-11 · 실행 방식: 인라인 직접 실행(슬라이스 2개 직렬 소작업 — 워크플로우 비용 불요)

## 계획대로 된 것

- **S1 클라이언트 재생성** — `task gen-api` 1회로 완료. types.gen.ts에 TeamResponse·team_id·team_name 생성, department 잔재 0건, teams SDK 함수 생성 확인.
- **S2 members.tsx 개편** — 부서 표면 전부 팀으로 교체:
  - 목록: 소속 컬럼 `team_name ?? '—'`, 정렬키 `dept`→`team`(1of3 리뷰 P0-2 해소)
  - 필터: stats.departments 이름 기반 → `GET /teams` id 기반 드롭다운(`team_id` 쿼리 파라미터)
  - 통계 카드: `department_count`→`team_count` ("총 N개 팀")
  - 상세: 소속 Field = `team_name ?? '—'`, 헤더 라인 무소속 표기
  - 폼: 부서 텍스트/선택 → 팀 select(무소속 옵션 포함, `team_id` 전송). 삭제된 팀 등 목록에 없는 기존 소속은 옵션으로 보존(기존 withCurrent 패턴 따름)
  - 검색 placeholder에서 소속 제거(서버 검색 필드에서 department 제외됨)
- 게이트: `pnpm typecheck` 0 에러, members.tsx Biome clean, `pnpm build` 성공.

## 어긋난 것 / 현장 결정

- **★ UAT가 1of3 시드의 잠복 결함을 포착 — `.local` 도메인이 EmailStr에 거부돼 `/users` 목록 500.** 시드는 DB 직접 insert라 입력 검증을 우회했고, 응답 DTO(UserResponse.email: EmailStr)가 직렬화 시점에 ValidationError → unhandled 500. email-validator는 `.local` 등 special-use TLD를 거부한다(`example.com`은 허용 — 기존 테스트가 통과한 이유). 1of3의 서비스 UAT는 teams 경로만 검증해 누락. → 시드 도메인을 회사 도메인 `officemate.co.kr`(COMPANY_INFO 정합)로 교체, 시드 재실행(employee_no upsert가 이메일 갱신), 목록·통계 직렬화 검증 통과.
- 그 외 계획 이탈 없음. 현장 결정 2건만:
  - 필터 드롭다운의 데이터 소스를 stats.teams(이름만)가 아닌 `GET /teams`(id+이름)로 — 새 필터 파라미터가 `team_id`(id 기반)라서 필연.
  - Biome 포맷 1건 자동수정(통계 카드 div 한 줄화).
- 사전 존재 Biome 실패(dashboard·charts·notice-panel·globals.css 등 — 이 작업 무관)는 비대상 유지.

## 막힌 곳

없음. 단, 브라우저 왕복 UAT는 핸드오프에서 사용자 확인 필요(쓰기 동작은 admin role 필요 — CONCERNS §3의 부트스트랩 갭 주의).
