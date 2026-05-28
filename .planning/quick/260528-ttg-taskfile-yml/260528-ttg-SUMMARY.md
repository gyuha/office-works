---
quick_id: 260528-ttg
slug: taskfile-yml
status: completed
date: 2026-05-28
---

# Quick Task Summary — 260528-ttg

## 목표

프로젝트 루트에 `Taskfile.yml`을 생성하여 API와 웹 워크스페이스를 단일 진입점에서 제어.

## 완료 내용

`Taskfile.yml` 생성 (`/Users/gyuha/workspace/office-works/Taskfile.yml`)

- Task v3 `includes`로 `api/Taskfile.yml` 전체를 `api:` 네임스페이스로 위임
- `web:*` 태스크 5개: `dev`, `build`, `typecheck`, `lint`, `lint:fix`
- `infra:up` / `infra:down` 단축 태스크
- `check` / `lint` — API + 웹 통합 검증
- `dev` / `dev:infra` — 인프라 자동 기동 + 앱 실행 안내

## 검증 결과

`task --list` 출력 확인: `api:*` (30개+), `web:*` (5개), `infra:*` (2개), `check`, `lint`, `dev`, `dev:infra`, `help` 모두 정상 출력.

## 사용 방법

```bash
# 인프라 기동
task infra:up

# API 실행 (별도 터미널)
task api:run:local

# 웹 개발 서버 (별도 터미널)
task web:dev

# 전체 검증
task check

# 태스크 목록
task --list
```
