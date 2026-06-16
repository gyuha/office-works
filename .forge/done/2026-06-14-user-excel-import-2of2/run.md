<!-- forge-slug: user-excel-import-2of2 -->
# run.md — 사용자 Excel 일괄 등록 (2/2) 프론트엔드

실행일: 2026-06-14 · 실행 방식: 직접 순차 실행(Part 1 백엔드 완료 후)

## 계획대로 된 것
- **S1 클라이언트 재생성** — `task gen-api`(openapi.json export → hey-api codegen)로 `importUsersApiV1UsersImportPostMutation`·`importTemplateApiV1UsersImportTemplateGet`·`UserImportResult`/`BodyImportUsers...{file: Blob|File}` 생성 확인.
- **S2 템플릿 다운로드 버튼** — members-list 헤더에 "템플릿" 버튼(FileDown). `importTemplate...Get({parseAs:'blob'})` → `users_template.xlsx` 저장(exportUsers blob 패턴 재사용).
- **S3 업로드 버튼 + 전송** — "Excel 업로드" 버튼 + 숨김 `<input type="file" accept=".xlsx">`(ref). 파일 선택 → `importUsers...Mutation` multipart 전송(`body:{file}`), pending 중 "업로드 중…", 같은 파일 재선택 위해 value 리셋.
- **S4 결과 다이얼로그 + 갱신** — 응답 `{created, failed:[{row,reason}]}`을 shadcn Dialog로 표시(생성 수 + 실패 행/사유 테이블). onSuccess에서 `queryClient.invalidateQueries()`로 목록·통계 갱신, 성공/부분실패 토스트.
- **S5 검증** — `pnpm typecheck` 통과, `pnpm build` 성공, members.tsx biome 신규 에러 0.

## 분기(Divergence)
- 없음 — 계획 5슬라이스대로.

## 현장 결정(설계 판단)
- **invalidate = 전체** — 기존 MembersScreen의 `refresh()`와 동일하게 `queryClient.invalidateQueries()`로 목록+통계 한 번에 갱신(특정 키 import 불필요).
- **에러 토스트에 권한 힌트** — 업로드 실패(403 등) 시 "권한 또는 파일 형식 확인" 안내(org:write 미부여 케이스 대비).
- **버튼 배치** — 헤더 우측에 템플릿 / Excel 업로드 / 내보내기 / 구성원 추가 순. 업로드·내보내기는 outline, 추가는 primary 유지.

## 코드 리뷰 메모
- 변경: `api/openapi.json`(재생성), `web/src/client/*`(재생성 — 손편집 아님), members.tsx(import + 상태/핸들러/뮤테이션 + 버튼 + 결과 다이얼로그). 격리된 UI + 생성 클라이언트. auth/데이터모델 무관.

## 미해결/UAT로 확인할 것
- 템플릿 버튼 클릭 → `users_template.xlsx` 다운로드, 열어서 헤더 6컬럼 확인.
- 템플릿에 정상+오류(누락/잘못된 이메일/중복) 행 작성 → Excel 업로드 → 결과 다이얼로그에 "N명 등록 / M건 실패(행·사유)" 표시.
- 성공 시 목록·통계 갱신 반영.
- 권한(users:write/admin) 없을 때 403 → 에러 토스트(권한 안내). ※ grant_admin.py로 admin 부여 시 정상 등록 확인.
- 같은 파일 재업로드 가능(value 리셋), 비-xlsx 업로드 시 400 처리.
