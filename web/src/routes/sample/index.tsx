import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * /sample 진입 시 /sample/dashboard 로 자동 리다이렉트.
 * 인증 게이트는 두지 않는다 (모든 /sample/* public).
 */
export const Route = createFileRoute('/sample/')({
  beforeLoad: () => {
    throw redirect({ to: '/sample/dashboard' });
  },
});
