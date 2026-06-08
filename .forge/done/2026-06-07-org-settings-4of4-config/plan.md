<!-- forge-slug: org-settings-4of4-config --> <!-- task: 8 --> <!-- tdd: off --> <!-- part: 4/4 --> <!-- priority: medium -->

# 조직 설정 ④/④ — 근무 기본값 · 연차 설정 · 회사 정보 (싱글톤 config)

`/app/org`의 **근무 기본값 / 연차 설정 / 회사 정보** 탭을 실 DB·API에 연결한다. 셋 다 "단일 레코드를 불러와 저장"하는 config shape.

## 배경
- settings.tsx `WorkTab`(start/end/lunchStart/lunchEnd/breakMin), `LeaveTab`(defaultDays/probDays/addPerYear/maxAdd/expiryMonths), `CompanyTab`(name/bizNo/ceo/founded/tel/email/addr) — 모두 in-memory 스칼라/폼.
- part 시리즈 4편(마지막). 리스트가 아니라 **싱글톤 설정**이라 GET/PUT 패턴.

## Source of truth
- ADR-0004. 기존: `domains/org/`, settings.tsx 3개 탭, part 1 패턴.
- 글로서리: fg-learn에서 `근무 기본값`·`연차 설정`·`회사 정보`(조직 단일 설정 레코드) 등재(필요 시).

## 확정된 결정
1. 도메인 `domains/org/`, 권한 읽기=get_current_user / 쓰기=`require_permission("org:write")`.
2. **3개 타입드 싱글톤 테이블**(key-value 일반화 대신 명시 스키마): `work_settings`·`leave_settings`·`company_info`. 각 1행(없으면 시드 기본값). 키-값 제너릭은 타입 안전성 떨어져 기각.
3. API: 각 리소스 `GET`(현재 값, 없으면 기본값)·`PUT`(전체 교체). 예: `/api/v1/org/work-settings`, `/org/leave-settings`, `/org/company`.
4. 시드: mock 초기값으로 각 테이블 1행 시드.

## 슬라이스
### S1 — 3개 싱글톤 스키마 + 마이그레이션 + 시드
- `domains/org/models`에 `WorkSettings`/`LeaveSettings`/`CompanyInfo`(각 단일 행 + 타입드 컬럼). 신규 리비전 + 기본값 시드 + org:write idempotent.
- 완료: `task migrate` 성공, 각 1행 DB 확인.

### S2 — repository + service + 단위테스트
- 각 리소스 get(없으면 기본)/put(upsert). 검증(시간 형식·음수 방지 등 Pydantic).
- 완료: `pytest tests/org/`(unit) — get 기본값, put 후 반영. 통과.

### S3 — router + main + 통합테스트
- 3개 리소스 GET(get_current_user)/PUT(org:write). main 등록.
- 완료: integration 401/403/PUT→GET 라운드트립 통과.

### S4 — 화면 연동 (WorkTab·LeaveTab·CompanyTab)
- `task gen-api` 재생성 → 3개 탭을 GET으로 로드·폼 prefill, 저장 시 PUT + invalidate + toast. 로딩/에러.
- 완료: typecheck/build/Biome clean.

## Non-goals
- 근무/연차 설정을 실제 근태·휴가 계산 로직에 연동(표시·저장만).
- 회사 정보 다국어/로고 업로드.
- 다중 회사(테넌트) — 단일 싱글톤 가정.

## 리스크
- 싱글톤 보장(항상 1행) — get-or-create 또는 시드 1행 + put이 그 행 갱신. 동시성 낮아 단순 처리.
