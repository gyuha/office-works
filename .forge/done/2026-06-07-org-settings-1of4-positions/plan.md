<!-- forge-slug: org-settings-1of4-positions --> <!-- task: 5 --> <!-- tdd: off --> <!-- part: 1/4 --> <!-- priority: high -->

# 조직 설정 ①/④ — 직급 체계(positions) DB · API · 화면 CRUD

`/app/org` 설정 화면의 **직급 체계** 탭(현재 mock)을 실제 DB·API에 연결한다. 직급은 낮은→높은 순서를 가진 관리 엔티티다.

## 배경
- `web/src/features/office/screens/settings.tsx`의 `RanksTab`이 in-memory `string[]`로 추가/편집/삭제/순서변경(이웃 swap)/중복방지를 이미 구현. 실 API 없음.
- 6개 설정 탭을 part-plan으로 분할한 시리즈의 1편(독립 출시 가능). 신규 `domains/org/` 도메인을 이 part가 처음 세운다.

## Source of truth
- `.forge/adr/0004-frontend-openapi-generated-client-heyapi.md` — 프론트는 hey-api 생성 클라이언트 사용. 이 part도 `task gen-api` 재생성 + 생성된 TanStack Query options로 연결.
- 기존 코드 계약: `api/src/domains/members/`(도메인 레이어 템플릿), `api/src/domains/auth/security.py`(`get_current_user`/`require_permission`), `api/src/main.py`(라우터 `/api/v1` 등록), `web/src/client/`(생성 클라이언트), `web/src/lib/api-client.ts`(인터셉터), settings.tsx `RanksTab`.
- 글로서리: 이 part 실행의 fg-learn에서 `직급(Position)`을 CONTEXT.md에 등재(관리되는 순서형 인사 등급 축, RBAC role·등급(Grade)과 무관).

## 확정된 결정 (그릴링)
1. **도메인**: 신규 `domains/org/`(router→service→repository→models + schemas). 이 part가 도메인 골격을 만든다.
2. **권한**: 읽기=`get_current_user`(인증된 누구나 — 구성원 폼 드롭다운 등에서 직급 목록 필요), 쓰기(생성·수정·삭제·순서변경)=`require_permission("org:write")`.
3. **org:write 시드**: 이 part의 마이그레이션이 `org:write` permission을 시드하고 기존 `admin` role에 연결(idempotent). admin role 한 번 부여로 members:write·org:write 모두 커버.
4. **엔티티**: `positions`(id UUID, name String unique NOT NULL, sort_order int NOT NULL). 표시 순서 = sort_order asc(낮은→높은).
5. **순서 변경**: 전체 정렬된 id 배열을 받아 sort_order 1..N 재할당하는 PATCH(예: `PATCH /positions/order`) — mock의 이웃 swap도 이 한 엔드포인트로 표현. (per-swap보다 단순·원자적)
6. **시드**: mock 기본 8개(사원·선임·책임·수석·실장·상무·전무·대표이사)를 sort_order 1..8로 시드.
7. **중복**: name UNIQUE(mock도 중복 방지).
8. **members.rank 무변경**: 자유 텍스트 유지, positions에 FK 걸지 않음(standalone). 연동은 별도 작업(non-goal).

## 슬라이스
### S1 — org 도메인 + positions 스키마 + 마이그레이션
- `domains/org/models/org_models.py`에 `Position`. `task revision`로 신규 리비전: positions 테이블 + `org:write` permission·admin role 연결 시드 + 직급 8개 시드(idempotent, 0001/0002 수정 금지).
- 완료: `task migrate` 성공, positions 8행·org:write·admin 연결 DB 확인.

### S2 — repository + service + 단위테스트
- `PositionRepository`(list ordered, get, create(append sort_order=max+1), update(rename), delete, reorder(id 배열→sort_order 재할당)), `PositionService`(중복 name→ConflictError, 부재→NotFoundError).
- 완료: `pytest tests/org/`(unit) — 생성 append, 중복 ConflictError, reorder 후 순서, delete. 통과.

### S3 — router(`/api/v1/positions`) + main 등록 + 통합테스트
- GET(목록, get_current_user) / POST·PATCH/{id}·DELETE/{id}·PATCH order(require_permission("org:write")). main 등록.
- 완료: integration — 미인증 401, org:write 없는 인증유저 쓰기 403, admin 생성→목록 반영→reorder 반영. 통과.

### S4 — 화면 연동 (RanksTab)
- `task gen-api` 재생성 → 생성된 query/mutation options로 `RanksTab` 재배선: 목록·추가·인라인 편집·삭제·순서변경(↑↓). 성공 시 invalidate + toast. 로딩/에러 상태.
- 완료: `pnpm typecheck` 0·`build` 성공·변경분 Biome clean. (런타임 확인은 UAT)

## Non-goals
- members.rank를 positions FK로 전환(standalone 유지).
- 다른 설정 탭(고용형태·등급·근무·연차·회사정보) — 후속 part.
- 직급별 권한/급여 등 부가 속성.

## 리스크
- org:write 시드/ admin 연결 idempotent(재실행 안전). 시리즈 후속 part도 org:write를 idempotent하게 보장(part 독립성 — soft order).
- Python 3.14 표준(이전 작업에서 정합 완료), `task gen-api` 흐름 ADR-0004.
