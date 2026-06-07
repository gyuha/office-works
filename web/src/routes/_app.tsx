import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/auth.store';
import { AppShell } from '@/features/office/components/app-shell';

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
