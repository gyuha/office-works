# members.grade를 물리 FK 아닌 검증된 이름 문자열 + 앱레벨 rename-cascade로 둔다

## Status
accepted

## 결정
등급(Grade)을 read-only enum에서 관리 테이블(`grades`)로 승격하면서, **`members.grade`는 `grades.id`로의 물리 외래키가 아니라 등급 *이름 문자열*을 그대로 저장**한다. 무결성은 애플리케이션 레이어가 책임진다:
- **생성/수정 검증**: MemberService가 `grades` 테이블에 해당 이름이 존재하는지 확인(없으면 400). (members 리포지토리의 `grade_exists`, raw SQL.)
- **rename cascade**: 등급 이름을 바꾸면 같은 트랜잭션에서 `UPDATE members SET grade=:new WHERE grade=:old`로 전파한다.
- **삭제 차단**: 어떤 member라도 참조 중이면 등급 삭제를 거부(409).

`members.grade` 컬럼은 기존 String을 유지하되 폭만 `varchar(8)`→`varchar(16)`로 넓혔다(긴 등급명 수용).

## 맥락 / 왜
등급은 원래 `members.grade` String 컬럼에 저장되는 고정 4값(Pydantic `Literal` enum)이었다. 사용자가 설정 화면에서 등급을 CRUD하도록 요구하면서 등급이 관리 테이블이 되어야 했다. 이때 `members.grade`를 어떻게 잇느냐가 갈렸다 — 이 결정은 **이미 봉인된 member-management / members-list 작업**(스키마·API 계약·hey-api 생성 타입·프론트)을 건드린다.

물리 FK(`members.grade_id`)로 가면 DB가 무결성을 강제하고 rename이 공짜지만, members 스키마 마이그레이션(컬럼 교체+백필)·응답/요청 계약 변경(grade_id 또는 중첩 객체)·hey-api 타입 재생성·members.tsx의 grade 렌더링 전반을 바꿔야 한다. 이름 문자열+검증 방식은 members API 계약을 거의 불변(`grade`는 enum→str 완화)으로 두어 sealed 작업의 충격을 최소화한다.

## 고려한 대안
- **물리 FK `members.grade_id`→`grades.id`** — DB 강제 무결성·rename 공짜. 그러나 sealed members 스키마/계약/생성타입/프론트 광범위 변경. 충격 대비 이득이 작아 기각.
- **검증 없이 자유 문자열 유지** — 충격 0이나 members.grade가 grades와 drift(존재하지 않는 등급 저장 가능). 무결성 상실로 기각.
- **검증된 이름 문자열 + 앱레벨 cascade/삭제차단(채택)** — 계약 거의 불변 + 무결성은 서비스가 보장. rename/삭제의 무결성을 앱이 책임지는 비용을 진다.

## 결과
- `members.grade`는 사실상 `grades.name`을 가리키지만 DB FK가 없다 — 무결성은 전적으로 서비스 레이어에 의존한다. **grades를 우회한 직접 INSERT/UPDATE는 검증을 건너뛴다**(마이그레이션·수동 SQL 주의).
- rename은 트랜잭션 cascade라 등급 수가 많거나 members가 많으면 대량 UPDATE가 발생(현 규모 무관).
- 교차 도메인(members↔org) 접근을 raw SQL로 처리해 import 순환을 회피했다.
- 나중에 강한 무결성이 필요하면 `members.grade_id` FK로 승격하는 별도 마이그레이션이 필요하다(이 ADR을 뒤집는 작업).
