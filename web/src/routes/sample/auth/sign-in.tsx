import { SampleSignInPage } from '@/sample/auth/components/sample-sign-in-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/auth/sign-in')({
  component: SampleSignInPage,
});
