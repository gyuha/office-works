# 0001. 리액티브 다중 write 원자성에 TransactionalOperator 사용 (@Transactional 회피)

- 상태: 채택됨
- 날짜: 2026-06-05
- 관련 작업: rbac-admin-management-api (task 1)

## 맥락

RBAC 관리 API는 사용자-역할(`user_roles`)과 역할별 메뉴 권한(`role_menu_permissions`)을 **전체 집합 PUT 교체** 방식으로 갱신한다. 구현은 "기존 행 삭제 후 새 행 삽입"(delete-then-insert)이라 두 개 이상의 write가 하나의 원자 단위로 묶여야 한다. 중간 실패 시 권한이 부분적으로 날아가면 안 된다.

이 프로젝트는 WebFlux + R2DBC 환경이고, 서비스 계층에 선언적 트랜잭션을 쓴 전례가 없다(`AuthService`조차 리프레시 토큰 삭제→저장을 트랜잭션 없이 체이닝). 또한 트랜잭션 매니저가 **두 개 공존**한다:

- `R2dbcTransactionManager`(`ReactiveTransactionManager`) — WebFlux + R2DBC 환경에서 Spring Boot가 자동 구성.
- `batchTransactionManager`(`DataSourceTransactionManager`, `PlatformTransactionManager`) — Spring Batch 자동 구성을 위해 `BatchConfig`가 명시 등록.

## 결정

`@Transactional` 애너테이션 대신, 주입한 `ReactiveTransactionManager`로 생성한 **`TransactionalOperator`**로 리액티브 체인을 명시적으로 감싸 원자성을 보장한다.

## 근거 / 대안

- **`@Transactional`을 쓰지 않는 이유**: 두 트랜잭션 매니저(Reactive vs Platform)가 공존해 `@Transactional`이 어느 매니저를 고를지 한정자 모호성이 생길 수 있다. `Mono` 반환 메서드에서는 보통 Reactive 쪽이 선택되지만, 한정자를 명시하지 않으면 추론에 의존하게 되고 향후 batch 설정 변경에 취약하다. `TransactionalOperator`는 어떤 매니저를 쓰는지 코드에 드러난다.
- **무트랜잭션 체이닝(기존 관례) 대안**: delete-then-insert는 단일 write가 아니라 부분 실패 시 권한 상실 위험이 실재한다. 기존 무트랜잭션 관례를 권한 데이터에 그대로 적용하기엔 위험이 크다.

## 결과

- 이 프로젝트 서비스 계층 최초의 명시적 리액티브 트랜잭션 패턴. 이후 다중 write 원자성이 필요한 리액티브 서비스는 이 패턴(`TransactionalOperator`)을 따른다.
- `@Transactional`을 쓰려면 `transactionManager` 한정자를 명시해야 한다는 제약을 우회한다.
