import { SampleErrorPage } from '@/sample/errors/components/sample-error-page';
import { sampleInternalServerErrorPage } from '@/sample/errors/error-page-definitions';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/errors/internal-server-error')({
  component: () => <SampleErrorPage {...sampleInternalServerErrorPage} />,
});
