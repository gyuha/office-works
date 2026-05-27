import { ProfileSettingsPage } from '@/sample/settings/pages/profile-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/settings/profile')({
  component: ProfileSettingsPage,
});
