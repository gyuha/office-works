import { AppsPage } from '@/sample/apps/components/apps-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/apps')({
  component: AppsPage,
});
