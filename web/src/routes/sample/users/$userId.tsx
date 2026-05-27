import { UserDetailPage } from '@/sample/users/components/user-detail-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/users/$userId')({
  component: SampleUserDetailRoute,
});

function SampleUserDetailRoute() {
  const { userId } = Route.useParams();

  return <UserDetailPage userId={userId} />;
}
