import { SampleForgotPasswordPage } from '@/sample/auth/components/sample-forgot-password-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/auth/forgot-password')({
  component: SampleForgotPasswordPage,
});
