import { createFileRoute, redirect } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/auth.store';
import { LoginScreen } from '@/features/office/components/login-screen';

interface LoginSearch {
  error?: string;
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginScreen,
});
