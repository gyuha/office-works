import { SampleErrorPage } from '@/sample/errors/components/sample-error-page';
import { sampleUnauthorizedErrorPage } from '@/sample/errors/error-page-definitions';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/errors/unauthorized')({
  component: () => <SampleErrorPage {...sampleUnauthorizedErrorPage} />,
});
