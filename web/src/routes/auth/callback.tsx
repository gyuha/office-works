import { createFileRoute, redirect } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/auth.store';
import { apiFetch } from '@/lib/api';

interface MeResponse {
  email: string;
  display_name: string | null;
}

function parseTokensFromHash(hash: string): { accessToken: string; refreshToken: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

export const Route = createFileRoute('/auth/callback')({
  beforeLoad: async () => {
    const tokens = parseTokensFromHash(window.location.hash);
    if (!tokens) {
      throw redirect({ to: '/login', search: { error: 'oauth' } });
    }

    const store = useAuthStore.getState();
    store.setTokens(tokens);

    const res = await apiFetch('/api/v1/auth/me', {}, tokens.accessToken);
    if (!res.ok) {
      store.clearUser();
      throw redirect({ to: '/login', search: { error: 'oauth' } });
    }

    const me: MeResponse = await res.json();
    store.setUser({ name: me.display_name ?? me.email.split('@')[0], email: me.email });

    throw redirect({ to: '/' });
  },
});
