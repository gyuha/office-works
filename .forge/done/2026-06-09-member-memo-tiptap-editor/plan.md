<!-- forge-slug: member-memo-tiptap-editor --> <!-- task: 10 --> <!-- tdd: off --> <!-- priority: medium -->

# 구성원 메모란 추가 + Tiptap을 프로젝트 표준 에디터로 도입

## Source of truth (근거)
- **ADR-0007** — Tiptap을 표준 리치텍스트 에디터로 채택, HTML 저장 + 렌더 sanitize (이 작업이 그 첫 적용).
- **ADR-0004** — 프론트 API 클라이언트는 `api/openapi.json`에서 hey-api로 생성. 손편집 금지, `task gen-api`로 재생성.
- **ADR-0005** — `users`의 HR 필드는 이름/문자열 컬럼으로 두는 패턴(메모도 동일하게 단순 Text 컬럼).
- `CLAUDE.md`(루트/api) — Pydantic v2 DTO, async 일관성, AppError 계층, Alembic 신규는 `task revision`/수기 번호, 커버리지 70%, Biome 규약.

## Goal / Definition of Done
구성원 추가·편집 화면에서 **메모**를 리치텍스트(Tiptap)로 입력하고, 저장 후 상세 화면에서 서식이 보존된 채(sanitize됨) 다시 볼 수 있다. Tiptap은 재사용 공용 컴포넌트로 확립되어 이후 리치텍스트의 표준 진입점이 된다.

검증(UAT): 구성원 추가 → 메모에 굵게/목록 등 서식 입력 → 저장 → 상세에서 서식 그대로 표시 → 편집 진입 시 기존 메모가 에디터에 로드됨. `task lint && task test` 통과(커버리지 ≥70%), `pnpm typecheck` + `pnpm lint`(신규/변경 파일) 통과.

## Work slices

### S1 — 백엔드: users.memo 컬럼 + 마이그레이션
`auth_models.py`의 `User`에 `memo: Mapped[str | None]`(Text, nullable) 추가. 수기 Alembic 리비전 `0011_user_memo`(down_revision `0010_user_employment_type`, revision id ≤32자) 작성 — `users`에 `memo` TEXT nullable add/drop.
**완료 기준:** `task migrate` 성공, `users.memo` 컬럼 존재. `task revision`이 추가 변경을 잡지 않음(드리프트 없음).

### S2 — 백엔드: 스키마 + 서비스/리포 배선  `depends: S1`
`user_schemas.py`의 `UserCreate`/`UserUpdate`에 `memo: str | None`(둘 다 **선택**, nullable), `UserResponse`에 `memo: str | None` + `_name_from_display_name` 매핑에 추가. `user_directory_service.create` / `user_directory_repository.create`에 `memo` 전달. 깨지는 기존 테스트 fake(`_FakeUser`, fake repo create)·픽스처 보정.
**완료 기준:** `task test-unit`의 users 단위 테스트 통과, `UserResponse`에 memo 노출. mypy/ruff 통과.

### S3 — 클라이언트 재생성  `depends: S2`
루트 `task gen-api`로 `openapi.json` export + hey-api codegen 재생성. `web/src/client/types.gen.ts`의 `UserCreate`/`UserUpdate`/`UserResponse`에 `memo` 반영 확인(생성물 손편집 금지).
**완료 기준:** `grep memo web/src/client/types.gen.ts`가 세 타입에서 매칭.

### S4 — 프론트: Tiptap 의존성 + 공용 에디터 컴포넌트  (백엔드와 병렬 가능)
`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `isomorphic-dompurify`(또는 동급 sanitizer) 설치. `web/src/components/ui/rich-text-editor.tsx` 작성 — 헤드리스 Tiptap 편집 컴포넌트(props: value HTML, onChange) + 기본 서식 툴바(굵게/기울임/밑줄/취소선, 글머리·번호 목록, 제목). 같은 파일 또는 인접에 **읽기 전용 sanitized 렌더 헬퍼**(`RichTextView`: HTML→sanitize→표시) 제공. Biome 규약(2 spaces/100자/single quote, kebab-case 파일명) 준수.
**완료 기준:** `pnpm typecheck` 통과, 컴포넌트가 서식 입력/출력 HTML을 정상 처리(로컬 확인), sanitize가 `<script>` 등 위험 태그 제거.

### S5 — 프론트: 구성원 폼에 메모 필드 배선  `depends: S3, S4`
`members.tsx`의 공용 `MemberForm`(추가·편집 공용)에 `EditField label="메모"` + `RichTextEditor` 추가. `form` state에 `memo`(초기값 `initial?.memo ?? ''`), 전폭(`sm:col-span-2`) 배치. 추가/편집 모두 저장 body에 `memo` 포함.
**완료 기준:** 구성원 추가·편집 화면에 에디터 표시, 입력 후 저장 시 `memo` 전송·영속, 편집 진입 시 기존 메모 로드.

### S6 — 프론트: 상세 화면 메모 표시  `depends: S3, S4`
`MemberDetail`의 `<dl>`에 `Field label="메모"`(colSpan) 추가 — `RichTextView`로 sanitize된 HTML 읽기 전용 렌더. 메모 없으면 빈/placeholder 처리.
**완료 기준:** 상세 화면에 메모가 서식 보존된 채 표시, 빈 메모도 깨지지 않음.

## Non-goals (이번에 안 함)
- `approval.tsx` / `projects.tsx`의 기존 `execCommand` 에디터를 Tiptap으로 마이그레이션 — **별도 후속 작업**(ADR-0007이 방향만 확정).
- 구성원 **목록 테이블**에 메모 컬럼 노출, 메모 검색/필터.
- 메모 내 **이미지 업로드·파일 첨부·멘션·협업 편집**.
- 직전 작업에서 누락된 상세 화면의 **고용형태(employment_type) 필드 보정** — 별개 갭(원하면 별도 작업).
- 메모 변경 이력/감사 로그.

## 메모 (참고)
- 메모 작성자=`users:write` 권한 관리자, 표시 대상=관리자 → XSS 위험 표면은 제한적이나 저장형 XSS 방어로 렌더 sanitize는 필수(S4/S6).
- StarterKit에 underline 미포함 → `@tiptap/extension-underline` 별도 추가(S4).
- 마이그레이션 번호는 직전 `0010_user_employment_type` 다음인 `0011`. revision id 문자열 ≤32자 주의(api/CLAUDE.md).
