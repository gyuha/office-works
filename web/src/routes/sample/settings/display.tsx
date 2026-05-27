import { DisplaySettingsPage } from '@/sample/settings/pages/display-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/settings/display')({
  component: DisplaySettingsPage,
});
