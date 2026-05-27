import { UserCreatePage } from '@/sample/users/components/user-create-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/users/new')({
  component: UserCreatePage,
});
