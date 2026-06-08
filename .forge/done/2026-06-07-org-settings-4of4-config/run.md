<!-- forge-slug: org-settings-4of4-config -->

# run — 조직 설정 ④/④ 근무·연차·회사정보 (config 싱글톤)

실행: 2026-06-07 · **직접 순차 실행** · 브랜치 `feat/org-config`. 커밋 4개. org 시리즈 마지막(저위험 — members 미연관).

| 커밋 | 슬라이스 |
|------|----------|
| `5f3b35f` | S1 — work/leave/company 싱글톤 테이블 + 1행 시드 |
| `e33b67f` | S2 — 제네릭 SingletonRepository + 3 service + 단위테스트 |
| `9b6a7ef` | S3 — `/api/v1/org/*` config 라우트 + 통합테스트 |
| `4f69484` | S4 — WorkTab/LeaveTab/CompanyTab 연동 |

## What went as planned
- 확정 결정대로: 3개 타입드 싱글톤 테이블(각 1행), GET(get_current_user)/PUT(org:write), mock 기본값 시드. org 테스트 **20+ → 전체 통과**(unit + integration), 변경분 ruff/mypy clean, typecheck/build OK, 0006 down/up 멱등.
- 제네릭 `SingletonRepository[T]`(PEP 695)로 3 리소스 공통화. 프론트 3개 탭은 GET prefill(useEffect 동기) + PUT 저장 + invalidate.
- 통합테스트: 401/403/work·company PUT→GET 라운드트립(+시드 복원).

## Divergences (계획 대비 실제)
- **[정보] ruff UP046 → PEP 695 제네릭** — `Generic[T]`/`TypeVar` 대신 `class SingletonRepository[T: (...)]` 신문법 사용(3.14 환경). mypy `_model: type[T]` 명시 어노테이션 추가.
- **[정보] 회사정보 폼 키 매핑** — 프론트 폼은 camel(bizNo/addr), API는 snake(biz_no/address). 탭에서 양방향 매핑.
- **[정보] 직접 순차 실행.**

## On-the-spot 결정
- 싱글톤은 시드 1행 + get(LIMIT 1)/put(그 행 update). 행 부재 시 NotFoundError(시드로 항상 존재).
- 프론트 controlled input은 useState 기본값 + `useEffect([q.data])`로 서버값 동기.
- 통합테스트가 싱글톤을 수정하므로 테스트 끝에 시드 기본값으로 PUT 복원(다음 테스트/dev 영향 최소화).

## 막힌 곳 / 미완
- **화면 클릭 UAT 미수행** — org 전체 테스트·typecheck·build 통과. 브라우저(3개 탭 저장→재로드) 검증은 계정 admin role 필요(미해결 부트스트랩, 5연속).
- verified는 정적 게이트 + 라이브 백엔드 기준.

## fg-learn 입력 후보
- **org 시리즈(part 1~4) 완주** — 직급·고용형태·등급·config 4개 설정 도메인 완성. 시리즈 회고로 패턴 정리 가능.
- 제네릭 SingletonRepository(PEP 695) 패턴 — 향후 단일 설정 레코드에 재사용.
- **admin role 부트스트랩 미해결 5연속** — org 시리즈 끝났으니 이제 이걸 다음 작업 1순위로.
- `.forge/codebase/*` 맵 stale — fg-map 재실행(org 도메인 신설 반영).
