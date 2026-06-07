import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/auth.store';
import { TeamsLogin } from '@/features/office/components/teams-login';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  return (
    <TeamsLogin
      onAuthenticated={() => {
        setUser({ name: '김지훈 대리', email: 'jihoon.kim@officemate.com' });
        navigate({ to: '/' });
      }}
    />
  );
}
