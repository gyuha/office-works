import { createFileRoute, redirect, useNavigate, useParams } from '@tanstack/react-router';

import { APPROVAL_DATA, DocDetail } from '@/features/office/screens/approval';

export const Route = createFileRoute('/_app/app/appr-sent/$docId')({
  beforeLoad: ({ params }) => {
    // mock 데이터에 없는 문서면 상신함 목록으로
    if (!APPROVAL_DATA.some((d) => d.id === params.docId)) {
      throw redirect({ to: '/app/$screenId', params: { screenId: 'appr-sent' } });
    }
  },
  component: ApprovalDocRoute,
});

function ApprovalDocRoute() {
  const { docId } = useParams({ from: '/_app/app/appr-sent/$docId' });
  const navigate = useNavigate();
  const doc = APPROVAL_DATA.find((d) => d.id === docId);
  if (!doc) return null;
  return (
    <DocDetail
      doc={doc}
      onBack={() => navigate({ to: '/app/$screenId', params: { screenId: 'appr-sent' } })}
    />
  );
}
