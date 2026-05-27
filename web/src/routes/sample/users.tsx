import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/users')({
  component: SampleUsersLayoutRoute,
});

function SampleUsersLayoutRoute() {
  return <Outlet />;
}
