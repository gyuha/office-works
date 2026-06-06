import { createFileRoute, useParams } from '@tanstack/react-router';

import { PlaceholderScreen } from '@/features/office/components/placeholder-screen';
import { OfficeIcon } from '@/features/office/icons';
import { NAV, SCREEN_LABELS, findParent } from '@/features/office/nav';
import { SCREEN_REGISTRY } from '@/features/office/screens/registry';

export const Route = createFileRoute('/_app/app/$screenId')({
  component: AppScreen,
});

function AppScreen() {
  const { screenId } = useParams({ from: '/_app/app/$screenId' });
  const def = SCREEN_REGISTRY[screenId];

  if (def) {
    return <def.Component />;
  }

  const { groupIndex } = findParent(screenId);
  const iconName = groupIndex >= 0 ? NAV[groupIndex].icon : 'dashboard';

  return (
    <PlaceholderScreen
      title={SCREEN_LABELS[screenId] ?? '화면'}
      icon={<OfficeIcon name={iconName} />}
    />
  );
}
