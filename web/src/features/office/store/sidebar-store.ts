import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { findParent } from '../nav';

interface SidebarState {
  collapsed: boolean;
  openGroupIndex: number | null;
  openL2Id: string | null;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  openGroup: (i: number | null) => void;
  toggleL2: (id: string) => void;
  openL2: (id: string) => void;
  syncToScreen: (screenId: string) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      openGroupIndex: null,
      openL2Id: null,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (v) => set({ collapsed: v }),
      openGroup: (i) => set((s) => ({ openGroupIndex: s.openGroupIndex === i ? null : i })),
      toggleL2: (id) => set((s) => ({ openL2Id: s.openL2Id === id ? null : id })),
      openL2: (id) => set({ openL2Id: id }),
      syncToScreen: (screenId) => {
        const { groupIndex, l2id } = findParent(screenId);
        set({
          openGroupIndex: groupIndex >= 0 ? groupIndex : null,
          openL2Id: l2id,
        });
      },
    }),
    { name: 'om-sidebar' }
  )
);
