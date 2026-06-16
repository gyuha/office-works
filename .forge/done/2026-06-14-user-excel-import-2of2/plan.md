<!-- forge-slug: user-excel-import-2of2 -->
<!-- task: 17 -->
<!-- tdd: off -->
<!-- part: 2/2 -->
# 사용자 Excel 일괄 등록 (2/2) — 프론트엔드 (members-list 업로드·템플릿)

## Goal / Non-goals
- Goal: 구성원 관리 화면(`/app/members-list`)에 **Excel 업로드**와 **템플릿 다운로드** 버튼을 추가한다. 템플릿 버튼 → `GET /users/import-template` 다운로드. 업로드 버튼 → 파일 선택 → `POST /users/import` 전송 → **결과 다이얼로그**("N명 생성 / M명 실패", 실패 행·사유 목록) → 목록·통계 갱신.
- Non-goals: 백엔드(1/2 part에서 완료 전제), 클라이언트 측 xlsx 파싱(서버가 파싱), 미리보기/dry-run, 업로드 진행률 스트리밍, 드래그앤드롭(단순 파일 선택이면 충분).

## Source of truth
- Glossary terms: none
- 선행: `user-excel-import-1of2`(백엔드 엔드포인트 — soft order, **먼저 완료 필요**: 클라이언트 재생성이 백엔드 OpenAPI에 의존).
- 기존 코드: `web/src/features/office/screens/members.tsx`(`MembersScreen` — 상단에 "구성원 추가"·"내보내기(export)" 버튼 영역, `exportUsersApiV1UsersExportGet` blob 다운로드 패턴 존재, `MemberAdd`/리스트). hey-api 생성 클라이언트 `web/src/client/`(ADR-0004), 생성 스크립트는 `web/package.json`의 openapi 생성 명령.
- Definition of Done: members-list 상단에 두 버튼 노출, 템플릿 버튼이 `.xlsx` 파일을 받아 저장, Excel 파일 업로드 시 결과 다이얼로그로 생성/실패(행·사유) 표시되고 목록·통계가 갱신되며, `pnpm typecheck && pnpm build` 통과 + 신규 코드 biome 신규 에러 0.

## Work slices
- [ ] S1. 클라이언트 재생성 — 백엔드(1/2)가 추가한 `/users/import`·`/users/import-template`를 포함하도록 `web/package.json`의 OpenAPI 생성 스크립트 실행(`openapi.json` 갱신 → `src/client/` 재생성). 신규 import/template 옵션·SDK 함수 생성 확인. — 완료기준: `src/client`에 import/import-template 관련 생성 코드 존재, `pnpm typecheck` 통과. (선행: 1/2 백엔드 완료)
- [ ] S2. 템플릿 다운로드 버튼 — members-list 헤더에 "템플릿 다운로드" 버튼 추가. 클릭 시 `import-template` 엔드포인트를 blob으로 받아(`exportUsers`의 blob 다운로드 패턴 재사용) `users_template.xlsx` 저장. — 완료기준: 버튼 클릭 시 .xlsx 파일 다운로드(수동). (depends: S1)
- [ ] S3. 업로드 버튼 + 전송 — "Excel 업로드" 버튼 + 숨김 `<input type="file" accept=".xlsx">`. 파일 선택 시 `POST /users/import`로 multipart 전송(useMutation). 성공/실패 토스트. — 완료기준: 파일 선택→업로드 요청 전송, 응답 수신(수동). (depends: S1)
- [ ] S4. 결과 다이얼로그 + 갱신 — 업로드 응답(`{created, failed:[{row,reason}]}`)을 다이얼로그로 표시(생성 수 + 실패 행 표: 행번호·사유). 성공 시 목록·통계 쿼리 invalidate로 갱신. — 완료기준: 정상+오류 혼합 파일 업로드 시 다이얼로그에 생성/실패 정확 표시, 목록 갱신(수동). (depends: S3)
- [ ] S5. 검증·정리 — `pnpm typecheck && pnpm build` 통과, 신규 코드 biome 신규 에러 0, 미사용 import 제거. 수동 UAT: 템플릿 다운로드→작성→업로드→결과 다이얼로그→목록 반영, 오류 행 보고, 권한(users:write) 없을 때 403 처리 메시지. — 완료기준: typecheck·build 통과 + 수동 체크리스트. (depends: S2, S4)
