import { createFileRoute, redirect } from '@tanstack/react-router';

// `/app/proj/[id]` 진입 시 기본 탭(info)으로 리다이렉트.
export const Route = createFileRoute('/_app/app/proj/$projectId/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/proj/$projectId/$tab',
      params: { projectId: params.projectId, tab: 'info' },
    });
  },
});
