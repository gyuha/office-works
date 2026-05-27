import type {
  HelpCenterArticle,
  HelpCenterCategory,
  HelpCenterContactOption,
  HelpCenterFaq,
} from '@/sample/help-center/types/help-center';

export const helpCenterCategoryLabels = {
  'getting-started': 'Getting started',
  account: 'Account',
  workflow: 'Workflow',
  billing: 'Billing',
  security: 'Security',
} as const satisfies Record<HelpCenterCategory, string>;

export const helpCenterArticles: readonly HelpCenterArticle[] = [
  {
    id: 'invite-your-team',
    title: 'Invite your team to Sample Admin',
    excerpt: 'Set up roles, invite teammates, and confirm access before the first handoff.',
    category: 'getting-started',
    status: 'popular',
    readMinutes: 4,
    updatedAt: '2026-04-28',
  },
  {
    id: 'configure-workflows',
    title: 'Configure approval workflows',
    excerpt: 'Build repeatable review steps for user requests, tasks, and app changes.',
    category: 'workflow',
    status: 'updated',
    readMinutes: 7,
    updatedAt: '2026-05-02',
  },
  {
    id: 'manage-user-access',
    title: 'Manage user access safely',
    excerpt: 'Audit roles, suspend stale accounts, and recover access without backend services.',
    category: 'account',
    status: 'popular',
    readMinutes: 5,
    updatedAt: '2026-04-19',
  },
  {
    id: 'billing-exports',
    title: 'Export billing-ready reports',
    excerpt: 'Prepare finance snapshots from the sample dashboard and apps catalog.',
    category: 'billing',
    status: 'new',
    readMinutes: 3,
    updatedAt: '2026-05-07',
  },
  {
    id: 'security-checklist',
    title: 'Security checklist for admin teams',
    excerpt: 'Review session settings, user verification, and escalation paths before launch.',
    category: 'security',
    status: 'updated',
    readMinutes: 6,
    updatedAt: '2026-04-30',
  },
  {
    id: 'triage-chat-requests',
    title: 'Triage support requests from Chats',
    excerpt: 'Turn inbox messages into tasks and route them to the right owner.',
    category: 'workflow',
    status: 'new',
    readMinutes: 4,
    updatedAt: '2026-05-05',
  },
];

export const helpCenterFaqs: readonly HelpCenterFaq[] = [
  {
    id: 'sample-auth-public',
    question: 'Does the sample auth flow create real sessions?',
    answer:
      'No. The sample auth pages are UI-only demos. Submitting a form shows feedback and returns to the sample dashboard.',
    category: 'getting-started',
  },
  {
    id: 'mock-data-reset',
    question: 'Why does my edited mock data reset after refresh?',
    answer:
      'Sample data is intentionally in-memory. Refreshing the page regenerates deterministic mock data so feature folders stay copy-paste friendly.',
    category: 'workflow',
  },
  {
    id: 'production-api',
    question: 'Can these screens connect to a production API?',
    answer:
      'Yes. Replace the feature data and zustand stores with query hooks or your API client while keeping the route and component boundaries.',
    category: 'account',
  },
  {
    id: 'theme-presets',
    question: 'Where should theme changes live?',
    answer:
      'Keep sample-only theme presets under the sample feature boundary and reuse global CSS tokens instead of replacing existing app tokens.',
    category: 'security',
  },
];

export const helpCenterContactOptions: readonly HelpCenterContactOption[] = [
  {
    id: 'docs-request',
    title: 'Request documentation',
    description: 'Flag missing copy, screenshots, or migration notes for the sample reference.',
    responseTime: '1 business day',
  },
  {
    id: 'implementation-review',
    title: 'Implementation review',
    description: 'Ask the sample admin team to review a copied feature folder before adoption.',
    responseTime: '2 business days',
  },
  {
    id: 'incident-handoff',
    title: 'Incident handoff',
    description: 'Escalate broken sample routes, console errors, or unusable UI states.',
    responseTime: 'Same day',
  },
];
