<!-- forge-slug: validate-rank-against-positions -->
# run.md — 직급(rank) 검증을 positions 체계에 대조

실행일: 2026-06-15 · 실행 방식: 직접 순차 실행 + TDD

## 계획대로 된 것
- **S1 repo** — `UserDirectoryRepository.position_exists(name)` 추가(`grade_exists`와 동형, raw SQL `SELECT 1 FROM positions WHERE name=:name`).
- **S2 service (TDD)** — `_validate_rank`(positions 미존재 시 `AppError("Unknown rank '...'")`). `create`에서 `_validate_grade` 다음 호출(rank 필수라 항상). `update`에서 rank 변경 시 검증. fake repo에 `position_exists`(+`valid_ranks` 집합) 추가, 단위 테스트(미존재 rank → AppError) 추가.
- **S3 검증** — 변경 파일 ruff·mypy strict 통과. `task test`: **698 passed, 커버리지 79.60%(≥70%)**. 기존 통합 create 테스트 회귀 없음(positions 시드돼 유효 rank 사용).

## 분기(Divergence)
- 없음 — 계획 3슬라이스대로. department 검증은 비목표(teams 백엔드 부재)로 제외, rank만 일관 적용.

## 현장 결정(설계 판단)
- **grade 패턴 그대로 미러링** — ADR-0005의 "이름 문자열 + 앱 검증"을 rank에 동일 적용(물리 FK·rename cascade·삭제차단은 범위 외, 검증만).
- **fake repo valid_ranks** — 시드된 positions(사원/주임/대리/과장/차장/부장/팀장)를 미러해 기존 `_payload`(rank="사원") 테스트가 통과.

## 코드 리뷰 메모
- 변경: repo(+position_exists), service(+_validate_rank, create/update 호출), 테스트(+fake position_exists, +rank 테스트). 데이터 생성/수정 경로의 검증 추가지만 마이그레이션·계약 변경 없음. import도 create 경유라 잘못된 rank 행을 실패로 보고.
- 선재 결함(무관): task test 12 실패(stale Makefile 테스트 — CLAUDE.md 명시).

## 미해결/UAT로 확인할 것 (자동 검증됨)
- 자동: 미존재 rank → AppError 단위 테스트 green, 커버리지 79.60%.
- 실제 HTTP에서 잘못된 rank로 POST/PATCH 시 400, import 잘못된 rank 행 실패 보고는 단위 검증 + 향후 수동 확인.
- (알려진 동작) positions 미구성 시 모든 rank 거부 — grade와 동일. positions는 task seed로 시드됨.
