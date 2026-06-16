import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';

import { userStatsApiV1UsersStatsGetOptions } from '@/client/@tanstack/react-query.gen';
import { MemberDetail, MemberEdit } from '@/features/office/screens/members';

export const Route = createFileRoute('/_app/app/members/$memberId')({
  component: MemberDetailRoute,
});

function MemberDetailRoute() {
  const { memberId } = useParams({ from: '/_app/app/members/$memberId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  // MemberEdit의 부서 드롭다운용 — 목록 화면과 동일 출처(stats.departments)
  const statsQuery = useQuery(userStatsApiV1UsersStatsGetOptions());
  const depts = statsQuery.data?.departments ?? [];

  const backToList = () => navigate({ to: '/app/$screenId', params: { screenId: 'members-list' } });

  if (editing) {
    return (
      <MemberEdit
        memberId={memberId}
        depts={depts}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          queryClient.invalidateQueries();
          setEditing(false);
        }}
      />
    );
  }

  return (
    <MemberDetail
      memberId={memberId}
      onBack={backToList}
      onEdit={() => setEditing(true)}
      onDeleted={() => {
        queryClient.invalidateQueries();
        backToList();
      }}
    />
  );
}
