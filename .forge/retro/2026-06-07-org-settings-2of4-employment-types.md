# 2026-06-07 — 조직 설정 ②/④ 고용 형태(employment types) DB·API·화면 CRUD

## Plan vs actual

- **What went as planned**:
  - part 1(positions) 템플릿을 그대로 복제해 직접 순차 실행, 4커밋(`b28ccf4` 스키마+시드 · `5e47ba9` repo/service+단위3 · `235d395` router+통합3 · `6f0a1d5` EmpTypesTab 연동). org 테스트 **16건 통과**, 변경분 ruff/mypy clean, `pnpm typecheck` 0·`build` 성공.
  - org/router를 positions+employment-types 집계 라우터로 묶어 main 변경 없이 등록. org:write는 admin role에 방어적 idempotent 시드. `task gen-api` 재생성. 라이브 `/employment-types` 401 게이트 확인.
- **Divergences**:
  - **[Medium · 해소] alembic 리비전 id가 varchar(32) 초과로 마이그레이션 롤백** — 첫 id `0004_employment_types_table_and_seed`(36자)가 `alembic_version.version_num`(varchar 32)을 넘겨 version UPDATE가 `StringDataRightTruncation`으로 실패 → 트랜잭션 롤백(DB가 0002로 되돌아가 positions 일시 드롭). id를 `0004_employment_types`(21자)로 줄여 재적용·복구, down/up 멱등 확인.
  - **[정보] PATCH/rename·reorder 생략** — EmpTypesTab mock에 편집·순서 UI가 없어 list/create/delete만 구현(YAGNI). plan S3가 PATCH를 언급했으나 미구현(API 비대칭).
  - **[정보] 직접 순차 실행**(part 1과 동일).

## Learnings

- **Do differently next time**:
  - **★ alembic 리비전 id는 ≤32자로 지을 것 — `alembic_version.version_num`이 varchar(32)다.** 길면 upgrade의 version UPDATE가 truncation으로 실패하고 트랜잭션 전체가 롤백돼, 같은 체인의 앞 리비전(positions)까지 일시적으로 사라진다. 파일명은 길어도 무방하나 파일 안의 `revision = "..."` 값이 핵심. **api/CLAUDE.md 주의사항에 등재함**(다음 사람 재발 방지).
  - **part 템플릿 복제는 정말 빠르다 — part 3·4도 동일 골격 재사용.** domains/org 레이어 + org:write idempotent 시드 + 집계 라우터 + gen-api + 탭 배선. 단 part 3(등급)은 sealed members 연동이라 복제만으로 안 되고 추가 주의 필요.
  - **admin role 부트스트랩 미해결이 3연속(members-list·positions·employment-types) UAT를 막았다 — 더는 미루지 말 것.** 정적 게이트로 verified:yes는 받지만 브라우저 쓰기 검증은 매번 불가. env `ADMIN_EMAILS` 부트스트랩을 독립 작업으로 빼는 것을 강하게 권장(우선순위 ↑).
  - (정보) UI에 없는 동작(rename)을 API에 미리 만들지 않은 건 YAGNI상 옳았다 — 필요해지면 그때.

## Doc updates
- CONTEXT.md promotion: **`고용 형태(Employment type)` 신규 등재** — 관리되는 고용 유형 목록(employment_types), 직급·등급과 같은 조직 설정 축, members와 FK 미연결.
- api/CLAUDE.md: **alembic 리비전 id ≤32자 제약 추가**(기존 "0001 하나뿐" stale 문구를 갱신하며). 재발 방지 관행.
- ADR added: **none** — 리비전 id 길이는 관행(되돌리기 쉽고 트레이드오프 아님), domains/org·org:write는 part 1에서 이미 확립.

## 후속 작업 후보 (fg-cleanup 후 fg-ask 대상)
1. **admin role 부트스트랩** (env ADMIN_EMAILS 등) — 3연속 UAT 차단, **최우선**.
2. part 3(등급 ⚠️)·4(config) — backlog 대기.
3. employment-types/positions에 PATCH rename이 필요해지면 API 보강(현재 비대칭).
4. `.forge/codebase/*` 맵 stale(Python 3.12 등) — fg-map 재실행.
