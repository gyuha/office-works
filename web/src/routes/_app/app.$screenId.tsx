import { createFileRoute, useParams } from '@tanstack/react-router';

import { PlaceholderScreen } from '@/features/office/components/placeholder-screen';
import { OfficeIcon } from '@/features/office/icons';
import { NAV, SCREEN_LABELS, findParent } from '@/features/office/nav';
import { SCREEN_REGISTRY } from '@/features/office/screens/registry';

// 화면 내부 뷰(목록/상세/편집/추가)를 URL에 반영하기 위한 공용 search params.
// 각 화면이 필요에 따라 사용한다(미사용 화면은 무시). 브라우저 뒤로/앞으로가 자연히 동작한다.
export type ScreenSearch = {
  view?: 'detail' | 'edit' | 'add';
  id?: string;
};

export const Route = createFileRoute('/_app/app/$screenId')({
  validateSearch: (search: Record<string, unknown>): ScreenSearch => {
    const view = search.view;
    return {
      view: view === 'detail' || view === 'edit' || view === 'add' ? view : undefined,
      id: typeof search.id === 'string' ? search.id : undefined,
    };
  },
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
