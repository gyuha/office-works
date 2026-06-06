export type IconKey = 'dashboard' | 'team' | 'project' | 'inbox' | 'clock';

export interface NavL3 {
  id: string;
  label: string;
}

export interface NavL2 {
  id: string;
  label: string;
  sub?: NavL3[];
}

export interface NavL1 {
  id?: string;
  label: string;
  icon: IconKey;
  children?: NavL2[];
}

export const NAV: NavL1[] = [
  { id: 'dashboard', label: '대시보드', icon: 'dashboard' },
  {
    label: '구성원',
    icon: 'team',
    children: [
      { id: 'members-list', label: '구성원 관리' },
      { id: 'team-list', label: '팀 관리' },
      { id: 'org', label: '설정' },
    ],
  },
  {
    label: '프로젝트',
    icon: 'project',
    children: [{ id: 'proj-list', label: '프로젝트 관리' }],
  },
  {
    label: '결재',
    icon: 'inbox',
    children: [
      { id: 'appr-home', label: '결재 홈' },
      { id: 'appr-write', label: '결재 작성' },
      {
        id: 'appr-inbox',
        label: '수신함',
        sub: [
          { id: 'appr-todo', label: '결재할 문서' },
          { id: 'appr-notif', label: '결재 통보' },
          { id: 'appr-ref', label: '결재 참조' },
          { id: 'appr-sched', label: '결재 예정' },
        ],
      },
      { id: 'appr-sent', label: '상신함' },
      { id: 'appr-draft', label: '임시 저장' },
    ],
  },
  {
    label: '근무/휴가',
    icon: 'clock',
    children: [
      { id: 'att-my', label: '내 근태 현황/신청' },
      { id: 'att-work', label: '근무/휴가' },
      { id: 'att-team', label: '팀 근무 현황' },
      {
        id: 'att-analysis',
        label: '분석',
        sub: [
          { id: 'att-weekly', label: '주별 근무시간' },
          { id: 'att-monthly', label: '월별 근무시간' },
        ],
      },
    ],
  },
];

export const SCREEN_LABELS: Record<string, string> = (() => {
  const labels: Record<string, string> = {};
  for (const m of NAV) {
    if (m.id) labels[m.id] = m.label;
    for (const c of m.children ?? []) {
      labels[c.id] = c.label;
      for (const s of c.sub ?? []) {
        labels[s.id] = s.label;
      }
    }
  }
  return labels;
})();

export function findParent(id: string): { groupIndex: number; l2id: string | null } {
  for (let groupIndex = 0; groupIndex < NAV.length; groupIndex++) {
    const m = NAV[groupIndex];
    if (m.id === id) return { groupIndex, l2id: null };
    for (const c of m.children ?? []) {
      if (c.id === id) return { groupIndex, l2id: null };
      for (const s of c.sub ?? []) {
        if (s.id === id) return { groupIndex, l2id: c.id };
      }
    }
  }
  return { groupIndex: -1, l2id: null };
}

export function screenToPath(id: string): string {
  return id === 'dashboard' ? '/' : `/app/${id}`;
}

export function pathToScreen(pathname: string): string {
  if (pathname === '/') return 'dashboard';
  const match = pathname.match(/^\/app\/([^/]+)/);
  if (match && SCREEN_LABELS[match[1]]) return match[1];
  return 'dashboard';
}
