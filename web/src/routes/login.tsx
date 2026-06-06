import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { TeamsLogin } from '@/features/office/components/teams-login';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  return <TeamsLogin onAuthenticated={() => navigate({ to: '/' })} />;
}
