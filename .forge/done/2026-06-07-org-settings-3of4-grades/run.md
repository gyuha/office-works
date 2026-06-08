<!-- forge-slug: org-settings-3of4-grades -->

# run — 조직 설정 ③/④ 등급 체계(grades) DB 승격 + members 연동

실행: 2026-06-07 · **직접 순차 실행** · 브랜치 `feat/org-grades`(`feat/org-employment-types` 위 stacked). 커밋 4개. **시리즈 최대 리스크 — sealed members 광범위 연동.**

| 커밋 | 슬라이스 |
|------|----------|
| `341031f` | S1 — grades 테이블 + 4종 시드(색·설명) |
| `9427baa` | S2 — grade repo/service + members.grade 검증 전환(Literal→grades lookup) |
| `85d9f2b` | S3 — `/api/v1/grades` router + members.grade varchar(16) widen |
| `2e8b1de` | S4 — GradesTab CRUD + members.tsx 동적 등급 |

## What went as planned
- 재그릴링 확정 결정대로: 등급=관리 테이블(name/color/bg/border/desc/sort), members.grade는 이름 String 유지 + grades 검증 + **rename cascade**, **참조 중 삭제 차단(409)**, 프론트 **완전 동적**(GRADE_CFG/GRADES 제거 → GET /grades inline hex).
- org/members 테스트 **41 passed**(unit + integration), 변경분 ruff/mypy clean, `pnpm typecheck` 0·`build` 성공. 마이그레이션 0005 down/up 멱등.
- 통합테스트로 핵심 검증: rename이 member.grade로 cascade·참조 중 등급 delete 409·잘못된 grade로 member 생성 거부·reorder. **members 회귀 없음**.
- import 순환(members↔org) 회피: 교차 도메인 접근(grade_exists, count/cascade members)을 전부 **raw SQL**로.

## Divergences (계획 대비 실제)
- **[Medium · 해소] members.grade가 varchar(8)이라 긴 등급명 cascade 실패** — 원래 grade 컬럼은 고정 4값(2자)용 varchar(8)였는데, 관리 등급명은 최대 16자라 rename cascade가 `StringDataRightTruncation`. 통합테스트가 잡아냄. **0005에 `members.grade → varchar(16)` ALTER 추가**(+Member 모델 String(16)), down은 역변환. 이 task의 마이그레이션이라 0005를 직접 보강(downgrade→edit→upgrade).
- **[정보] members API 계약 거의 불변** — grade가 Literal enum→str로 완화됐을 뿐(요청/응답 필드명·타입 호환). hey-api 생성 타입은 enum→string으로만 변화, members.tsx는 색 소스만 동적화.
- **[정보] PATCH가 grade엔 존재**(rename+meta) — positions/employment과 달리 grade는 편집 UI가 있어 update 구현(API 대칭).
- **[정보] 직접 순차 실행.**

## On-the-spot 결정
- grade 검증/연동의 교차 도메인 터치를 raw SQL로(import cycle 회피). member repo `grade_exists`, grade repo `count_members_with_grade`/`cascade_rename_members`.
- members.tsx 동적화: `useGrades()` 훅(react-query 캐시 공유) + `gradeStyleOf(name)`(미지 등급 회색 fallback). GradeTag/필터칩/분포카드/폼 select 전부 inline hex.
- 잘못된 grade는 `AppError`(400)로 — 기존 NotFound/Conflict와 구분.

## 자체 적대 검토 (sealed members 연동 — 집중 검증, critical/high 0)
- members 회귀: 기존 member unit+integration 전부 통과(grade가 시드된 4값이라 검증 통과). 잘못된 grade 거부 테스트 추가.
- rename cascade는 같은 트랜잭션(세션 flush)·통합테스트로 member.grade 변경 확인. 참조 중 삭제 409 확인.
- grade 게이트(org:write) POST/PATCH/DELETE 적용, 읽기는 get_current_user. /order 정적 경로 우선.
- 프론트 fallback로 미지 등급도 안전 렌더(깨지지 않음).

## 막힌 곳 / 미완
- **화면 클릭 UAT 미수행** — org/members 41테스트·typecheck·build 통과. 브라우저(등급 CRUD + members 등급 표시) 검증은 계정 admin role 필요(미해결 부트스트랩, 4연속).
- verified는 정적 게이트 + 라이브 백엔드 기준.

## fg-learn 입력 후보
- **글로서리: `등급(Grade)` 정의를 "고정 enum" → "관리 테이블"로 개정** 필요(members.grade는 이름 참조·rename cascade·삭제 차단).
- sealed 작업의 컬럼 폭 제약(varchar(8))이 확장 시 함정 — "고정 enum→관리 목록" 전환 시 참조 컬럼 폭도 함께 넓혀야.
- admin role 부트스트랩 미해결 4연속 — 더 미루면 안 됨.
- 교차 도메인 무결성을 raw SQL로 처리한 패턴(순환 회피) — 재사용 가능.
