<!-- forge-slug: validate-rank-against-positions -->
<!-- task: 21 -->
<!-- tdd: on -->
# 직급(rank) 검증을 positions 체계에 대조 (grade와 일관)

## Goal / Non-goals
- Goal: 구성원 생성/수정 시 `rank`(직급)가 `positions`(직급 체계) 테이블에 존재하는 이름인지 **앱레벨 검증**한다(없으면 400) — grade의 `_validate_grade` 패턴을 그대로 따른다. 이름 문자열 저장은 유지(물리 FK 아님, ADR-0005 정신). 검증은 create/update 양쪽 + import(create 재사용)에 자동 적용.
- Non-goals: department 검증(teams 백엔드 부재 — 보류), 물리 FK 승급, positions rename-cascade/삭제차단(grade에는 있으나 이번 범위는 검증만), users.rank → positions FK 마이그레이션, 프론트 변경(폼은 이미 positions 드롭다운), 기존 시드 user의 rank 보정.

## Source of truth
- Glossary terms: none (직급/positions 기존 개념)
- Related ADRs: `.forge/adr/0005-member-grade-name-reference-not-fk.md` (이름 문자열 + 앱 검증 패턴 — rank에 동일 적용)
- 기존 코드: `UserDirectoryService._validate_grade`(create L83·update L117에서 호출), `UserDirectoryRepository.grade_exists`(raw SQL로 `grades` 테이블 조회 — 도메인 순환 회피). positions는 `domains/org`의 position 테이블/리포지토리. `rank`는 `UserCreate`에서 필수(min_length=1), `UserUpdate`에서 optional.
- Definition of Done: 존재하지 않는 rank로 user 생성/수정 시 400(AppError), 유효 rank는 통과. import도 잘못된 rank 행을 실패로 보고(create 경로 공유). `task lint`(ruff+mypy)·`task test`(커버리지 70%) 통과. positions 테이블이 비어있으면 모든 rank가 거부되는 점은 grade와 동일한 알려진 동작(positions는 `task seed`로 시드됨).

## Work slices
- [ ] S1. repo `position_exists` — `UserDirectoryRepository`에 `grade_exists`와 동형의 `position_exists(name: str) -> bool` 추가(positions 테이블 이름 대조, raw SQL로 org 도메인 순환 회피). — 완료기준: 메서드 추가, mypy 통과.
- [ ] S2. service `_validate_rank` (TDD) — `UserDirectoryService`에 `_validate_rank`(positions에 없으면 `AppError(f"Unknown rank '{rank}'.")`) 추가. `create`에서 `_validate_grade` 옆에서 호출(rank 필수라 항상). `update`에서 rank 변경 시(`new_rank = changes.get("rank")`) 검증. fake repo에 `position_exists` 추가해 단위 테스트(유효 rank 통과·미존재 rank → AppError·update rank 변경 검증). — 완료기준: 서비스 단위 테스트 통과(create/update 유효·무효 rank). (depends: S1)
- [ ] S3. 검증·정리 — 변경 파일 ruff·mypy strict 통과, `task test`(커버리지 70%) 통과. 기존 user 생성 테스트가 시드/유효 rank를 쓰는지 확인(없으면 positions 시드 또는 fake repo 보정). — 완료기준: lint·test 통과. (depends: S2)
