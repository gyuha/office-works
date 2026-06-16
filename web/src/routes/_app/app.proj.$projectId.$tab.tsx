import { createFileRoute, redirect, useParams } from '@tanstack/react-router';

import {
  ContractsTab,
  CostTab,
  DETAIL_TABS,
  GanttTab,
  InfoTab,
  IssuesTab,
  MembersTab,
  type TabId,
  useProjectDetail,
} from '@/features/office/screens/projects';

const VALID_TABS = new Set<string>(DETAIL_TABS.map((t) => t.id));

export const Route = createFileRoute('/_app/app/proj/$projectId/$tab')({
  beforeLoad: ({ params }) => {
    if (!VALID_TABS.has(params.tab)) {
      throw redirect({
        to: '/app/proj/$projectId/$tab',
        params: { projectId: params.projectId, tab: 'info' },
      });
    }
  },
  component: ProjectTab,
});

function ProjectTab() {
  const { tab } = useParams({ from: '/_app/app/proj/$projectId/$tab' });
  const { project, bump } = useProjectDetail();

  switch (tab as TabId) {
    case 'members':
      return <MembersTab p={project} bump={bump} />;
    case 'gantt':
      return <GanttTab p={project} />;
    case 'contracts':
      return <ContractsTab p={project} bump={bump} />;
    case 'issues':
      return <IssuesTab p={project} bump={bump} />;
    case 'cost':
      return <CostTab p={project} bump={bump} />;
    default:
      return <InfoTab p={project} />;
  }
}
