import { AuthShell } from '@/components/layout/auth-shell';
import { LoginForm } from '@/features/auth/components/login-form';
import { Link, createFileRoute } from '@tanstack/react-router';

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
