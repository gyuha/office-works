# STATUS — members ↔ users 테이블 병합
- slug: merge-members-into-users
- status: done
- executed: 2026-06-08
- completed: 2026-06-08
- verified: yes (pytest 303 passed — auth+org+users 통합 포함; /users 라이브 401/403/CRUD/me; 0007·0008 라이브 적용 + 0008 down/up 멱등; 앱 기동 /users 401·/members 404. 미검증: 실데이터 backfill[dev 0행]·브라우저 쓰기 UAT[admin 부트스트랩 차단])
- retro: .forge/retro/2026-06-08-merge-members-into-users.md
- docs updated: CONTEXT.md(구성원 재정의·구성원 연결 폐기·등급/직급/고용형태 users 정정) / ADR-0006(consequences: display_name 재사용)
