<!-- forge-slug: org-settings-2of4-employment-types -->

# run — 조직 설정 ②/④ 고용 형태(employment types)

실행: 2026-06-07 · **직접 순차 실행** · 브랜치 `feat/org-employment-types`(`feat/org-positions` 위 stacked). 커밋 4개.

| 커밋 | 슬라이스 |
|------|----------|
| `b28ccf4` | S1 — employment_types 테이블 + 5종 시드 |
| `5e47ba9` | S2 — repository + service + 단위테스트(3) |
| `235d395` | S3 — `/api/v1/employment-types` router(org 집계) + 통합테스트(3) |
| `6f0a1d5` | S4 — EmpTypesTab 연동(hey-api) |

## What went as planned
- part 1(positions) 템플릿을 그대로 복제 — `domains/org/`에 EmploymentType 추가, 읽기=get_current_user/쓰기=org:write, 5종 시드, name UNIQUE. org 테스트 **16건 통과**(unit 9 + integration 7), 변경분 ruff/mypy clean, `pnpm typecheck` 0·`build` 성공.
- org/router를 positions+employment-types **집계 라우터**로 묶어 main 변경 없이 등록. `task gen-api`로 클라이언트 재생성. org:write는 admin role에 방어적 idempotent 시드.

## Divergences (계획 대비 실제)
- **[Medium · 해소] alembic 리비전 id varchar(32) 초과로 마이그레이션 롤백** — 첫 리비전 id `0004_employment_types_table_and_seed`(36자)가 alembic `alembic_version.version_num`(varchar 32)를 초과해 version UPDATE 실패 → 트랜잭션 롤백(DB가 0002로 되돌아가며 positions까지 일시 드롭). **id를 `0004_employment_types`(21자)로 줄여** 재적용, positions+employment_types 정상 복구·down/up 멱등 확인. **교훈: 리비전 id ≤32자.**
- **[정보] PATCH/rename·reorder 생략** — plan S3는 "POST·PATCH/{id}·DELETE"였으나 EmpTypesTab mock에 편집·순서변경 UI가 없어 **list/create/delete만** 구현(YAGNI, "요청 외 기능 금지"). API 대칭성 위해 rename이 필요해지면 후속.
- **[정보] 직접 순차 실행**(part 1과 동일 판단).

## On-the-spot 결정
- org/router/__init__를 부모 APIRouter로 만들어 position+employment 서브라우터를 include → main의 기존 `org_router` import 불변.
- 고용형태는 칩 UI라 sort_order는 생성 순(max+1)으로만 쓰고 reorder 없음.

## 자체 적대 검토 (positions near-clone, critical/high 0)
- org:write 게이트가 POST/DELETE에 적용(401/403 테스트 입증), 읽기는 get_current_user.
- 마이그레이션 0004 down은 employment_types만 drop(org:write는 0003 소유, 보존). down/up 재현.
- 중복 name create→ConflictError, 부재 delete→NotFoundError.

## 막힌 곳 / 미완
- **화면 클릭 UAT 미수행** — org 16테스트·typecheck·build 통과. 브라우저 검증은 계정 admin role 필요(미해결 부트스트랩, 반복).
- verified는 정적 게이트 + (part 1에서 확인된) 라이브 백엔드 패턴 기준.

## fg-learn 입력 후보
- **alembic 리비전 id ≤32자** 제약 — 새 교훈(retro). 향후 리비전 명명 가드.
- part 템플릿 복제가 빠름이 재확인됨(part 3·4도 동일).
- admin role 부트스트랩 미해결 — 3번째 작업 연속 UAT 차단(우선순위 ↑).
- PATCH/rename 미구현(API 비대칭) — 필요 시 후속.
