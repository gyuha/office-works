import type { ReactNode } from 'react';

export type OfficeIconName =
  | 'dashboard'
  | 'user'
  | 'badge'
  | 'cert'
  | 'skill'
  | 'history'
  | 'dept'
  | 'team'
  | 'org'
  | 'clock'
  | 'attstat'
  | 'leave'
  | 'vacation'
  | 'project'
  | 'calendar'
  | 'progress'
  | 'issue'
  | 'write'
  | 'inbox'
  | 'inprogress'
  | 'done'
  | 'receipt'
  | 'cost'
  | 'wallet'
  | 'notice'
  | 'folder'
  | 'account'
  | 'shield'
  | 'settings'
  | 'bell'
  | 'mail'
  | 'menu'
  | 'chevDown'
  | 'chevR'
  | 'chevL'
  | 'collapse';

const ICONS: Record<OfficeIconName, ReactNode> = {
  dashboard: (
    <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" fill="currentColor" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  badge: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M13.5 10h4M13.5 13h2.5M6.5 16h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  cert: (
    <>
      <circle cx="12" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m9.5 13.5-1 6 3.5-2 3.5 2-1-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </>
  ),
  skill: (
    <path
      d="m12 3 2.5 5.3 5.5.7-4 4 1 5.6L12 21l-5-2.4 1-5.6-4-4 5.5-.7L12 3Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  history: (
    <>
      <path
        d="M4 12a8 8 0 1 0 2.3-5.6M4 4v3h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8v4l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  dept: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 9V5.5C9 4.7 9.7 4 10.5 4h3c.8 0 1.5.7 1.5 1.5V9M8 13h2M14 13h2M8 16h2M14 16h2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  team: (
    <>
      <circle cx="8.5" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 19c0-2.5 2.2-4 5-4s5 1.5 5 4M15 15c2.3 0 4.5 1.2 4.5 3.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  org: (
    <>
      <rect x="9" y="3" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="16" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="15" y="16" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v4M6 16v-2.5h12V16" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  attstat: (
    <>
      <path
        d="M4 5h16M4 12h16M4 19h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  leave: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 9.5h17M8 3.5v3M16 3.5v3M8.5 14l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  vacation: (
    <>
      <path d="M5 20h14M12 20V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M12 9c-3.5-3 0-6 0-6s3.5 3 0 6Zm0 0c3 .5 5.5 3.5 5 6.5M12 9c-3 .5-5.5 3.5-5 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </>
  ),
  project: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7.5 9h9M7.5 12.5h6M7.5 16h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 9.5h17M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  progress: (
    <>
      <path
        d="M21 12a9 9 0 1 1-9-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 12 16 8M12 3a9 9 0 0 1 9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".4"
      />
    </>
  ),
  issue: (
    <>
      <path
        d="M12 3 2.5 20h19L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17h.01"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </>
  ),
  write: (
    <path
      d="M5 19h14M6 16l9.5-9.5a1.8 1.8 0 0 0 0-2.5l-.5-.5a1.8 1.8 0 0 0-2.5 0L3 13v3h3Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  inbox: (
    <>
      <path
        d="M4 13 6 5h12l2 8v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 13h4l1.5 2.5h5L16 13h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </>
  ),
  inprogress: (
    <>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  done: (
    <>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  receipt: (
    <>
      <path
        d="M6 3.5h12v17l-2.2-1.5L13.5 20l-1.5-1.5L10.5 20l-2.3-1L6 20.5v-17Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 11.5h6M9 15h3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  cost: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 14.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 10h17M16.5 14.5h.01"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </>
  ),
  notice: (
    <>
      <path
        d="M4 10v4l11 5V5L4 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15 8.5a3.5 3.5 0 0 1 0 7M7 14v3.5a1.5 1.5 0 0 0 3 0V15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  folder: (
    <path
      d="M3.5 7c0-1.1.9-2 2-2h3.2l2 2.2H18.5c1.1 0 2 .9 2 2v7.8c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2V7Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  account: (
    <>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  shield: (
    <>
      <path
        d="M12 3 5 6v5c0 4.4 3 8 7 10 4-2 7-5.6 7-10V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  bell: (
    <>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m4.5 7 7.5 5.5L19.5 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </>
  ),
  menu: (
    <path
      d="M4 7h16M4 12h16M4 17h16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
  chevDown: (
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  chevR: (
    <path
      d="m9 6 6 6-6 6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  chevL: (
    <path
      d="m15 6-6 6 6 6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  collapse: (
    <>
      <path
        d="M4 5h16M4 12h10M4 19h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m18 9-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function OfficeIcon({
  name,
  className,
}: {
  name: OfficeIconName;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}
