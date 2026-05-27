import { SAMPLE_ERROR_NOT_FOUND_PATH } from '@/sample/layout/navigation';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/errors/')({
  beforeLoad: () => {
    throw redirect({ to: SAMPLE_ERROR_NOT_FOUND_PATH });
  },
});
