import { NotificationsSettingsPage } from '@/sample/settings/pages/notifications-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/settings/notifications')({
  component: NotificationsSettingsPage,
});
