import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { Link, createFileRoute } from '@tanstack/react-router';

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
