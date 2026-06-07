export const meta = {
  name: 'rbac-admin-management-api',
  description: 'RBAC 관리 API 실행 — 역할 CRUD, 사용자-역할 부여, 역할별 메뉴 권한 (S1→S2∥S3∥S4→S5)',
  phases: [
    { title: 'S1 에러코드', detail: 'ROLE_001/002/003 + i18n 메시지' },
    { title: 'S2-4 관리 API', detail: '역할 CRUD ∥ 사용자-역할 ∥ 역할-메뉴권한' },
    { title: 'S5 E2E 검증', detail: '통합 테스트 + ./gradlew check (JaCoCo 60%)' },
  ],
}

const PLAN = '.forge/plan.md'
const CTX = '.forge/CONTEXT.md'
const ADR = '.forge/adr/0001-reactive-transactional-operator.md'

const common = `
프로젝트: /Users/gyuha/workspace/office-works (Spring Boot WebFlux + R2DBC, api/ 디렉토리).
반드시 먼저 읽어라: ${PLAN} (계획·합의된 설계 결정), ${CTX} (글로서리), ${ADR} (트랜잭션 ADR).
또한 .forge/codebase/CONVENTIONS.md, ARCHITECTURE.md 를 참고하라.

관례 (엄수):
- DTO는 Java record + 검증 애너테이션, 엔티티 수동 getter/setter (Lombok 금지), 생성자 주입만.
- 모든 응답은 ApiResponse<T> 래퍼. 에러는 BusinessException(ErrorCode.XXX).
- 리액티브 에러 처리: switchIfEmpty(Mono.error(...)). 블로킹 금지.
- 메뉴 도메인 패키지: com.example.bootstrap.menu (controller/application/service, application/dto, domain/model, domain/repository).
- 전 엔드포인트 @PreAuthorize("hasRole('ADMIN')"), 경로 prefix /api/v1/admin.
- 다중 write 원자성은 @Transactional 금지, 주입한 ReactiveTransactionManager로 만든 TransactionalOperator 사용 (ADR 0001).
- 기존 엔티티/리포지토리(Role, UserRole, RoleMenuPermission, Menu + 각 Repository)는 이미 존재하니 재사용. ReactiveCrudRepository라 save/deleteById/findById/existsById 사용 가능.
- 테스트: 단위(@ExtendWith(MockitoExtension.class)), 통합(*IT, @SpringBootTest + @Import(TestcontainersConfig.class)), StepVerifier, 명명 methodUnderTest_scenario_expectation.
`

const SLICE_SCHEMA = {
  type: 'object',
  required: ['files', 'endpoints', 'summary'],
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    endpoints: { type: 'array', items: { type: 'string' } },
    testsAdded: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

phase('S1 에러코드')
const s1 = await agent(`${common}
[S1] ROLE 에러 코드 추가.
- api/src/main/java/com/example/bootstrap/global/exception/ErrorCode.java 의 Menu 도메인 블록 뒤에 ROLE 도메인 블록 추가:
  ROLE_001(HttpStatus.NOT_FOUND, "ROLE_001")  // 존재하지 않는 역할
  ROLE_002(HttpStatus.CONFLICT, "ROLE_002")   // 이미 존재하는 역할 이름
  ROLE_003(HttpStatus.CONFLICT, "ROLE_003")   // 사용 중인 역할은 삭제 불가
- i18n 메시지 properties(기존 MENU_001 등이 정의된 messages 번들을 찾아 동일 위치)에 세 키의 한국어 메시지 추가.
- enum 순서/형식은 기존 패턴(Javadoc 주석 포함)을 그대로 따른다.
변경한 파일 경로와 추가한 코드, i18n 번들 경로를 보고하라.`,
  { label: 'S1:error-codes', schema: {
    type: 'object',
    required: ['files', 'summary'],
    properties: {
      files: { type: 'array', items: { type: 'string' } },
      i18nBundle: { type: 'string' },
      summary: { type: 'string' },
    },
  }})

log('S1 완료 — ROLE 에러 코드 추가됨. S2/S3/S4 병렬 실행 (worktree 격리)')

phase('S2-4 관리 API')
const apiResults = await parallel([
  () => agent(`${common}
S1에서 ErrorCode에 ROLE_001/002/003 이 이미 추가되었다(메인 브랜치 기준). 네 worktree에 없으면 동일하게 추가해서 컴파일되게 하라.
[S2] 역할 CRUD API.
- MenuController와 별도로 RoleAdminController 신규 생성. @RequestMapping("/api/v1/admin/roles"), @PreAuthorize("hasRole('ADMIN')").
  - POST   /            역할 생성 (이름 @NotBlank, 중복 시 ROLE_002)
  - GET    /            전체 역할 목록
  - GET    /{id}        단건 (없으면 ROLE_001)
  - PUT    /{id}        이름/설명 수정 (없으면 ROLE_001, 이름 중복 ROLE_002)
  - DELETE /{id}        삭제 — UserRoleRepository.findByRoleId 로 사용 여부 확인, 사용 중이면 ROLE_003 차단. 미사용이면 삭제.
- RoleAdminService 신규. RoleRepository, UserRoleRepository 주입. 생성/수정 전 findByName 중복 검사.
- DTO는 record: RoleCreateRequest, RoleUpdateRequest, RoleResponse (application/dto).
- 단위 테스트 + IT 작성 (중복 이름/없는 ID/사용 중 삭제 각 에러 코드 검증).
변경/생성 파일 경로와 엔드포인트 목록을 보고하라.`,
    { label: 'S2:role-crud', phase: 'S2-4 관리 API', isolation: 'worktree', schema: SLICE_SCHEMA }),

  () => agent(`${common}
S1에서 ErrorCode에 ROLE_001/002/003 이 이미 추가되었다. 네 worktree에 없으면 동일하게 추가해서 컴파일되게 하라.
[S3] 사용자-역할 부여 API (전체 집합 PUT 교체).
- UserRoleAdminController 신규. @RequestMapping("/api/v1/admin/users/{userId}/roles"), @PreAuthorize("hasRole('ADMIN')").
  - PUT  /   body {roleIds:[Long...]} — 해당 사용자의 역할을 통째로 교체. userId 존재 검증(AccountRepository.existsById, 없으면 ACCOUNT_002), 각 roleId 존재 검증(없으면 ROLE_001). TransactionalOperator로 (기존 user_roles 삭제 → 새 UserRole 삽입) 원자화.
  - GET  /   현재 부여된 역할 목록 반환.
- UserRoleAdminService 신규. UserRoleRepository, RoleRepository, AccountRepository, ReactiveTransactionManager 주입 → TransactionalOperator 생성. @Transactional 사용 금지(ADR 0001).
- AccountRepository 위치: com.example.bootstrap.account.domain.repository.AccountRepository.
- DTO record: UserRoleAssignRequest, UserRoleResponse.
- 단위 + IT (집합 교체 후 GET 일치, 없는 user/role 에러, 트랜잭션 롤백 시 기존 보존).
변경/생성 파일 경로와 엔드포인트 목록을 보고하라.`,
    { label: 'S3:user-roles', phase: 'S2-4 관리 API', isolation: 'worktree', schema: SLICE_SCHEMA }),

  () => agent(`${common}
S1에서 ErrorCode에 ROLE_001/002/003 이 이미 추가되었다. 네 worktree에 없으면 동일하게 추가해서 컴파일되게 하라.
[S4] 역할별 메뉴 권한 설정 API (전체 집합 PUT 교체).
- RoleMenuPermissionAdminController 신규. @RequestMapping("/api/v1/admin/roles/{roleId}/menu-permissions"), @PreAuthorize("hasRole('ADMIN')").
  - PUT  /   body [{menuId, canRead, canWrite}...] — 해당 역할의 메뉴 권한을 통째로 교체. roleId 존재 검증(없으면 ROLE_001), 각 menuId 존재 검증(MenuRepository, 없으면 MENU_001). TransactionalOperator로 (기존 role_menu_permissions(roleId) 삭제 → 새로 삽입) 원자화.
  - GET  /   현재 권한 목록 반환.
- RoleMenuPermissionAdminService 신규. RoleMenuPermissionRepository, RoleRepository, MenuRepository, ReactiveTransactionManager → TransactionalOperator 주입. @Transactional 금지(ADR 0001).
- RoleMenuPermissionRepository에 deleteByRoleId(또는 findByRoleId 후 삭제) 활용.
- DTO record: MenuPermissionRequest(menuId,canRead,canWrite), MenuPermissionResponse.
- 단위 + IT (집합 교체 후 GET 일치, 없는 role/menu 에러).
변경/생성 파일 경로와 엔드포인트 목록을 보고하라.`,
    { label: 'S4:role-menu-perms', phase: 'S2-4 관리 API', isolation: 'worktree', schema: SLICE_SCHEMA }),
])

const ok = apiResults.filter(Boolean)
log(`S2-4 완료 — ${ok.length}/3 성공. worktree 병합 후 S5 통합 검증.`)

phase('S5 E2E 검증')
const s5 = await agent(`${common}
[S5] End-to-end 통합 검증.
선행 S1~S4의 산출물이 메인 작업트리에 병합되어 있다고 가정한다. 먼저 git status로 RoleAdminController, UserRoleAdminController, RoleMenuPermissionAdminController 및 각 Service/DTO/테스트가 존재하는지 확인하라. worktree 병합 누락으로 빠진 파일이 있으면, 위 S2/S3/S4 명세대로 직접 채워 넣어 컴파일·테스트가 통과하게 하라.
- E2E IT 작성: ADMIN 토큰으로 역할 생성 → 사용자에 PUT 역할 부여 → 역할에 PUT 메뉴 권한 설정 → 그 사용자 토큰으로 GET /api/menus/my 가 설정한 권한(canRead/canWrite)을 반영해 반환하는지 검증. 기존 AuthControllerIT, FlywayMigrationIT의 Testcontainers 패턴 재사용.
- 컴파일 에러/중복 정의(ErrorCode ROLE 코드가 worktree마다 중복 추가됐을 수 있음)를 정리하라.
- 최종적으로 'cd api && ./gradlew check' 를 실행해 테스트 + JaCoCo 60% + Checkstyle + SpotBugs 가 모두 통과하는지 확인하고, 실패 시 고쳐라.
gradle check 최종 결과(통과/실패), 작성한 E2E IT 경로, 정리한 충돌, 남은 이슈를 보고하라.`,
  { label: 'S5:e2e-verify', schema: {
    type: 'object',
    required: ['gradleCheckPassed', 'summary'],
    properties: {
      gradleCheckPassed: { type: 'boolean' },
      e2eTestPath: { type: 'string' },
      conflictsResolved: { type: 'array', items: { type: 'string' } },
      remainingIssues: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
    },
  }})

return { s1, apiResults: ok, s5 }
