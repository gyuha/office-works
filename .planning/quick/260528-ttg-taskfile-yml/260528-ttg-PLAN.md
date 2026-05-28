---
phase: quick-260528-ttg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - Taskfile.yml
autonomous: true
requirements:
  - ROOT-TASKFILE-01
must_haves:
  truths:
    - "루트에서 `task api:run`으로 API 서버를 실행할 수 있다"
    - "루트에서 `task web:dev`로 프론트엔드 개발 서버를 실행할 수 있다"
    - "루트에서 `task infra:up` / `task infra:down`으로 인프라를 제어할 수 있다"
    - "루트에서 `task dev`로 인프라 + API + 웹을 한 번에 기동할 수 있다"
    - "`task` 또는 `task --list`로 전체 태스크 목록이 출력된다"
  artifacts:
    - path: "Taskfile.yml"
      provides: "루트 레벨 Task 진입점"
      contains: "includes"
  key_links:
    - from: "Taskfile.yml"
      to: "api/Taskfile.yml"
      via: "includes 지시자"
      pattern: "includes:"
---

<objective>
프로젝트 루트에 `Taskfile.yml`을 생성하여, API(Spring Boot WebFlux)와 웹(React/Vite) 두 워크스페이스를 단일 진입점에서 제어할 수 있게 한다.

목적: 루트 디렉토리에서 모든 개발 작업을 수행할 수 있도록 하여 컨텍스트 전환 비용을 줄인다.
산출물: `/Users/gyuha/workspace/office-works/Taskfile.yml`
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
기존 API Taskfile 전체 태스크 목록 (api/Taskfile.yml 기준):

- `run` — 인프라 기동 후 local 프로파일로 앱 실행
- `run:local` — local 프로파일로 앱만 실행
- `run:prod` — prod 프로파일로 앱 실행
- `build` — Gradle 빌드
- `clean` — 빌드 산출물 정리
- `test` — JUnit 테스트
- `coverage` — 테스트 + JaCoCo 리포트
- `check` — 전체 검증 (테스트/커버리지/정적분석)
- `ci` — clean + check
- `lint` — checkstyle + spotbugs
- `checkstyle`, `spotbugs`
- `deps` — 의존성 트리
- `docker:build` — Docker 이미지 빌드
- `docker:infra:up` — PostgreSQL/Redis 기동
- `docker:infra:down` — PostgreSQL/Redis 중지
- `docker:up` / `docker:down` / `docker:logs` / `docker:ps` / `docker:restart`
- `db:shell`, `redis:shell`
- `health:check` — Actuator health 확인
- `reports:open` — HTML 리포트 열기
- `help`

웹 pnpm 스크립트 (web/ 기준):
- `dev` — Vite 개발 서버 (포트 3000)
- `build` — tsc -b && vite build
- `typecheck` — tsc --noEmit
- `lint` — biome check .
- `lint:fix` — biome check --write .
</context>

<tasks>

<task type="auto">
  <name>Task 1: 루트 Taskfile.yml 생성</name>
  <files>Taskfile.yml</files>
  <action>
프로젝트 루트에 `Taskfile.yml`을 생성한다. Task v3 문법을 사용하며, `includes` 지시자로 `api/Taskfile.yml`을 `api` 네임스페이스에 포함시킨다. 웹 태스크는 `dir: web` + `pnpm run` 조합으로 직접 정의한다.

파일 구조:

1. `version: '3'` 선언

2. `includes` 섹션 — api 네임스페이스로 api/Taskfile.yml 포함:
   ```
   includes:
     api:
       taskfile: ./api/Taskfile.yml
       dir: ./api
   ```

3. `tasks` 섹션 — 아래 태스크를 정의한다:

   **개발 통합 태스크 (최상위 편의 태스크):**
   - `dev`: desc "인프라 기동 후 API와 웹 개발 서버를 순차 실행합니다." → `task api:docker:infra:up` 후 `task api:run:local` (백그라운드), 이후 `task web:dev`
     - 참고: API와 웹을 동시에 띄우려면 두 개의 터미널이 필요하다. 이 태스크는 API를 background로 먼저 기동한 후 web dev를 foreground로 실행하는 방식을 사용한다. API는 `task api:run:local &` 형태 대신, 사용자가 두 개의 터미널에서 `task api:run:local`과 `task web:dev`를 각각 실행하도록 안내하는 desc를 제공하고, `dev` 태스크 자체는 `task api:docker:infra:up`만 수행하고 이후 안내를 출력하는 방식으로 구현한다. (동시 실행은 forking이 필요하여 복잡도가 높으므로 인프라 기동만 자동화하고 앱 실행은 별도 태스크로 위임한다.)

   - `dev:infra`: desc "개발용 인프라(PostgreSQL/Redis)를 기동합니다." → `task api:docker:infra:up`

   **웹 태스크 (web: 접두사):**
   - `web:dev`: desc "웹 개발 서버를 실행합니다. (포트 3000)" → `dir: web`, `pnpm run dev`
   - `web:build`: desc "웹 프로덕션 빌드를 실행합니다." → `dir: web`, `pnpm run build`
   - `web:typecheck`: desc "웹 TypeScript 타입 검사를 실행합니다." → `dir: web`, `pnpm run typecheck`
   - `web:lint`: desc "웹 Biome 정적 분석을 실행합니다." → `dir: web`, `pnpm run lint`
   - `web:lint:fix`: desc "웹 Biome 정적 분석 오류를 자동 수정합니다." → `dir: web`, `pnpm run lint:fix`

   **전체 검증 태스크:**
   - `check`: desc "API와 웹 전체 검증을 실행합니다." → `task api:check`, 이후 `task web:typecheck`, 이후 `task web:lint`
   - `lint`: desc "API와 웹 정적 분석을 실행합니다." → `task api:lint`, 이후 `task web:lint`

   **인프라 단축 태스크 (infra: 접두사):**
   - `infra:up`: desc "PostgreSQL/Redis를 기동합니다." → `task api:docker:infra:up`
   - `infra:down`: desc "PostgreSQL/Redis를 중지합니다." → `task api:docker:infra:down`

   **도움말:**
   - `help`: desc "사용 가능한 태스크 목록을 출력합니다." → `task --list`
  </action>
  <verify>
    <automated>cd /Users/gyuha/workspace/office-works && task --list 2>&1 | head -40</automated>
  </verify>
  <done>
- `Taskfile.yml`이 루트에 존재한다
- `task --list` 실행 시 `web:*`, `api:*`, `infra:*`, `check`, `lint`, `dev`, `help` 태스크가 출력된다
- `task web:dev --dry` 또는 `task --list`가 오류 없이 실행된다
  </done>
</task>

</tasks>

<threat_model>
## 신뢰 경계

| 경계 | 설명 |
|------|------|
| 로컬 개발 환경 | Taskfile은 로컬 CI 도구이며 외부 신뢰 경계 없음 |

## STRIDE 위협 등록부

| 위협 ID | 범주 | 컴포넌트 | 처리 방침 | 완화 계획 |
|---------|------|----------|-----------|-----------|
| T-ttg-01 | Tampering | Taskfile.yml | accept | 로컬 개발 도구이므로 위험도 낮음 — 별도 완화 불필요 |
</threat_model>

<verification>
## 전체 검증

```bash
# 루트에서 태스크 목록 확인
cd /Users/gyuha/workspace/office-works && task --list

# includes로 연결된 api 태스크 확인
task api:help --dry

# 웹 태스크 dry-run
task web:dev --dry
task web:build --dry

# 인프라 단축 태스크 dry-run
task infra:up --dry
```
</verification>

<success_criteria>
- `Taskfile.yml`이 루트에 생성된다
- `task --list`에서 `web:dev`, `web:build`, `web:lint`, `web:typecheck`, `web:lint:fix`, `api:*` (includes 위임), `infra:up`, `infra:down`, `check`, `lint`, `dev`, `dev:infra`, `help` 가 모두 출력된다
- Task v3 `includes` 문법으로 `api/Taskfile.yml`의 모든 태스크가 `api:` 접두사로 위임된다
- `task web:dev` 실행 시 `web/` 디렉토리에서 `pnpm run dev`가 실행된다
</success_criteria>

<output>
완료 후 `.planning/quick/260528-ttg-taskfile-yml/260528-ttg-SUMMARY.md` 를 생성한다.
</output>
