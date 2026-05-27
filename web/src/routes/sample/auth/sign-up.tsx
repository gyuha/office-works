import { SampleSignUpPage } from '@/sample/auth/components/sample-sign-up-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/auth/sign-up')({
  component: SampleSignUpPage,
});
