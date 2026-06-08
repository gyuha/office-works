<!-- forge-slug: org-settings-2of4-employment-types --> <!-- task: 6 --> <!-- tdd: off --> <!-- part: 2/4 --> <!-- priority: medium -->

# 조직 설정 ②/④ — 고용 형태(employment types) DB · API · 화면 CRUD

`/app/org` 설정 화면의 **고용 형태** 탭을 실 DB·API에 연결한다. 직급(part 1)과 동일 shape의 단순 리스트.

## 배경
- settings.tsx `EmpTypesTab`이 in-memory `string[]`로 추가/편집/삭제(순서변경 없음)를 구현.
- part 시리즈 2편. part 1이 세운 `domains/org/`·`org:write`를 재사용(soft order — part 1 미완 시에도 마이그레이션이 org:write를 idempotent 보장).

## Source of truth
- ADR-0004(hey-api 생성 클라이언트). part 1 `org-settings-1of4-positions`와 동일 패턴(템플릿으로 삼을 것).
- 기존 코드: `domains/org/`(part 1 산출, 없으면 이 part가 골격 생성), settings.tsx `EmpTypesTab`.
- 글로서리: fg-learn에서 `고용 형태(Employment type)` 등재.

## 확정된 결정
1. 도메인 `domains/org/`, 권한 읽기=get_current_user / 쓰기=`require_permission("org:write")`.
2. 엔티티 `employment_types`(id UUID, name String unique NOT NULL, sort_order int). mock에 reorder UI는 없으나 일관성 위해 sort_order 보유(표시는 생성 순).
3. 시드: mock 기본값(EmpTypesTab의 초기 배열 — 실행 시 settings.tsx에서 확인).
4. 중복 name UNIQUE. org:write/admin 연결 idempotent 보장.

## 슬라이스
### S1 — employment_types 스키마 + 마이그레이션(+org:write idempotent)
- `domains/org/models`에 `EmploymentType`. 신규 리비전: 테이블 + 기본값 시드 + org:write/admin 보장(idempotent).
- 완료: `task migrate` 성공, 시드 행 DB 확인.

### S2 — repository + service + 단위테스트
- list(ordered)/get/create/update/delete, 중복→ConflictError, 부재→NotFoundError.
- 완료: `pytest tests/org/`(unit) 통과.

### S3 — router(`/api/v1/employment-types`) + main + 통합테스트
- GET(get_current_user) / POST·PATCH/{id}·DELETE/{id}(org:write).
- 완료: integration 401/403/생성 라운드트립 통과.

### S4 — 화면 연동 (EmpTypesTab)
- `task gen-api` 재생성 → 생성 options로 EmpTypesTab 재배선(목록·추가·편집·삭제). invalidate+toast, 로딩/에러.
- 완료: typecheck/build/Biome clean.

## Non-goals
- 고용형태별 정책(근무시간·연차 차등) 연동.
- 다른 설정 탭.

## 리스크
- part 1과 거의 동일 — part 1 산출을 템플릿으로. org:write idempotent 시드로 독립 실행 가능.
