# Auth Bootstrap 설계 문서

**날짜:** 2026-04-26
**상태:** 확정

---

## 1. 프로젝트 개요

Next.js App Router 기반 프론트엔드 부트스트랩 프로젝트. 실제 백엔드 없이 mock 기반으로 회원가입/로그인 샘플 페이지를 구현한다. 이후 실제 API 연동이 가능한 구조를 목표로 한다.

**기술 스택:** Next.js (App Router), TypeScript, React 19, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, React Hook Form, Zod, Motion, pnpm, Biome

---

## 2. 라우팅 구조

| 경로 | 역할 |
|---|---|
| `/` | 홈 — 인증 상태 표시, 로그인/회원가입 링크 |
| `/auth/login` | 로그인 페이지 |
| `/auth/signup` | 회원가입 페이지 |

`src/app/auth/` 하위에 `login/`, `signup/` 디렉터리를 둔다. `auth/` 레벨에는 별도 `layout.tsx` 없이 각 페이지에서 `auth-shell`을 직접 사용한다.

---

## 3. 디렉터리 구조

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx          ← QueryClientProvider + 전역 providers
│   ├── providers.tsx
│   ├── page.tsx            ← 홈
│   └── auth/
│       ├── login/
│       │   └── page.tsx
│       └── signup/
│           └── page.tsx
├── components/
│   ├── layout/
│   │   └── auth-shell.tsx  ← 좌우 분할 레이아웃 (Server Component)
│   └── ui/                 ← shadcn/ui 컴포넌트
├── features/
│   └── auth/
│       ├── components/
│       │   ├── login-form.tsx
│       │   └── signup-form.tsx
│       ├── hooks/
│       │   └── use-auth-mutation.ts
│       ├── lib/
│       │   └── mock-auth-api.ts
│       ├── schema/
│       │   └── auth.schema.ts
│       ├── store/
│       │   └── auth.store.ts
│       └── types/
│           └── auth.ts
└── lib/
    ├── query-client.ts
    └── utils.ts
```

---

## 4. Auth Shell 레이아웃

**좌우 분할형** 레이아웃을 사용한다.

- **왼쪽 (42%):** 브랜드 패널 — 파란 그라디언트 배경, 로고, 프로젝트 설명, 기술 스택 태그
- **오른쪽 (58%):** 폼 영역 — 제목, 페이지 전환 링크, 입력 필드, 에러 Alert, 제출 버튼
- **모바일:** 왼쪽 패널 숨김, 오른쪽 폼 전체 너비
- **Motion:** 오른쪽 폼 패널 fade-in + slide-up (0.3s)

`auth-shell.tsx`는 Server Component로 유지하며 스타일링만 담당한다. 폼 컴포넌트(`login-form.tsx`, `signup-form.tsx`)는 `'use client'`로 선언한다.

---

## 5. 아키텍처: Zustand + TanStack Query Mutation

### 역할 분리

| 레이어 | 역할 |
|---|---|
| React Hook Form + Zod | 폼 상태, 유효성 검사 |
| TanStack Query `useMutation` | 비동기 요청 상태 (isPending, isError) |
| mock-auth-api | Promise 기반 mock 함수 (750ms 지연) |
| Zustand `auth.store` | 전역 인증 상태 (isAuthenticated, user) |

### 데이터 흐름 (로그인 예시)

```
폼 제출
  → React Hook Form 유효성 검사 (Zod)
  → useLoginMutation.mutate(data)
    → mockLogin(data) [750ms 지연]
    → 성공: authStore.setUser(user) → router.push('/')
    → 실패: isError = true → 폼 상단 Alert 표시
```

### Zustand 스토어 (최소 상태)

```ts
interface AuthState {
  isAuthenticated: boolean
  user: { name: string; email: string } | null
  setUser: (user: { name: string; email: string }) => void
  clearUser: () => void
}
```

폼 상태(로딩, 에러 등)는 TanStack Query가 관리하며 Zustand에 중복 저장하지 않는다.

---

## 6. Mock API 정책

| 조건 | 결과 |
|---|---|
| 모든 요청 | 750ms 인위적 지연 |
| `fail@example.com` 로그인 시도 | 로그인 실패 반환 |
| `taken@example.com` 회원가입 시도 | 회원가입 실패 반환 |
| 그 외 | 성공 반환 |

---

## 7. 폼 유효성 검사 (Zod 스키마)

### loginSchema

- `email`: 유효한 이메일 형식
- `password`: 최소 8자

### signupSchema

- `name`: 최소 2자
- `email`: 유효한 이메일 형식
- `password`: 최소 8자
- `confirmPassword`: password와 일치 (`superRefine` 또는 `.refine` 사용)

모든 폼 컴포넌트는 이 스키마를 단일 진실 원천으로 사용한다. `zodResolver`를 통해 React Hook Form에 연결한다.

---

## 8. 에러 처리 전략

| 에러 유형 | 표시 방식 |
|---|---|
| 폼 유효성 오류 | 각 필드 아래 인라인 메시지 |
| Mock API 실패 | 폼 상단 shadcn `Alert` 컴포넌트 |
| 로딩 상태 | 제출 버튼 disabled + 텍스트 "처리 중..." |

---

## 9. 페이지별 성공 흐름

- **로그인 성공:** Zustand `setUser()` 호출 → 홈(`/`)으로 `router.push()`
- **회원가입 성공:** `sonner` toast 알림("가입 완료!") → 로그인 페이지(`/auth/login`)로 이동

---

## 10. 홈 페이지 UI

인증 상태에 따라 다른 UI를 렌더링한다.

- **비로그인:** 회색 상태 배지 + "로그인", "회원가입" 버튼
- **로그인 후:** 초록 상태 배지 + 이메일 표시 + "로그아웃" 버튼 (로그아웃 시 `clearUser()` 호출)

---

## 11. shadcn/ui 컴포넌트 목록

설치 대상:
`accordion`, `alert`, `alert-dialog`, `badge`, `button`, `calendar`, `card`, `dialog`, `form`, `input`, `label`, `pagination`, `progress`, `radio-group`, `scroll-area`, `select`, `skeleton`, `sonner`, `switch`, `tabs`

> `combobox`는 shadcn/ui에서 독립 컴포넌트가 아닌 `Command` + `Popover` 조합 레시피이므로 `add` 명령으로 설치하지 않는다. 필요 시 두 컴포넌트를 설치해 직접 조합한다.
> `empty`, `field`, `input-group`, `item`, `spinner`는 shadcn/ui 공식 레지스트리에 없는 항목으로 설치에서 제외한다.

---

## 12. Motion 적용 범위

- `auth-shell` 오른쪽 폼 패널 등장 — fade-in + slide-up (0.3s)
- 에러 `Alert` 등장 — fade-in (0.2s)
- 과한 페이지 전환 애니메이션은 사용하지 않는다

---

## 13. 검증 명령

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm exec tsc --noEmit
```

---

## 14. 수용 기준

- `/auth/login`, `/auth/signup` 페이지가 정상 렌더링된다
- 각 폼은 필수 입력값과 형식 검증을 수행한다
- 잘못된 값 입력 시 사용자 친화적인 오류 메시지가 표시된다
- 제출 중 로딩 상태가 표시된다
- mock 성공/실패 케이스를 화면에서 확인할 수 있다
- 로그인 성공 시 홈(`/`)으로 리다이렉트되고 인증 상태가 표시된다
- 홈에서 로그아웃 시 상태가 초기화된다
- `pnpm run lint` 및 `pnpm dlx tsc --noEmit`가 통과한다
