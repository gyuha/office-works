import { client } from '@/client/client.gen';
import { useAuthStore } from '@/features/auth/store/auth.store';

// hey-api 생성 클라이언트(@/client)의 런타임 인터셉터.
//  - 요청: auth store의 accessToken을 Bearer로 부착
//  - 응답: 401이면 세션을 비우고 로그인으로 이동(자동 토큰 갱신은 범위 밖 — ADR-0004)
// baseUrl은 src/lib/hey-api.ts의 createClientConfig에서 주입된다.
// 이 모듈은 앱 부팅 시 1회 import되어 인터셉터를 등록한다.

let registered = false;

export function setupApiClient(): void {
  if (registered) return;
  registered = true;

  client.interceptors.request.use((request) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  });

  client.interceptors.response.use((response) => {
    if (response.status === 401) {
      useAuthStore.getState().clearUser();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return response;
  });
}
