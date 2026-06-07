import { defineConfig } from '@hey-api/openapi-ts';

// 생성물(web/src/client/)은 FastAPI OpenAPI 스냅샷(api/openapi.json)에서 생성된다.
// 재생성: 루트 Taskfile의 `task gen-api` (openapi.json export → 이 설정으로 codegen).
// 손편집 금지 — 스펙을 바꾸고 재생성할 것. (ADR-0004)
export default defineConfig({
  input: '../api/openapi.json',
  output: {
    path: './src/client',
  },
  plugins: [
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: './src/lib/hey-api',
    },
    {
      name: '@tanstack/react-query',
    },
  ],
});
