# Next.js → Vite + TanStack Router 마이그레이션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `temp/` 의 Next.js 15 부트스트랩을 동일 저장소 루트에 React 19 + Vite + TanStack Router (file-based) + Tailwind v4 + 재초기화된 shadcn 으로 옮긴다. 동작은 100% 보존.

**Architecture:** B안 (shadcn 재초기화). Step 1~2 에서 Vite 골격과 Tailwind v4 를 세우고, Step 3 에서 shadcn CLI 로 컴포넌트를 v4 표준으로 재설치하며, Step 4 에서 자체 코드(features, stores, hooks, modal)를 next/* 패치 후 이전, Step 5 에서 라우트 4개를 file-based 형식으로 재배치, Step 6 에서 부속 자산 이전 및 `temp/` 제거.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, `@tanstack/react-router` (file-based via `@tanstack/router-plugin/vite`), `@tanstack/react-query`, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn (`base-nova` style, `neutral` baseColor, `lucide` icons), Zustand 5, react-hook-form 7 + Zod 3, sonner, pnpm 10.

**참조 스펙:** `docs/superpowers/specs/2026-05-09-vite-migration-design.md`

---

## 사전 조건

- 현재 디렉토리: `/Users/gyuha/workspace/react-bootstrap`
- 현 git 상태: `main` 브랜치, clean
- `temp/` 가 `.gitignore` 에 등록되어 있음 → temp 파일은 git 추적 대상 아님. 마이그레이션 도중에는 참조 자료로만 사용, 마지막 Step 6 에서 `rm -rf temp/` 후 `.gitignore` 의 `temp/` 라인도 제거
- pnpm 10+ 가 시스템에 설치되어 있어야 함 (`pnpm --version` 으로 확인)

## 파일 구조 (계획 종료 시점)

```
react-bootstrap/
├── .gitignore                          # 갱신
├── .pnpm-build-policy.json             # temp 에서 이전
├── biome.json                          # temp 에서 이전
├── components.json                     # 신규 (rsc:false 패치된 사본)
├── docs/
│   └── superpowers/                    # 본 plan/spec 보존
│       ├── plans/
│       └── specs/
├── index.html                          # 신규
├── package.json                        # 신규 (Vite 기반)
├── pnpm-lock.yaml                      # 신규 (pnpm install 산출)
├── pnpm-workspace.yaml                 # 신규 (onlyBuiltDependencies)
├── PRD.md                              # temp 에서 이전
├── README.md                           # temp 에서 이전 (Vite 기준 갱신)
├── tsconfig.json                       # 신규
├── tsconfig.node.json                  # 신규
├── vite.config.ts                      # 신규
└── src/
    ├── main.tsx                        # 신규
    ├── styles/globals.css              # 신규 (Tailwind v4)
    ├── routeTree.gen.ts                # 자동 생성, .gitignore 처리
    ├── routes/
    │   ├── __root.tsx                  # 신규 (Providers + Outlet + Modals + Toaster + DevTools)
    │   ├── index.tsx                   # temp app/page.tsx 변환
    │   ├── auth/
    │   │   ├── login.tsx               # temp app/auth/login/page.tsx 변환
    │   │   └── signup.tsx              # temp app/auth/signup/page.tsx 변환
    │   └── test/
    │       └── modal.tsx               # temp app/test/modal/page.tsx 변환
    ├── lib/
    │   ├── utils.ts                    # temp 그대로
    │   └── router.ts                   # 신규 (createRouter + Register)
    ├── providers/
    │   └── app-providers.tsx           # temp app/providers.tsx 변환
    ├── components/
    │   ├── ui/                         # shadcn CLI 재설치 (20개)
    │   │   ├── modal/                  # temp 자체 코드 그대로 (7파일)
    │   │   └── string-to-html.tsx      # temp 자체 코드 그대로
    │   └── layout/
    │       └── auth-shell.tsx          # temp 그대로
    ├── features/
    │   └── auth/                       # temp 그대로 (use-auth-mutation 만 패치)
    ├── stores/                         # temp 그대로
    └── hooks/                          # temp 그대로
```

---

## Step 1 — Vite 골격 (Task 1~4)

### Task 1: package.json 작성

**Files:**
- Create: `package.json`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "react-bootstrap",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write ."
  },
  "dependencies": {
    "@base-ui/react": "^1.4.1",
    "@fontsource-variable/inter": "^5.1.1",
    "@hookform/resolvers": "^4.1.3",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-slot": "^1.2.0",
    "@tanstack/react-query": "^5.75.0",
    "@tanstack/react-router": "^1.95.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "immer": "^11.1.4",
    "lucide-react": "^0.487.0",
    "motion": "^11.18.0",
    "react": "^19.0.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "^19.0.0",
    "react-focus-lock": "^2.13.7",
    "react-hook-form": "^7.55.0",
    "sonner": "^2.0.3",
    "tailwind-merge": "^2.6.0",
    "tw-animate-css": "^1.4.0",
    "zod": "^3.24.2",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@tailwindcss/vite": "^4.0.0",
    "@tanstack/router-devtools": "^1.95.0",
    "@tanstack/router-plugin": "^1.95.0",
    "@types/node": "^22.14.1",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.8.3",
    "vite": "^6.0.0",
    "vite-tsconfig-paths": "^5.1.4"
  },
  "packageManager": "pnpm@10.28.2",
  "engines": {
    "node": ">=18.17.0",
    "pnpm": ">=10.0.0"
  }
}
```

- [ ] **Step 2: pnpm-workspace.yaml 작성**

```yaml
onlyBuiltDependencies:
  - '@biomejs/biome'
  - esbuild
```

- [ ] **Step 3: pnpm install 실행**

```bash
pnpm install
```
Expected: `node_modules/` 와 `pnpm-lock.yaml` 생성, 에러 0.

- [ ] **Step 4: 커밋 보류 (Task 4 통합 커밋까지 대기)**

이 Task 의 산출물은 Task 4 의 커밋에 포함된다.

---

### Task 2: TS / Vite / index.html 설정

**Files:**
- Create: `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`

- [ ] **Step 1: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "useDefineForClassFields": true,
    "allowSyntheticDefaultImports": true,
    "verbatimModuleSyntax": false,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "src/routeTree.gen.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 2: tsconfig.node.json 작성**

`composite: true` 가 있는 referenced 프로젝트는 `noEmit: true` 와 호환되지 않는다 (TS6310). 대신 emit 산출물을 `node_modules/.tmp/` 로 redirect 해 repo 루트 오염을 막는다.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "composite": true,
    "strict": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./node_modules/.tmp/tsc-node",
    "tsBuildInfoFile": "./node_modules/.tmp/tsc-node/tsconfig.node.tsbuildinfo"
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: vite.config.ts 작성**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
    open: false,
  },
});
```

- [ ] **Step 4: index.html 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Auth Bootstrap</title>
    <meta name="description" content="Vite 프론트엔드 시작 템플릿" />
  </head>
  <body class="font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 커밋 보류 (Task 4 통합 커밋까지 대기)**

---

### Task 3: 부트스트랩 코드 (main + router + 빈 라우트)

**Files:**
- Create: `src/main.tsx`, `src/lib/router.ts`, `src/routes/__root.tsx`, `src/routes/index.tsx`

- [ ] **Step 1: src/lib/router.ts 작성 (라우터 인스턴스 + 모듈 declare)**

```ts
import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

- [ ] **Step 2: src/routes/\_\_root.tsx 작성 (최소 골격)**

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return <Outlet />;
}
```

- [ ] **Step 3: src/routes/index.tsx 작성 (placeholder)**

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

function IndexPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Vite bootstrap online</h1>
    </main>
  );
}
```

- [ ] **Step 4: src/main.tsx 작성**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/lib/router';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

- [ ] **Step 5: .gitignore 갱신 — routeTree.gen.ts 와 dist 추가, next 항목 정리**

`.gitignore` 의 다음 라인을 변경:
- `# next.js` 섹션 (`/.next/`, `/out/`) → 삭제
- `next-env.d.ts` 라인 → 삭제
- 새 라인 추가:
  ```
  # vite
  /dist

  # tanstack router
  src/routeTree.gen.ts
  ```

(`temp/` 라인은 Step 6 커밋에서 마지막에 제거)

- [ ] **Step 6: 커밋 보류 (Task 4 통합 커밋까지 대기)**

---

### Task 4: dev 서버 검증 + Step 1 통합 커밋

- [ ] **Step 1: dev 서버 기동**

```bash
pnpm dev
```
Expected: `Local: http://localhost:3000/` 출력 + 콘솔 에러 0.

- [ ] **Step 2: 라우트 트리 자동 생성 확인**

```bash
ls src/routeTree.gen.ts
```
Expected: 파일 존재 (router-plugin 이 dev 시작 시 생성).

- [ ] **Step 3: 브라우저로 http://localhost:3000/ 접속**

Expected: "Vite bootstrap online" 헤딩 렌더, 콘솔 에러 0.

- [ ] **Step 4: dev 서버 종료**

`Ctrl+C` 로 dev 서버 종료.

- [ ] **Step 5: 타입체크**

```bash
pnpm typecheck
```
Expected: 0 에러.

- [ ] **Step 6: Step 1 통합 커밋**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml \
  tsconfig.json tsconfig.node.json vite.config.ts index.html \
  src/main.tsx src/lib/router.ts src/routes/__root.tsx src/routes/index.tsx \
  .gitignore
git commit -m "feat: scaffold Vite + React + TanStack Router project skeleton

- Add Vite 6 + React 19 + TanStack Router file-based routing
- Configure pnpm workspace and tsconfig with @/* path alias
- Verify empty router renders at http://localhost:3000/

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Step 2 — Tailwind v4 + globals.css (Task 5~7)

### Task 5: Tailwind v4 globals.css 작성

**Files:**
- Create: `src/styles/globals.css`

- [ ] **Step 1: src/styles/globals.css 헤더 + @theme 매핑 작성**

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: "Inter Variable", "Inter", "Segoe UI", "Helvetica Neue", sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

- [ ] **Step 2: oklch 토큰 블록 추가 (`:root` + `.dark`)**

`temp/src/app/globals.css:20-127` 의 `:root { ... }` 와 `.dark { ... }` 블록 전체를 그대로 `src/styles/globals.css` 끝에 이어붙인다 (단, 바깥의 `@layer base { ... }` 래퍼는 제거하고 본 두 블록만 평면적으로 배치).

검증:
```bash
grep -c "oklch(" src/styles/globals.css
```
Expected: ~50 (light + dark 합계, temp 와 같은 개수).

- [ ] **Step 3: body / 보더 기본 스타일 추가 (파일 맨 아래)**

```css
@layer base {
  * {
    border-color: var(--border);
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
    letter-spacing: var(--tracking-normal, 0);
  }
}
```

---

### Task 6: 폰트 import + main.tsx 갱신

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: src/main.tsx 상단에 globals.css 와 Inter 폰트 import 추가**

`src/main.tsx` 전체를 다음으로 교체:

```tsx
import '@fontsource-variable/inter';
import '@/styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/lib/router';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

---

### Task 7: Tailwind 적용 검증 + Step 2 커밋

- [ ] **Step 1: routes/index.tsx 에 Tailwind 클래스 적용 확인용 마크업 추가**

`src/routes/index.tsx` 의 `IndexPage` 본문을 다음으로 교체:

```tsx
function IndexPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Tailwind v4 OK</h1>
        <p className="mt-2 text-sm text-muted-foreground">Inter Variable / oklch 토큰 동작</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: dev 서버 기동 + 브라우저 검증**

```bash
pnpm dev
```
브라우저에서 http://localhost:3000/ 확인:
- 카드가 중앙 정렬, border/shadow 표시
- 폰트가 Inter Variable (개발자 도구 Computed → font-family 에 "Inter Variable" 포함)
- 콘솔 에러 0

종료: `Ctrl+C`.

- [ ] **Step 3: Step 2 통합 커밋**

```bash
git add src/styles/globals.css src/main.tsx src/routes/index.tsx
git commit -m "feat: add Tailwind v4 with shadcn oklch tokens and Inter font

- src/styles/globals.css with @theme inline mapping
- @fontsource-variable/inter for offline font bundling
- Verify utilities + tokens + font apply at /

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Step 3 — shadcn 재초기화 (Task 8~9)

### Task 8: components.json 작성 + shadcn add 일괄 설치

**Files:**
- Create: `components.json`

- [ ] **Step 1: components.json 작성**

`temp/components.json` 의 사본에서 `rsc: true → false`, `tailwind.config: "tailwind.config.ts" → ""`, `tailwind.css: "src/app/globals.css" → "src/styles/globals.css"` 만 패치:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

- [ ] **Step 2: src/lib/utils.ts 미리 생성 (shadcn 컴포넌트가 import)**

`temp/src/lib/utils.ts` 를 그대로 `src/lib/utils.ts` 로 복사:

```bash
cp temp/src/lib/utils.ts src/lib/utils.ts
```

만약 temp 의 utils.ts 가 다음과 다르면 그대로 둔다:
```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: shadcn 일괄 설치**

```bash
pnpm dlx shadcn@latest add -y \
  button card input label form dialog \
  alert alert-dialog accordion badge calendar pagination progress \
  radio-group scroll-area select skeleton sonner switch tabs
```

Expected:
- `src/components/ui/` 아래 20개 `.tsx` 파일 생성
- 추가 dependencies (없는 경우) `@radix-ui/*` 등 자동 설치
- 만약 `style: "base-nova"` 이 레지스트리에 없어 실패하면 fallback:
  ```bash
  # components.json 의 "style" 을 "new-york" 으로 변경 후 재시도
  ```
  (이 fallback 발생 여부는 STDOUT 에서 "style not found" 여부로 판정. 발생 시 commit 메시지에 명시.)

**알려진 부작용 (수용)**:
- `base-nova` 의 `form` 레지스트리는 stub 이므로 form 만 `new-york-v4` 에서 가져온다 (`pnpm dlx shadcn@latest add https://ui.shadcn.com/r/styles/new-york-v4/form.json`). form.tsx 는 `radix-ui` 통합 패키지 사용.
- shadcn CLI 가 `react-day-picker` 를 v10 으로 강제 bump 한다 (base-nova `calendar.tsx` 가 v10 슬롯 키 사용). 이를 받아들이고 plan 의 ^9.14.0 핀은 ^10.0.0 으로 갱신.
- `calendar.tsx` 의 `table:` ClassName 키를 v10 의 `month_grid:` 로 패치 필요 (없으면 typecheck 실패).
- `scroll-area.tsx` 의 `import * as React from "react"` 가 unused 로 strict-TS 에 걸림 → 제거.
- `package.json` 에 `radix-ui ^1.4.3` 가 추가됨 (form.tsx 가 사용). 이전의 개별 `@radix-ui/react-label`, `@radix-ui/react-slot` 는 미사용 잉여로 남지만 Step 단위 깔끔함을 위해 그대로 둔다 (제거하려면 Step 6 마무리에서).
- shadcn upstream `form.tsx` 의 `useFormField` 가드가 dereference **이후** 에 위치한 버그를 우리 코드에서 즉시 패치한다 (`fieldContext.name` 검사를 hook 호출 전으로 hoist).

- [ ] **Step 4: shadcn sonner 컴포넌트가 next-themes 를 import 하는지 확인 후 패치**

```bash
grep -n "next-themes" src/components/ui/sonner.tsx
```

만약 결과가 있으면 sonner.tsx 를 다음으로 교체 (next-themes 의존 제거, 기존 temp 의 커스터마이징 유지):

```tsx
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
```

---

### Task 9: shadcn 컴파일 검증 + Step 3 커밋

- [ ] **Step 1: 타입체크**

```bash
pnpm typecheck
```
Expected: 0 에러.

- [ ] **Step 2: routes/index.tsx 의 Tailwind 검증 마크업 원복 (placeholder 로)**

```tsx
function IndexPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Vite bootstrap online</h1>
    </main>
  );
}
```

(이는 Task 15 에서 최종 HomePage 로 다시 교체된다.)

- [ ] **Step 3: dev 기동 후 콘솔 에러 0 확인**

```bash
pnpm dev
```
브라우저 http://localhost:3000/ 에서 콘솔 에러 0. `Ctrl+C` 로 종료.

- [ ] **Step 4: Step 3 통합 커밋**

```bash
git add components.json src/lib/utils.ts src/components/ui pnpm-lock.yaml package.json src/routes/index.tsx
git commit -m "feat: re-init shadcn ui components for Vite + Tailwind v4

- Install 20 shadcn components via CLI (base-nova / neutral / lucide)
- Patch sonner.tsx to drop next-themes dependency
- rsc:false in components.json for Vite environment

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Step 4 — 자체 코드 이전 (Task 10~14)

### Task 10: 단순 복사 대상 (utils 외 6 파일군)

**Files:**
- Copy from `temp/src/` to `src/`:
  - `hooks/use-mobile.ts`
  - `stores/modal-store.ts`, `stores/modal.types.ts`
  - `components/layout/auth-shell.tsx`
  - `components/ui/modal/*.tsx` (7 파일)
  - `components/ui/string-to-html.tsx`

- [ ] **Step 1: 디렉토리 준비 및 단순 복사**

```bash
mkdir -p src/hooks src/stores src/components/layout src/components/ui/modal
cp temp/src/hooks/use-mobile.ts src/hooks/use-mobile.ts
cp temp/src/stores/modal-store.ts src/stores/modal-store.ts
cp temp/src/stores/modal.types.ts src/stores/modal.types.ts
cp temp/src/components/layout/auth-shell.tsx src/components/layout/auth-shell.tsx
cp temp/src/components/ui/string-to-html.tsx src/components/ui/string-to-html.tsx
cp temp/src/components/ui/modal/modal.tsx src/components/ui/modal/modal.tsx
cp temp/src/components/ui/modal/modal-backdrop.tsx src/components/ui/modal/modal-backdrop.tsx
cp temp/src/components/ui/modal/modal-container.tsx src/components/ui/modal/modal-container.tsx
cp temp/src/components/ui/modal/modal-default.tsx src/components/ui/modal/modal-default.tsx
cp temp/src/components/ui/modal/modal-form.tsx src/components/ui/modal/modal-form.tsx
cp temp/src/components/ui/modal/modal-header.tsx src/components/ui/modal/modal-header.tsx
cp temp/src/components/ui/modal/modal-manager.tsx src/components/ui/modal/modal-manager.tsx
```

- [ ] **Step 2: 'use client' 일괄 제거**

```bash
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec \
  sed -i '' "/^'use client';$/d" {} +
```

검증:
```bash
grep -rn "'use client'" src/
```
Expected: 결과 0건.

- [ ] **Step 3: next/* import 검색 — 이 단계 산출물에 없어야 함**

```bash
grep -rn "from 'next/" src/
```
Expected: 결과 0건. (modal/* 와 layout/auth-shell 은 next 의존이 없음을 사전 확인)

- [ ] **Step 4: 타입체크**

```bash
pnpm typecheck
```
Expected: 0 에러.

---

### Task 11: features/auth 이전 + use-auth-mutation 패치

**Files:**
- Copy from `temp/src/features/auth/` to `src/features/auth/` (전체 트리)
- Modify: `src/features/auth/hooks/use-auth-mutation.ts`

- [ ] **Step 1: features/auth 전체 복사**

```bash
mkdir -p src/features/auth/{components,hooks,lib,schema,store,types}
cp temp/src/features/auth/types/auth.ts src/features/auth/types/auth.ts
cp temp/src/features/auth/schema/auth.schema.ts src/features/auth/schema/auth.schema.ts
cp temp/src/features/auth/lib/mock-auth-api.ts src/features/auth/lib/mock-auth-api.ts
cp temp/src/features/auth/store/auth.store.ts src/features/auth/store/auth.store.ts
cp temp/src/features/auth/components/login-form.tsx src/features/auth/components/login-form.tsx
cp temp/src/features/auth/components/signup-form.tsx src/features/auth/components/signup-form.tsx
cp temp/src/features/auth/hooks/use-auth-mutation.ts src/features/auth/hooks/use-auth-mutation.ts
```

- [ ] **Step 2: 'use client' 제거 (Task 10 의 sed 명령을 다시 실행)**

```bash
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec \
  sed -i '' "/^'use client';$/d" {} +
```

- [ ] **Step 3: src/features/auth/hooks/use-auth-mutation.ts 를 다음으로 교체 (next/navigation → @tanstack/react-router)**

```ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { mockLogin, mockSignup } from '../lib/mock-auth-api';
import { useAuthStore } from '../store/auth.store';
import type { LoginInput, SignupInput } from '../types/auth';

export function useLoginMutation() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (data: LoginInput) => mockLogin(data),
    onSuccess: (response) => {
      setUser(response.user);
      navigate({ to: '/' });
    },
  });
}

export function useSignupMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SignupInput) => mockSignup(data),
    onSuccess: () => {
      toast.success('가입이 완료되었습니다!');
      navigate({ to: '/auth/login' });
    },
  });
}
```

- [ ] **Step 4: 타입체크**

```bash
pnpm typecheck
```
Expected: 0 에러.

---

### Task 12: app-providers 작성

**Files:**
- Create: `src/providers/app-providers.tsx`

- [ ] **Step 1: src/providers/app-providers.tsx 작성**

`temp/src/app/providers.tsx` 를 Vite 형식으로 변환 (`'use client'` 제거):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm typecheck
```
Expected: 0 에러.

---

### Task 13: 잔여 next 의존 검증

- [ ] **Step 1: next/* import 0건 확인 (전체 src)**

```bash
grep -rn "from 'next" src/ || echo "OK: no next imports"
grep -rn "next-themes" src/ || echo "OK: no next-themes"
```
Expected: "OK:" 두 줄. (라우트 파일들은 아직 page.tsx 그대로일 수 있으므로 Task 15~18 에서 처리. 그러나 현재 상태의 src/ 에는 routes/index.tsx 만 있고 그건 placeholder 이므로 0건이어야 정상)

- [ ] **Step 2: 'use client' 0건 확인**

```bash
grep -rn "'use client'" src/ || echo "OK"
```
Expected: "OK".

---

### Task 14: Step 4 통합 커밋

- [ ] **Step 1: 타입체크 최종**

```bash
pnpm typecheck
```
Expected: 0 에러.

- [ ] **Step 2: 커밋**

```bash
git add src/hooks src/stores src/components/layout src/components/ui/modal \
  src/components/ui/string-to-html.tsx src/features src/providers
git commit -m "feat: port custom code from Next.js bootstrap to Vite

- Move features/auth, stores, hooks, modal manager, layout shell
- Patch use-auth-mutation to use TanStack Router useNavigate
- Strip all 'use client' directives (no SSR boundary in Vite)
- Add AppProviders wrapper for QueryClientProvider

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Step 5 — 라우트 재배치 (Task 15~20)

### Task 15: routes/index.tsx (HomePage)

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: src/routes/index.tsx 를 다음으로 교체**

```tsx
import { Link, createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/auth.store';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { isAuthenticated, user, clearUser } = useAuthStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">Auth Bootstrap</h1>
      <p className="text-sm text-gray-500 mb-8">Vite 프론트엔드 시작 템플릿</p>

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
            <Link to="/auth/login">
              <Button>로그인</Button>
            </Link>
            <Link to="/auth/signup">
              <Button variant="outline">회원가입</Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
```

---

### Task 16: routes/auth/login.tsx

**Files:**
- Create: `src/routes/auth/login.tsx`

- [ ] **Step 1: src/routes/auth/login.tsx 작성**

`temp/src/app/auth/login/page.tsx` 를 변환 (next/link → @tanstack/react-router Link, `'use client'` 없음, default export → named Route):

```tsx
import { Link, createFileRoute } from '@tanstack/react-router';
import { AuthShell } from '@/components/layout/auth-shell';
import { LoginForm } from '@/features/auth/components/login-form';

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthShell
      title="로그인"
      subtitle={
        <>
          계정이 없으신가요?{' '}
          <Link to="/auth/signup" className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
```

---

### Task 17: routes/auth/signup.tsx

**Files:**
- Create: `src/routes/auth/signup.tsx`

- [ ] **Step 1: src/routes/auth/signup.tsx 를 다음으로 작성**

```tsx
import { Link, createFileRoute } from '@tanstack/react-router';
import { AuthShell } from '@/components/layout/auth-shell';
import { SignupForm } from '@/features/auth/components/signup-form';

export const Route = createFileRoute('/auth/signup')({
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthShell
      title="회원가입"
      subtitle={
        <>
          이미 계정이 있으신가요?{' '}
          <Link to="/auth/login" className="text-blue-600 hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
```

---

### Task 18: routes/test/modal.tsx

**Files:**
- Create: `src/routes/test/modal.tsx`

(원본 `temp/src/app/test/modal/page.tsx` 는 `next/*` import 가 없고 `'use client'` 만 있다. 따라서 단순 복사 + `'use client'` 제거 + `createFileRoute` boilerplate 추가.)

- [ ] **Step 1: src/routes/test/modal.tsx 를 다음으로 작성**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import useModal from '@/stores/modal-store';

export const Route = createFileRoute('/test/modal')({
  component: ModalTestPage,
});

function ModalTestPage() {
  const { openModal, closeModal, closeAllModal, modalCount } = useModal();
  const portalTargetRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Modal 테스트</h1>
      <p className="text-muted-foreground">
        열린 모달 수: <span className="font-mono font-bold">{modalCount()}</span>
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Alert 모달</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              openModal('간단한 alert 모달입니다.');
            }}
          >
            기본 Alert
          </Button>
          <Button
            onClick={() => {
              openModal({
                alert: '삭제하시겠습니까?',
                title: '삭제 확인',
                txtCancel: '아니오',
                handleOk: () => {
                  alert('삭제 완료!');
                  closeModal();
                },
              });
            }}
          >
            확인/취소 Alert
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Content 모달</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              openModal({
                title: '상세 정보',
                content: '이것은 content 모달입니다. 더 긴 텍스트도 표시할 수 있습니다.',
                size: 'md',
              });
            }}
          >
            Content 모달 (md)
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              openModal({
                title: '정보 포함',
                info: 'SELECT * FROM users WHERE id = 1;',
                content: '쿼리 결과를 확인하세요.',
                size: 'lg',
              });
            }}
          >
            Info + Content 모달 (lg)
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Form 모달</h2>
        <Button
          variant="secondary"
          onClick={() => {
            openModal({
              title: '이메일 입력',
              form: (
                <div className="space-y-3">
                  <label htmlFor="test-email" className="block text-sm font-medium">
                    이메일
                  </label>
                  <input
                    id="test-email"
                    type="email"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="test@example.com"
                  />
                  <Button size="sm" onClick={closeModal}>
                    제출
                  </Button>
                </div>
              ),
            });
          }}
        >
          Form 모달
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Custom 모달</h2>
        <Button
          variant="outline"
          onClick={() => {
            openModal({
              custom: (
                <div className="space-y-4 text-center">
                  <div className="text-4xl">🎉</div>
                  <h3 className="text-xl font-bold">커스텀 모달</h3>
                  <p className="text-muted-foreground">원하는 어떤 내용이든 넣을 수 있습니다.</p>
                  <Button onClick={closeModal}>닫기</Button>
                </div>
              ),
              size: 'sm',
              hideBottomButton: true,
            } as any);
          }}
        >
          Custom 모달
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">사이즈별 모달</h2>
        <div className="flex flex-wrap gap-2">
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Button key={size} variant="outline" size="sm" onClick={() => openModal({ alert: `${size} 사이즈 모달`, size, title: `Size: ${size}` })}>
              {size}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">다중 모달 (스택)</h2>
        <Button
          onClick={() => {
            openModal({ alert: '첫 번째 모달', title: '모달 1' });
            setTimeout(() => {
              openModal({ alert: '두 번째 모달 (위에 쌓임)', title: '모달 2' });
            }, 300);
            setTimeout(() => {
              openModal({ alert: '세 번째 모달!', title: '모달 3' });
            }, 600);
          }}
        >
          3개 모달 열기
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">ESC 방지 모달</h2>
        <Button
          variant="destructive"
          onClick={() => {
            openModal({
              alert: 'ESC 키로 닫을 수 없습니다. 확인 버튼을 눌러주세요.',
              title: 'ESC 비활성화',
              disabledEscKey: true,
              backdropDismiss: true,
              handleOk: () => closeModal(),
            });
          }}
        >
          ESC 비활성화 모달
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Portal 모달</h2>
        <p className="text-muted-foreground text-sm">
          portalTarget을 지정하면 모달창이 해당 컨테이너의 React 트리 내에서 렌더링됩니다.
        </p>
        <div className="inline-flex">
          <Button
            variant="outline"
            className={cn('flex items-center gap-2')}
            onClick={() => {
              openModal(
                {
                  title: '새 채팅채널 만들기',
                  custom: (
                    <div className="space-y-4 p-2">
                      <div className="space-y-2">
                        <label htmlFor="channel-name" className="text-sm font-medium">
                          채널 이름
                        </label>
                        <Input id="channel-name" placeholder="채널 이름을 입력하세요" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={closeModal}>
                          취소
                        </Button>
                        <Button size="sm" onClick={closeModal}>
                          만들기
                        </Button>
                      </div>
                    </div>
                  ),
                  size: 'sm',
                  hideBottomButton: true,
                },
                false,
                { portal: true, portalTarget: portalTargetRef },
              );
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Portal 모달 열기</span>
          </Button>
          <div ref={portalTargetRef} />
        </div>
      </section>

      <div className="pt-4">
        <Button
          variant="secondary"
          onClick={closeAllModal}
          className="w-full"
        >
          모든 모달 닫기
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 19: \_\_root.tsx 통합 (Providers + Outlet + Modals + Toaster + DevTools)

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: src/routes/\_\_root.tsx 를 다음으로 교체**

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { AppProviders } from '@/providers/app-providers';
import Modals from '@/components/ui/modal/modal-manager';
import { Toaster } from '@/components/ui/sonner';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppProviders>
      <Outlet />
      <Modals />
      <Toaster />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </AppProviders>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm typecheck
```
Expected: 0 에러.

---

### Task 20: 4개 라우트 수동 검증 + Step 5 커밋

- [ ] **Step 1: dev 서버 기동**

```bash
pnpm dev
```

- [ ] **Step 2: 회귀 시나리오 1 — 홈**

브라우저 http://localhost:3000/ :
- "Auth Bootstrap" 타이틀 + "로그인하지 않음" 상태 표시
- "로그인", "회원가입" 버튼 노출
- 콘솔 에러 0

- [ ] **Step 3: 회귀 시나리오 2 — 로그인 폼 검증**

http://localhost:3000/auth/login :
- 빈 값 제출 시 zod validation 메시지
- mock 자격증명 (login-form.tsx 또는 mock-auth-api.ts 가 허용하는 값) 으로 제출 시 `/` 로 이동 + isAuthenticated true 표시

- [ ] **Step 4: 회귀 시나리오 3 — 가입**

http://localhost:3000/auth/signup :
- 폼 제출 시 sonner toast "가입이 완료되었습니다!" 표시
- `/auth/login` 으로 이동

- [ ] **Step 5: 회귀 시나리오 4 — 모달**

http://localhost:3000/test/modal :
- 페이지의 모달 트리거 클릭 → 모달 열림
- 백드롭 클릭 / ESC 키 → 모달 닫힘
- `closeAllModal` 동작 확인 (해당 트리거가 있을 시)

- [ ] **Step 6: 로그아웃 회귀**

`/` 로 돌아가 "로그아웃" 클릭 → "로그인하지 않음" 으로 회귀.

- [ ] **Step 7: 콘솔 에러 0 + dev 서버 종료**

브라우저 개발자 도구 Console 탭에서 4개 라우트 모두 에러/경고 0 (TanStack Router 의 정보성 메시지는 허용).

`Ctrl+C` 로 dev 서버 종료.

- [ ] **Step 8: Step 5 커밋**

```bash
git add src/routes
git commit -m "feat: migrate 4 routes to TanStack Router file-based layout

- /, /auth/login, /auth/signup, /test/modal
- __root wires AppProviders, modal manager, toaster, dev tools
- Replace next/link with TanStack Router Link
- All manual regression scenarios pass

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Step 6 — 부속 자산 이전 + temp 제거 (Task 21~22)

### Task 21: 부속 자산 이전

**Files:**
- Move from `temp/` to root: `PRD.md`, `README.md`, `docs/` (병합), `biome.json`, `.pnpm-build-policy.json`

- [ ] **Step 1: 부속 자산 이동**

```bash
mv temp/PRD.md PRD.md
mv temp/biome.json biome.json
mv temp/.pnpm-build-policy.json .pnpm-build-policy.json
# docs/ 는 이미 본 plan/spec 이 있으므로 병합
mkdir -p docs
cp -R temp/docs/. docs/
```

- [ ] **Step 2: README.md 를 Vite 기준으로 재작성**

`README.md` 를 다음으로 교체 (temp/README.md 의 Next.js 부분만 갱신):

```markdown
# Auth Bootstrap (React + Vite)

React 19 + Vite + TanStack Router 기반 프론트엔드 부트스트랩.

## 스택

- React 19, TypeScript 5.8
- Vite 6 + `@tanstack/router-plugin/vite` (file-based routing)
- Tailwind CSS v4 (`@tailwindcss/vite`) + tw-animate-css
- shadcn/ui (`base-nova`, `neutral`, `lucide`)
- TanStack Query 5, Zustand 5
- react-hook-form 7 + Zod 3
- sonner (토스트), 자체 모달 매니저
- pnpm 10 (npm 사용 금지)

## 시작하기

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # 타입체크 + 프로덕션 빌드
pnpm preview      # 빌드 산출물 미리보기
pnpm typecheck    # 타입체크 단독
pnpm lint         # Biome
```

## 디렉토리

- `src/routes/` — file-based 라우트 (자동 생성된 `routeTree.gen.ts` 와 공존)
- `src/features/` — 도메인 단위 기능 (auth 등)
- `src/components/ui/` — shadcn 컴포넌트 + 자체 모달
- `src/stores/` — 전역 Zustand 스토어
- `src/lib/` — 유틸/라우터 인스턴스

## 라우트

- `/` — 홈, 인증 상태 표시
- `/auth/login`, `/auth/signup` — 폼 (mock API)
- `/test/modal` — 모달 매니저 데모
```

- [ ] **Step 3: temp 디렉토리 제거**

```bash
rm -rf temp
```

- [ ] **Step 4: .gitignore 의 `temp/` 라인 제거**

`.gitignore` 의 마지막 부근에 있는 `temp/` 한 줄을 삭제. (이미 디렉토리가 없으므로 더 이상 무시할 대상이 아님)

---

### Task 22: 최종 빌드 검증 + Step 6 커밋

- [ ] **Step 1: 타입체크**

```bash
pnpm typecheck
```
Expected: 0 에러.

- [ ] **Step 2: Biome 린트**

```bash
pnpm lint
```
Expected: 0 에러 (warning 허용).

- [ ] **Step 3: 프로덕션 빌드**

```bash
pnpm build
```
Expected: `dist/` 디렉토리 생성, 에러 0.

- [ ] **Step 4: preview 동작 확인**

```bash
pnpm preview
```
브라우저에서 표시되는 URL (예: http://localhost:4173/) 로 접속:
- 4개 라우트 모두 정상 렌더
- 콘솔 에러 0

`Ctrl+C` 로 종료.

- [ ] **Step 5: DoD 자동 검증 명령 일괄 실행**

```bash
echo "--- next imports ---"
grep -r "from 'next" src/ || echo "OK: 0"
echo "--- 'use client' ---"
grep -r "'use client'" src/ || echo "OK: 0"
echo "--- next deps ---"
grep -E '"next|"next-themes|"autoprefixer|"postcss"' package.json || echo "OK: 0"
echo "--- temp/ existence ---"
[ -d temp ] && echo "FAIL: temp still exists" || echo "OK: temp removed"
```
Expected:
- `OK: 0` (3 라인)
- `OK: temp removed`

- [ ] **Step 6: Step 6 최종 커밋**

```bash
git add PRD.md README.md docs biome.json .pnpm-build-policy.json .gitignore
# rm -rf 는 git rm 으로 추적
git rm -r temp 2>/dev/null || true
git commit -m "chore: migrate ancillary assets to root and remove temp/

- Move PRD.md, biome.json, .pnpm-build-policy.json, docs/ to repo root
- Rewrite README.md for Vite/TanStack Router stack
- Remove temp/ Next.js bootstrap (migration complete)
- Drop temp/ from .gitignore

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

(Note: `temp/` 가 .gitignore 에 있어 git 추적 대상이 아니었다면 `git rm -r temp` 는 "did not match any files" 로 실패하고 `|| true` 로 스킵된다. 이 경우 `rm -rf temp` 만으로 충분.)

---

## 완료 정의 (스펙 §6 와 동일)

다음 모두 충족 시 마이그레이션 완료:

- [ ] 루트에 Vite 기반 `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/` 존재
- [ ] `pnpm install` 후 lockfile 생성
- [ ] `pnpm dev` 기동 후 4개 라우트 모두 200 + 콘솔 에러 0
- [ ] `pnpm build` 성공 + `dist/` 산출
- [ ] `pnpm preview` 정상
- [ ] `pnpm typecheck` 0 에러
- [ ] `pnpm lint` 0 에러 (warning 허용)
- [ ] `temp/` 제거 완료
- [ ] `next`, `next-themes`, `autoprefixer`, `postcss` 가 의존성에 없음
- [ ] `grep -r "next/" src/` 0건, `grep -r "'use client'" src/` 0건
- [ ] 수동 회귀 시나리오 1~7 모두 정상
- [ ] `src/routeTree.gen.ts` 가 `.gitignore` 에 포함

## 롤백

각 Step 이 단일 커밋이므로 `git reset --hard <prev-commit>` 으로 이전 단계로 즉시 복귀. Step 6 (temp 제거) 이전까지 `temp/` 가 그대로 있어 참조 자료로 사용 가능.
