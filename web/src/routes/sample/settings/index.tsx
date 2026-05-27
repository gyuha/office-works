import { SETTINGS_PROFILE_PATH } from '@/sample/settings/data/settings-navigation';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/settings/')({
  beforeLoad: () => {
    throw redirect({ to: SETTINGS_PROFILE_PATH });
  },
});
