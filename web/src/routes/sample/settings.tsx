import { SettingsLayout } from '@/sample/settings/components/settings-layout';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/settings')({
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <SettingsLayout>
      <Outlet />
    </SettingsLayout>
  );
}
