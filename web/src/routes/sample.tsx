import { SampleAdminShell } from '@/sample/layout/components/sample-admin-shell';
import { isSampleStandalonePath } from '@/sample/layout/navigation';
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router';

export const Route = createFileRoute('/sample')({
  component: SampleLayoutRoute,
});

function SampleLayoutRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (isSampleStandalonePath(pathname)) {
    return <Outlet />;
  }

  return (
    <SampleAdminShell>
      <Outlet />
    </SampleAdminShell>
  );
}
