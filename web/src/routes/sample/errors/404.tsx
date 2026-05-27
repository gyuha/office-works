import { SampleErrorPage } from '@/sample/errors/components/sample-error-page';
import { sampleNotFoundErrorPage } from '@/sample/errors/error-page-definitions';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/errors/404')({
  component: () => <SampleErrorPage {...sampleNotFoundErrorPage} />,
});
