# Auth Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js App Router 기반으로 회원가입/로그인 샘플 페이지를 mock API 기반으로 구현하는 프론트엔드 부트스트랩 프로젝트를 구성한다.

**Architecture:** Zustand는 전역 인증 상태만 관리하고, TanStack Query `useMutation`이 비동기 요청 상태를 담당하며, React Hook Form + Zod가 폼 상태와 유효성 검사를 전담한다. auth-shell은 Server Component 좌우 분할 레이아웃이며 폼 컴포넌트는 Client Component다.

**Tech Stack:** Next.js 15 (App Router), TypeScript, React 19, Tailwind CSS v3, shadcn/ui, Zustand 5, TanStack Query v5, React Hook Form 7, Zod 3, Motion (motion/react), pnpm, Biome

---

## 파일 맵

| 파일 | 역할 | 생성/수정 |
|---|---|---|
| `package.json` | 의존성 정의 | 생성 |
| `tsconfig.json` | TypeScript 설정 (`@/*` alias) | 생성 |
| `next.config.ts` | Next.js 설정 | 생성 |
| `biome.json` | 포맷/린트 설정 | 생성 |
| `.gitignore` | `.superpowers/` 추가 | 수정 |
| `src/app/globals.css` | Tailwind + shadcn CSS 변수 | shadcn init 생성 |
| `src/app/layout.tsx` | 루트 레이아웃, Providers, Toaster | 생성 |
| `src/app/providers.tsx` | QueryClientProvider 래퍼 | 생성 |
| `src/app/page.tsx` | 홈 — 인증 상태 표시 | 생성 |
| `src/app/auth/login/page.tsx` | 로그인 페이지 | 생성 |
| `src/app/auth/signup/page.tsx` | 회원가입 페이지 | 생성 |
| `src/components/layout/auth-shell.tsx` | 좌우 분할 레이아웃 Shell | 생성 |
| `src/components/ui/*` | shadcn/ui 컴포넌트 | shadcn add 생성 |
| `src/lib/utils.ts` | `cn()` 유틸리티 | 생성 |
| `src/features/auth/types/auth.ts` | 인증 입출력 타입 | 생성 |
| `src/features/auth/schema/auth.schema.ts` | Zod 스키마 | 생성 |
| `src/features/auth/lib/mock-auth-api.ts` | Promise mock 함수 | 생성 |
| `src/features/auth/store/auth.store.ts` | Zustand 인증 스토어 | 생성 |
| `src/features/auth/hooks/use-auth-mutation.ts` | useMutation 훅 | 생성 |
| `src/features/auth/components/login-form.tsx` | 로그인 폼 Client Component | 생성 |
| `src/features/auth/components/signup-form.tsx` | 회원가입 폼 Client Component | 생성 |
| `README.md` | 실행 방법, 스택, mock 정책 | 수정 |

---

## Task 1: 프로젝트 기반 구성

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `biome.json`
- Modify: `.gitignore`

- [ ] `package.json` 생성

```json
{
  "name": "nextjs-bootstrap",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write ."
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.75.0",
    "zustand": "^5.0.3",
    "react-hook-form": "^7.55.0",
    "@hookform/resolvers": "^4.1.3",
    "zod": "^3.24.2",
    "motion": "^11.18.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "sonner": "^2.0.3",
    "lucide-react": "^0.487.0",
    "@radix-ui/react-slot": "^1.2.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^22.14.1",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "typescript": "^5.8.3",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.5.3",
    "autoprefixer": "^10.4.21"
  }
}
```

- [ ] `tsconfig.json` 생성

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] `next.config.ts` 생성

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] `biome.json` 생성

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5"
    }
  },
  "files": {
    "ignore": ["node_modules", ".next", "dist", ".superpowers"]
  }
}
```

- [ ] `.gitignore`에 `.superpowers/` 추가 (파일 맨 아래에 추가)

```
.superpowers/
```

- [ ] 의존성 설치 및 확인

```bash
pnpm install
```

Expected: `node_modules/` 생성, lock 파일(`pnpm-lock.yaml`) 생성, 오류 없음

- [ ] 커밋

```bash
git add package.json tsconfig.json next.config.ts biome.json .gitignore pnpm-lock.yaml
git commit -m "chore: initialize Next.js project with pnpm and Biome"
```

---

## Task 2: shadcn/ui 초기화 및 컴포넌트 설치

**Files:**
- Create: `components.json`
- Create: `tailwind.config.ts` (shadcn init 자동 생성)
- Create: `postcss.config.mjs` (shadcn init 자동 생성)
- Create: `src/app/globals.css` (shadcn init 자동 생성)
- Create: `src/lib/utils.ts` (shadcn init 자동 생성)
- Create: `src/components/ui/*` (shadcn add 자동 생성)

- [ ] shadcn/ui 초기화 (기본값: slate 색상, CSS 변수, default 스타일)

```bash
pnpm dlx shadcn@latest init -d
```

Expected: `components.json`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/lib/utils.ts` 생성

- [ ] 모든 필요 컴포넌트 설치

```bash
pnpm dlx shadcn@latest add accordion alert alert-dialog badge button calendar card dialog form input label pagination progress radio-group scroll-area select skeleton sonner switch tabs
```

Expected: `src/components/ui/` 하위에 각 컴포넌트 파일 생성, 추가 Radix UI 패키지 자동 설치

- [ ] `src/lib/utils.ts` 내용 확인 (shadcn init이 올바르게 생성했는지 검증)

파일이 아래 내용을 포함해야 한다:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] 커밋

```bash
git add components.json tailwind.config.ts postcss.config.mjs src/app/globals.css src/lib/utils.ts src/components/ui/ pnpm-lock.yaml
git commit -m "feat: add shadcn/ui with all required components"
```

---

## Task 3: 전역 레이아웃 및 Provider 구성

**Files:**
- Create: `src/app/providers.tsx`
- Create: `src/app/layout.tsx`

- [ ] `src/app/providers.tsx` 생성

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: {
            retry: false,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] `src/app/layout.tsx` 생성

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Auth Bootstrap',
  description: 'Next.js 프론트엔드 시작 템플릿',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음 (또는 next-env.d.ts 관련 경고만 — `pnpm run dev` 한 번 실행 후 해소됨)

- [ ] 커밋

```bash
git add src/app/providers.tsx src/app/layout.tsx
git commit -m "feat: add global layout with QueryClientProvider and Toaster"
```

---

## Task 4: 인증 타입 및 Zod 스키마 정의

**Files:**
- Create: `src/features/auth/types/auth.ts`
- Create: `src/features/auth/schema/auth.schema.ts`

- [ ] 디렉터리 구조 생성

```bash
mkdir -p src/features/auth/types src/features/auth/schema src/features/auth/lib src/features/auth/store src/features/auth/hooks src/features/auth/components
```

- [ ] `src/features/auth/types/auth.ts` 생성

```typescript
export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthUser {
  name: string
  email: string
}

export interface AuthResponse {
  user: AuthUser
}
```

- [ ] `src/features/auth/schema/auth.schema.ts` 생성

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
})

export const signupSchema = z
  .object({
    name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
    email: z.string().email('유효한 이메일 주소를 입력해주세요'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type SignupFormValues = z.infer<typeof signupSchema>
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 커밋

```bash
git add src/features/auth/types/auth.ts src/features/auth/schema/auth.schema.ts
git commit -m "feat: add auth types and Zod schemas"
```

---

## Task 5: Mock 인증 API 작성

**Files:**
- Create: `src/features/auth/lib/mock-auth-api.ts`

- [ ] `src/features/auth/lib/mock-auth-api.ts` 생성

```typescript
import type { AuthResponse, LoginInput, SignupInput } from '../types/auth'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function mockLogin(input: LoginInput): Promise<AuthResponse> {
  await delay(750)
  if (input.email === 'fail@example.com') {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다')
  }
  return {
    user: {
      name: input.email.split('@')[0],
      email: input.email,
    },
  }
}

export async function mockSignup(input: SignupInput): Promise<AuthResponse> {
  await delay(750)
  if (input.email === 'taken@example.com') {
    throw new Error('이미 사용 중인 이메일입니다')
  }
  return {
    user: {
      name: input.name,
      email: input.email,
    },
  }
}
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 커밋

```bash
git add src/features/auth/lib/mock-auth-api.ts
git commit -m "feat: add mock auth API with 750ms delay and failure cases"
```

---

## Task 6: Zustand 인증 스토어 작성

**Files:**
- Create: `src/features/auth/store/auth.store.ts`

- [ ] `src/features/auth/store/auth.store.ts` 생성

```typescript
import { create } from 'zustand'
import type { AuthUser } from '../types/auth'

interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  setUser: (user: AuthUser) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ isAuthenticated: true, user }),
  clearUser: () => set({ isAuthenticated: false, user: null }),
}))
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 커밋

```bash
git add src/features/auth/store/auth.store.ts
git commit -m "feat: add Zustand auth store"
```

---

## Task 7: TanStack Query Mutation 훅 작성

**Files:**
- Create: `src/features/auth/hooks/use-auth-mutation.ts`

- [ ] `src/features/auth/hooks/use-auth-mutation.ts` 생성

```typescript
'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { mockLogin, mockSignup } from '../lib/mock-auth-api'
import { useAuthStore } from '../store/auth.store'
import type { LoginInput, SignupInput } from '../types/auth'

export function useLoginMutation() {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: (data: LoginInput) => mockLogin(data),
    onSuccess: (response) => {
      setUser(response.user)
      router.push('/')
    },
  })
}

export function useSignupMutation() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: SignupInput) => mockSignup(data),
    onSuccess: () => {
      toast.success('가입이 완료되었습니다!')
      router.push('/auth/login')
    },
  })
}
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 커밋

```bash
git add src/features/auth/hooks/use-auth-mutation.ts
git commit -m "feat: add login and signup mutation hooks"
```

---

## Task 8: Auth Shell 레이아웃 컴포넌트 작성

**Files:**
- Create: `src/components/layout/auth-shell.tsx`

- [ ] 디렉터리 생성

```bash
mkdir -p src/components/layout
```

- [ ] `src/components/layout/auth-shell.tsx` 생성

```typescript
import type { ReactNode } from 'react'

interface AuthShellProps {
  children: ReactNode
  title: string
  subtitle: ReactNode
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* 왼쪽: 브랜드 패널 (lg 이상에서만 표시) */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-blue-800 to-blue-500 flex-col justify-between p-10 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className="font-semibold text-base">Auth Bootstrap</span>
          </div>
          <h1 className="text-2xl font-bold leading-relaxed mb-3">
            프론트엔드
            <br />
            시작 템플릿
          </h1>
          <p className="text-sm opacity-80 leading-relaxed">
            Next.js App Router 기반
            <br />
            인증 샘플 프로젝트
          </p>
        </div>
        <div className="text-xs opacity-50">shadcn/ui · Zustand · TanStack Query</div>
      </div>

      {/* 오른쪽: 폼 영역 */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
          <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 커밋

```bash
git add src/components/layout/auth-shell.tsx
git commit -m "feat: add auth shell split layout component"
```

---

## Task 9: 로그인 페이지 구현

**Files:**
- Create: `src/features/auth/components/login-form.tsx`
- Create: `src/app/auth/login/page.tsx`

- [ ] `src/features/auth/components/login-form.tsx` 생성

```typescript
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'motion/react'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useLoginMutation } from '../hooks/use-auth-mutation'
import { loginSchema, type LoginFormValues } from '../schema/auth.schema'

export function LoginForm() {
  const { mutate, isPending, isError, error } = useLoginMutation()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence>
        {isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : '오류가 발생했습니다'}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input placeholder="이메일을 입력하세요" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input placeholder="비밀번호를 입력하세요" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? '처리 중...' : '로그인'}
          </Button>
        </form>
      </Form>
    </motion.div>
  )
}
```

- [ ] 디렉터리 생성 후 `src/app/auth/login/page.tsx` 생성

```bash
mkdir -p src/app/auth/login src/app/auth/signup
```

```typescript
import Link from 'next/link'
import { AuthShell } from '@/components/layout/auth-shell'
import { LoginForm } from '@/features/auth/components/login-form'

export default function LoginPage() {
  return (
    <AuthShell
      title="로그인"
      subtitle={
        <>
          계정이 없으신가요?{' '}
          <Link href="/auth/signup" className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 개발 서버 실행 후 `/auth/login` 브라우저 확인

```bash
pnpm run dev
```

확인 항목:
- 좌우 분할 레이아웃이 렌더링된다 (lg 화면 기준)
- 이메일/비밀번호 입력 필드가 표시된다
- 빈 폼 제출 시 인라인 에러 메시지가 표시된다
- `fail@example.com`으로 로그인 시 750ms 후 상단 Alert에 에러가 표시된다
- 다른 이메일로 로그인 시 750ms 후 홈(`/`)으로 이동한다

- [ ] 커밋

```bash
git add src/features/auth/components/login-form.tsx src/app/auth/login/page.tsx
git commit -m "feat: implement login page with form validation and mock API"
```

---

## Task 10: 회원가입 페이지 구현

**Files:**
- Create: `src/features/auth/components/signup-form.tsx`
- Create: `src/app/auth/signup/page.tsx`

- [ ] `src/features/auth/components/signup-form.tsx` 생성

```typescript
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'motion/react'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useSignupMutation } from '../hooks/use-auth-mutation'
import { signupSchema, type SignupFormValues } from '../schema/auth.schema'

export function SignupForm() {
  const { mutate, isPending, isError, error } = useSignupMutation()

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence>
        {isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : '오류가 발생했습니다'}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <FormControl>
                  <Input placeholder="이름을 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input placeholder="이메일을 입력하세요" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input placeholder="8자 이상 입력하세요" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 확인</FormLabel>
                <FormControl>
                  <Input placeholder="비밀번호를 다시 입력하세요" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? '처리 중...' : '회원가입'}
          </Button>
        </form>
      </Form>
    </motion.div>
  )
}
```

- [ ] `src/app/auth/signup/page.tsx` 생성

```typescript
import Link from 'next/link'
import { AuthShell } from '@/components/layout/auth-shell'
import { SignupForm } from '@/features/auth/components/signup-form'

export default function SignupPage() {
  return (
    <AuthShell
      title="회원가입"
      subtitle={
        <>
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  )
}
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 개발 서버에서 `/auth/signup` 브라우저 확인

확인 항목:
- 이름/이메일/비밀번호/비밀번호 확인 4개 필드가 표시된다
- 비밀번호 불일치 시 confirmPassword 필드 아래 인라인 에러가 표시된다
- `taken@example.com`으로 가입 시 750ms 후 상단 Alert에 에러가 표시된다
- 다른 이메일로 가입 시 750ms 후 "가입이 완료되었습니다!" toast + `/auth/login`으로 이동한다

- [ ] 커밋

```bash
git add src/features/auth/components/signup-form.tsx src/app/auth/signup/page.tsx
git commit -m "feat: implement signup page with form validation and mock API"
```

---

## Task 11: 홈 페이지 구현

**Files:**
- Create: `src/app/page.tsx`

- [ ] `src/app/page.tsx` 생성

```typescript
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/features/auth/store/auth.store'

export default function HomePage() {
  const { isAuthenticated, user, clearUser } = useAuthStore()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">Auth Bootstrap</h1>
      <p className="text-sm text-gray-500 mb-8">Next.js 프론트엔드 시작 템플릿</p>

      <div
        className={`rounded-lg border p-4 mb-6 w-full max-w-xs text-sm ${
          isAuthenticated ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200'
        }`}
      >
        <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-400">
          인증 상태
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          {isAuthenticated ? (
            <span className="text-green-700 font-medium">{user?.email}</span>
          ) : (
            <span className="text-gray-500">로그인하지 않음</span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        {isAuthenticated ? (
          <Button variant="outline" onClick={clearUser}>
            로그아웃
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/auth/login">로그인</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/signup">회원가입</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] TypeScript 오류 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 개발 서버에서 `/` 브라우저 확인

확인 항목:
- 비로그인 상태: 회색 배지 + "로그인", "회원가입" 버튼
- 로그인 후 홈으로 돌아왔을 때: 초록 배지 + 이메일 표시 + "로그아웃" 버튼
- "로그아웃" 클릭 시 회색 배지 상태로 전환

- [ ] 커밋

```bash
git add src/app/page.tsx
git commit -m "feat: implement home page with auth state display"
```

---

## Task 12: README 업데이트 및 최종 검증

**Files:**
- Modify: `README.md`

- [ ] `README.md` 전체 교체

```markdown
# Auth Bootstrap

Next.js App Router 기반 프론트엔드 시작 템플릿입니다.
회원가입/로그인 샘플 페이지를 mock 기반으로 구현했습니다.

## 기술 스택

Next.js (App Router), TypeScript, React 19, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, React Hook Form, Zod, Motion, pnpm, Biome

## 실행 방법

```bash
pnpm install
pnpm run dev
```

## 구현 범위

- `/` — 홈 (인증 상태 표시)
- `/auth/login` — 로그인 페이지
- `/auth/signup` — 회원가입 페이지

## Mock 정책

- 모든 요청에 750ms 지연
- `fail@example.com`으로 로그인 시 실패
- `taken@example.com`으로 회원가입 시 실패

## 검증 명령

```bash
pnpm run lint
pnpm exec tsc --noEmit
```
```

- [ ] Biome 린트 전체 통과 확인

```bash
pnpm run lint
```

Expected: 오류 없음 (경고는 있을 수 있으나 `error` 없음)

- [ ] TypeScript 전체 통과 확인

```bash
pnpm exec tsc --noEmit
```

Expected: 오류 없음

- [ ] 개발 서버 전체 시나리오 수동 검증

```bash
pnpm run dev
```

수동 확인 시나리오:
1. `/` 홈 — 비로그인 상태 확인
2. "로그인" 클릭 → `/auth/login` 이동
3. 빈 폼 제출 → 인라인 에러 확인
4. `fail@example.com` / `password123` 입력 → "처리 중..." 표시 → 에러 Alert 확인
5. `test@example.com` / `password123` 입력 → 750ms 후 홈(`/`) 이동 → 초록 배지 + 이메일 표시
6. "로그아웃" → 회색 배지로 전환
7. "회원가입" 클릭 → `/auth/signup` 이동
8. `taken@example.com`으로 가입 → 에러 Alert 확인
9. 다른 이메일로 가입 → toast 표시 → `/auth/login`으로 이동

- [ ] 최종 커밋

```bash
git add README.md
git commit -m "docs: update README with pnpm setup, routes, and mock policy"
```
