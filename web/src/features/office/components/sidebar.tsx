import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';
import { OfficeIcon } from '../icons';
import { NAV, findParent, pathToScreen } from '../nav';
import { useSidebarStore } from '../store/sidebar-store';

/* ============================================================
   OfficeMate — 사이드바 (3단계 아코디언)
   260px (접힘 76px), 다크 네이비 그라데이션, 풀하이트 sticky.
   ============================================================ */

export function OfficeSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const screen = pathToScreen(pathname);
  const { groupIndex: activeGroup, l2id: activeL2 } = findParent(screen);

  const collapsed = useSidebarStore((s) => s.collapsed);
  const openGroupIndex = useSidebarStore((s) => s.openGroupIndex);
  const openL2Id = useSidebarStore((s) => s.openL2Id);
  const openGroup = useSidebarStore((s) => s.openGroup);
  const toggleL2 = useSidebarStore((s) => s.toggleL2);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const syncToScreen = useSidebarStore((s) => s.syncToScreen);

  // 라우트 변경/마운트 시 활성 화면 기준으로 아코디언 동기화
  useEffect(() => {
    syncToScreen(screen);
  }, [screen, syncToScreen]);

  const goTo = (id: string) => {
    if (id === 'dashboard') {
      navigate({ to: '/' });
    } else {
      navigate({ to: '/app/$screenId', params: { screenId: id } });
    }
  };

  const onGroupToggle = (i: number) => {
    if (collapsed) setCollapsed(false);
    openGroup(i);
  };

  return (
    <aside className="sticky top-0 flex h-screen flex-col self-start overflow-hidden bg-gradient-to-b from-om-sidebar to-om-sidebar-deep text-[#AEB6C4]">
      {/* BRAND */}
      <div
        className={cn(
          'flex h-[76px] flex-shrink-0 items-center gap-3 border-b border-white/[0.08] px-5',
          collapsed && 'justify-center px-0'
        )}
      >
        <div className="grid size-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#2E8BFF] to-primary text-white shadow-[0_4px_12px_rgba(0,102,255,0.4)] [&_svg]:size-5">
          <OfficeIcon name="dashboard" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[18px] font-extrabold leading-tight tracking-[-0.02em] text-white">
              OfficeMate
            </div>
            <div className="whitespace-nowrap text-[11.5px] font-medium tracking-[0.01em] text-[#69748A]">
              오피스 관리 시스템
            </div>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav className="flex flex-1 flex-col gap-[3px] overflow-y-auto px-3 pb-5 pt-2.5 [scrollbar-color:rgba(255,255,255,0.14)_transparent] [scrollbar-width:thin]">
        {NAV.map((m, gi) => {
          const isOpen = openGroupIndex === gi;
          const isParentActive = activeGroup === gi && !!m.children;

          // L1 다이렉트 (대시보드)
          if (!m.children) {
            const directActive = m.id === screen;
            return (
              <button
                key={m.label}
                type="button"
                aria-current={directActive ? 'page' : undefined}
                onClick={() => m.id && goTo(m.id)}
                className={cn(
                  'flex w-full items-center gap-[11px] rounded-[10px] px-3 py-[11px] text-[14px] font-semibold tracking-[-0.01em] transition-colors',
                  collapsed && 'justify-center px-3',
                  directActive
                    ? 'bg-primary text-white shadow-[0_4px_14px_rgba(0,102,255,0.45)]'
                    : 'text-[#AEB6C4] hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <OfficeIcon name={m.icon} className="size-[19px] flex-shrink-0" />
                {!collapsed && <span className="flex-1 truncate text-left">{m.label}</span>}
              </button>
            );
          }

          // L1 그룹 (children)
          return (
            <div key={m.label} className="flex flex-col">
              <button
                type="button"
                onClick={() => onGroupToggle(gi)}
                className={cn(
                  'flex w-full items-center gap-[11px] rounded-[10px] px-3 py-[11px] text-[14px] font-semibold tracking-[-0.01em] transition-colors hover:bg-white/[0.06] hover:text-white',
                  collapsed && 'justify-center px-3',
                  isOpen || isParentActive ? 'text-white' : 'text-[#AEB6C4]'
                )}
              >
                <OfficeIcon
                  name={m.icon}
                  className={cn('size-[19px] flex-shrink-0', isParentActive && 'text-[#5b9bff]')}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{m.label}</span>
                    <OfficeIcon
                      name="chevDown"
                      className={cn(
                        'size-4 flex-shrink-0 opacity-50 transition-transform duration-200',
                        isOpen && 'rotate-180 opacity-80'
                      )}
                    />
                  </>
                )}
              </button>

              {/* L2 패널 (grid-rows 애니메이션) */}
              {!collapsed && (
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="relative py-[3px] pb-2 before:absolute before:bottom-3 before:left-[22px] before:top-1.5 before:w-[1.5px] before:bg-white/[0.08] before:content-['']">
                      {m.children.map((c) => {
                        const hasSub = !!c.sub?.length;
                        const l2Active = c.id === screen;
                        const l2ParentActive = c.id === activeL2;
                        const l2Open = openL2Id === c.id || l2ParentActive;

                        // L2 일반 링크
                        if (!hasSub) {
                          return (
                            <a
                              key={c.id}
                              aria-current={l2Active ? 'page' : undefined}
                              onClick={() => goTo(c.id)}
                              className={cn(
                                'relative flex cursor-pointer items-center whitespace-nowrap rounded-lg py-2 pl-[42px] pr-3 text-[13.5px] font-medium tracking-[-0.01em] transition-colors',
                                "before:absolute before:left-[19px] before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:shadow-[0_0_0_1.5px_rgba(255,255,255,0.08)] before:content-['']",
                                l2Active
                                  ? 'bg-primary font-bold text-white shadow-[0_4px_14px_rgba(0,102,255,0.4)] before:bg-white before:shadow-none'
                                  : 'text-[#AEB6C4] before:bg-om-sidebar hover:bg-white/[0.06] hover:text-white'
                              )}
                            >
                              {c.label}
                            </a>
                          );
                        }

                        // L2 확장형 (sub-children) — 클릭 시 L3 토글 + 자기 화면 이동
                        return (
                          <div key={c.id} className="flex flex-col">
                            <a
                              aria-current={l2Active ? 'page' : undefined}
                              onClick={() => {
                                toggleL2(c.id);
                                goTo(c.id);
                              }}
                              className={cn(
                                'relative flex cursor-pointer items-center justify-between whitespace-nowrap rounded-lg py-2 pl-[42px] pr-3 text-[13.5px] font-medium tracking-[-0.01em] transition-colors',
                                "before:absolute before:left-[19px] before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:shadow-[0_0_0_1.5px_rgba(255,255,255,0.08)] before:content-['']",
                                l2Active
                                  ? 'bg-primary font-bold text-white shadow-[0_4px_14px_rgba(0,102,255,0.4)] before:bg-white before:shadow-none'
                                  : l2ParentActive
                                    ? 'font-bold text-white before:bg-om-sidebar'
                                    : 'text-[#AEB6C4] before:bg-om-sidebar hover:bg-white/[0.06] hover:text-white'
                              )}
                            >
                              <span className="flex-1 truncate">{c.label}</span>
                              <OfficeIcon
                                name="chevR"
                                className={cn(
                                  'size-[15px] flex-shrink-0 opacity-40 transition-transform duration-200',
                                  l2Open && 'rotate-90 opacity-75',
                                  l2ParentActive && 'text-[#5b9bff] opacity-100'
                                )}
                              />
                            </a>

                            {/* L3 패널 */}
                            <div
                              className="grid transition-[grid-template-rows] duration-200 ease-out"
                              style={{ gridTemplateRows: l2Open ? '1fr' : '0fr' }}
                            >
                              <div className="min-h-0 overflow-hidden">
                                {c.sub?.map((s) => {
                                  const l3Active = s.id === screen;
                                  return (
                                    <a
                                      key={s.id}
                                      aria-current={l3Active ? 'page' : undefined}
                                      onClick={() => goTo(s.id)}
                                      className={cn(
                                        'block cursor-pointer whitespace-nowrap rounded-[7px] py-[7px] pl-[54px] pr-3 text-[13px] font-medium tracking-[-0.01em] transition-colors',
                                        l3Active
                                          ? 'bg-primary/[0.14] font-bold text-[#74b0ff]'
                                          : 'text-[#AEB6C4] hover:bg-white/[0.06] hover:text-white'
                                      )}
                                    >
                                      {s.label}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* FOOT — 메뉴 접기 */}
      <div className="flex-shrink-0 border-t border-white/[0.08] p-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            'flex w-full items-center gap-[9px] rounded-[9px] px-2.5 py-[9px] text-[13px] font-semibold text-[#69748A] transition-colors hover:bg-white/[0.06] hover:text-white [&_svg]:size-[18px]',
            collapsed && 'justify-center'
          )}
        >
          <OfficeIcon name="collapse" />
          {!collapsed && <span>메뉴 접기</span>}
        </button>
      </div>
    </aside>
  );
}
