import { UserEditPage } from '@/sample/users/components/user-edit-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/users/$userId/edit')({
  component: SampleUserEditRoute,
});

function SampleUserEditRoute() {
  const { userId } = Route.useParams();

  return <UserEditPage userId={userId} />;
}
