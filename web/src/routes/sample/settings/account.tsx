import { AccountSettingsPage } from '@/sample/settings/pages/account-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/settings/account')({
  component: AccountSettingsPage,
});
