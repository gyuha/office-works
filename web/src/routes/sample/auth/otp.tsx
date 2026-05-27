import { SampleOtpPage } from '@/sample/auth/components/sample-otp-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/auth/otp')({
  component: SampleOtpPage,
});
