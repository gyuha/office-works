# run — 구성원 메모란 추가 + Tiptap 도입 (실행 기록)

실행 방식: **인라인 직접 실행**(Dynamic Workflow 대신). 의존성이 거의 직렬이고 S5·S6가 같은 `members.tsx`를 편집해 병렬 이득이 없고 파일 충돌 위험이 있어, fg-run의 "단일 에이전트로 충분하면 워크플로우 생략" 지침에 따라 인라인 선택.

## 계획대로 된 것
- **S1** `users.memo` Text(nullable) 컬럼 + 수기 마이그레이션 `0011_user_memo`(down `0010_user_employment_type`). `task migrate` 성공, autogenerate 드리프트 체크에서 memo 관련 변경 없음(모델 일치).
- **S2** `UserCreate`/`UserUpdate`(memo optional, `max_length=100000`), `UserResponse`(memo) + `_name_from_display_name` 매핑, service/repo create 배선. 테스트 fake(`_FakeUser`, fake repo create) 보정.
- **S3** `task gen-api` 재생성 → `types.gen.ts`의 UserCreate/Update/Response에 memo 반영.
- **S4** Tiptap v3 의존성 설치 + 공용 `components/ui/rich-text-editor.tsx`(`RichTextEditor` 편집 + `RichTextView` sanitize 읽기전용). 기본 서식 툴바(B/I/U/취소선/목록/제목/본문).
- **S5** `MemberForm`(추가·편집 공용)에 메모 `RichTextEditor` 전폭 배치 + form state `memo`.
- **S6** `MemberDetail`에 메모 `RichTextView`(sanitized) colSpan Field 추가.

## 분기 (계획 vs 실제)
1. **`@tiptap/extension-underline` 미설치(계획에서 제거).** 계획(S4)은 v2 가정으로 underline 별도 설치를 명시했으나, 설치된 **Tiptap v3 StarterKit이 Underline·Strike·Link를 이미 포함**(Context7로 확인). 별도 패키지는 불필요해 설치 후 제거. → ADR-0007의 "StarterKit에 underline 미포함" 주석은 v2 기준이었음(실 구현은 v3, 불필요).
2. **조건부 코드리뷰 수행 + 인런 수정 2건.** 마이그레이션·API 계약·XSS 표면(dangerouslySetInnerHTML)을 건드려 적대적 리뷰 1회 실행. 실질 결함 2건을 같은 실행에서 수정·재검증:
   - **[high] Tiptap 빈 메모 동기화 미수렴** — 동기화 useEffect가 `value !== editor.getHTML()`로 비교해 빈 메모(`'' vs '<p></p>'`)에서 영원히 불일치 → 매 렌더 setContent 재실행 + 입력 중 커서 점프. `editor.isEmpty ? '' : getHTML()`로 정규화 비교하도록 수정(onChange와 동일 기준).
   - **[medium] 링크 reverse-tabnabbing** — StarterKit v3 autolink로 생성된 `<a>`에 DOMPurify 기본값이 `rel` 미추가. 모듈 1회 등록 `afterSanitizeAttributes` 훅으로 모든 앵커에 `rel="noopener noreferrer"` 강제.
   - 테스트 공백 보완: 백엔드 memo 왕복 단위테스트 2건 추가(memo 영속·에코, 미입력 시 None).

## 미수정(기록만) — fg-learn/후속 후보
- **[low] 프론트 길이 가드 부재** — 백엔드 `max_length=100000`(HTML 기준) 초과 시 422 + 일반 토스트("저장에 실패했습니다")로 원인 불명. 에디터에 길이 제한/안내 없음.
- **[low/기존] 풀폼 PATCH가 `exclude_unset` 무력화** — `MemberForm`이 편집 시 전체 form을 PATCH body로 전송 → 서버의 부분수정 의도가 사실상 무효(마지막 저장이 전체 행 덮어씀), 빈 메모는 NULL이 아닌 `''`로 저장. **memo 도입 이전부터 모든 필드에 존재하던 패턴**이라 이번 범위 밖. 별도 작업 후보.
- **프론트 테스트 러너 부재** — web에 test 스크립트 없음 → RichTextView sanitize(스크립트 제거)·빈 동기화에 대한 프론트 자동 테스트 불가. 백엔드 왕복 테스트로 데이터 흐름만 커버.
- **sanitize는 렌더(RichTextView)에서만** 수행 — 저장은 원본 HTML. memo를 RichTextView를 거치지 않고 HTML 컨텍스트로 렌더하는 미래 소비자(CSV/메일/리포트)는 보호되지 않음. 현재 export 경로는 memo HTML을 HTML 컨텍스트로 내보내지 않음(미검증 — 후속 확인 권장).

## 사전 존재(이번 작업 무관, git stash로 확인)
- **`task lint` 실패** — ruff 9건(`tests/auth/conftest.py`, `tests/auth/test_auth_flows.py` 8건 + `tests/users/test_user_service.py:15` import-order 1건). HEAD에 stash 후에도 동일 9건 → 사전 부채. 내 src 변경은 ruff+mypy clean, 내 테스트 편집은 신규 ruff 에러 0건.
- **stale Makefile 테스트 12건 실패**(`test_dev_server.py`, `test_migrations.py`) — 프로젝트 CLAUDE.md에 명시된 사전 실패.

## 검증 요약
- 백엔드: `task test` → **671 passed, 커버리지 77.96%**(≥70). 신규 memo 단위테스트 2건 포함. mypy/ruff(변경 src) clean.
- 프론트: `pnpm typecheck` ✓, `pnpm biome`(변경 파일) ✓, `pnpm build` ✓(Tiptap 번들 정상; chunk 크기 경고는 사전 존재 권고성).
- 마이그레이션: `task migrate`로 0011 라이브 적용, `users.memo` 컬럼 확인.
