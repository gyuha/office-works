# 프론트엔드 API 클라이언트를 OpenAPI에서 hey-api로 생성

## Status
accepted

## 결정
프론트엔드(`web/`)가 FastAPI 백엔드를 호출할 때, 클라이언트를 **수동 작성하지 않고 `@hey-api/openapi-ts`로 OpenAPI 스펙에서 생성**한다.

- **스펙 소스**: 라이브 `:8000/openapi.json`이 아니라 **커밋된 스냅샷 `api/openapi.json`**. FastAPI `app.openapi()`로 오프라인 export(서버 기동 불필요).
- **생성물 위치/관리**: `web/src/client/`에 생성하고 **git에 커밋**(빌드 자족·diff 가시성). Biome는 이 디렉터리를 무시하고 손편집 금지.
- **TanStack Query 플러그인** 사용 — `queryOptions`/`mutationOptions`를 생성해 기존 TanStack Query 설정과 직접 연결.
- **재생성**: 루트 `Taskfile.yml`에 타깃(예: `gen-api`) 추가 — (1) `app.openapi()`로 `api/openapi.json` export → (2) `openapi-ts` 실행. 스펙이 바뀌면 이 한 명령으로 클라이언트·타입을 갱신.
- **인증**: 생성 클라이언트는 단일 인스턴스로 baseURL(`VITE_API_BASE_URL`) + request 인터셉터에서 `useAuthStore`의 `accessToken`을 Bearer로 부착. 401 시 auth store clear + Teams 로그인 리다이렉트.

## 맥락 / 왜
`web/src/lib/api.ts`에 수동 `apiFetch` 래퍼가 있고 auth feature가 이를(일부 mock) 쓴다. 구성원 관리 API(`/api/v1/members`, task 3에서 신설)를 프론트에 연결하면서 매 엔드포인트의 타입·경로·쿼리파라미터를 손으로 다시 적으면, 백엔드 Pydantic 스키마와 프론트 타입이 **이중 관리**되어 드리프트한다. 백엔드가 이미 정확한 OpenAPI(`/openapi.json`)를 노출하므로, 그것을 단일 진실원으로 삼아 타입+SDK+쿼리 옵션을 생성하면 드리프트가 구조적으로 사라진다. 사용자가 hey-api를 명시 지정했다.

## 고려한 대안
- **수동 클라이언트 유지(현 `apiFetch` 확장)** — 의존성 0이지만 백엔드 스키마 변경 시 프론트 타입을 수동 동기화해야 하고 드리프트 위험. 기각(사용자 지정도 hey-api).
- **라이브 `/openapi.json`에서 생성** — 스냅샷 파일 불필요하나 재생성·CI·빌드가 서버 기동을 전제. 결정성 저하로 기각, 커밋 스냅샷 채택.
- **생성물 gitignore + postinstall codegen** — 레포는 깔끔하나 서버/스펙 없이는 `pnpm build`/typecheck 불가, CI 복잡도 증가. 커밋 채택.
- **plain SDK + 수동 TanStack Query 훅** — 플러그인 의존을 줄이나 훅 보일러플레이트가 수동. 플러그인 채택(기존 TanStack Query 스택과 정합).

## 결과
- `web/src/client/`(생성물)와 `web/src/lib/api.ts`(수동, auth)의 **두 HTTP 레이어가 당분간 공존**한다. members는 생성 클라이언트, auth는 기존 경로. auth를 생성 클라이언트로 이전하는 것은 후속 작업.
- 백엔드 스펙을 바꾸면 `task gen-api`로 재생성 후 커밋해야 프론트가 최신. 잊으면 스냅샷이 stale — diff로 드러나긴 함.
- 401 자동 토큰 갱신(silent refresh)은 범위 밖 — 만료 시 재로그인. auth 하드닝 후속(teams-sso retro)에서 다룬다.
- 루트 `Taskfile.yml`이 codegen 타깃을 가지므로 이 파일이 정식 추적 대상이 된다(현재 untracked였음).
