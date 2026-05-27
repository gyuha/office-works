import { AppearanceSettingsPage } from '@/sample/settings/pages/appearance-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/settings/appearance')({
  component: AppearanceSettingsPage,
});
