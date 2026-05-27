import { HelpCenterPage } from '@/sample/help-center/components/help-center-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/help-center')({
  component: HelpCenterPage,
});
