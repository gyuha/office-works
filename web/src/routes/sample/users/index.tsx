import { UsersPage } from '@/sample/users/components/users-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/users/')({
  component: UsersPage,
});
