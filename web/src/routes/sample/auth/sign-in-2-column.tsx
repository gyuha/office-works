import { SampleSignIn2Page } from '@/sample/auth/components/sample-sign-in-2-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/auth/sign-in-2-column')({
  component: SampleSignIn2Page,
});
