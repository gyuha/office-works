import { useRouterState } from '@tanstack/react-router';

import { SCREEN_LABELS, pathToScreen } from '../nav';
import { useSidebarStore } from '../store/sidebar-store';
import { OfficeSidebar } from './sidebar';
import { OfficeTopbar } from './topbar';

/* ============================================================
   OfficeMate — 앱 셸 (사이드바 + 상단바 + 콘텐츠)
   ============================================================ */

function metaFor(screen: string): { title: string; subtitle: string } {
  if (screen === 'dashboard') {
    return { title: '대시보드', subtitle: '오늘 하루도 화이팅입니다! 👋' };
  }
  return { title: SCREEN_LABELS[screen] ?? '화면', subtitle: '준비 중인 화면입니다' };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const screen = pathToScreen(pathname);
  const { title, subtitle } = metaFor(screen);

  return (
    <div
      className="grid h-screen overflow-hidden bg-om-canvas text-[#1B2435]"
      style={{
        gridTemplateColumns: `${collapsed ? '76px' : '260px'} 1fr`,
        gridTemplateRows: 'minmax(0, 1fr)',
      }}
    >
      <OfficeSidebar />
      <div className="flex min-h-0 min-w-0 flex-col">
        <OfficeTopbar title={title} subtitle={subtitle} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-10 pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
