import { createFileRoute, useParams } from '@tanstack/react-router';

import { TeamListScreen } from '@/features/office/screens/teams';

export const Route = createFileRoute('/_app/app/team-list/$nodeId')({
  component: TeamNodeRoute,
});

function TeamNodeRoute() {
  const { nodeId } = useParams({ from: '/_app/app/team-list/$nodeId' });
  return <TeamListScreen nodeId={nodeId} />;
}
