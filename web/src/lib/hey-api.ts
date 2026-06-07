import type { CreateClientConfig } from '@/client/client.gen';

// hey-api 생성 클라이언트의 런타임 설정(생성 시점에 createClientConfig로 주입).
// baseUrl은 환경변수, Bearer 토큰/401 처리는 src/lib/api-client.ts의 인터셉터에서.
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
});
