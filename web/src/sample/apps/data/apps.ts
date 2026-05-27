import type { SampleApp, SampleAppCategory, SampleAppStatus } from '@/sample/apps/types/app';
import { Faker, en, ko } from '@faker-js/faker';

export type SampleAppsLocale = 'ko' | 'en';

interface AppSeedDefinition {
  id: string;
  name: string;
  description: {
    ko: string;
    en: string;
  };
  category: SampleAppCategory;
  status: SampleAppStatus;
  accentColor: string;
  featured?: boolean;
}

const APP_SEED = 42;

const appDefinitions: readonly AppSeedDefinition[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: {
      ko: '팀 메시지, 알림, 운영 워크플로를 한곳에서 관리합니다.',
      en: 'Manage team messages, alerts, and operations workflows in one place.',
    },
    category: 'communication',
    status: 'connected',
    accentColor: '#611f69',
    featured: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: {
      ko: '결제, 청구, 환불 이벤트를 Sample Admin 대시보드로 동기화합니다.',
      en: 'Sync payments, billing, and refund events into the Sample Admin dashboard.',
    },
    category: 'finance',
    status: 'available',
    accentColor: '#635bff',
    featured: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: {
      ko: '배포 상태, 이슈, pull request 활동을 운영 타임라인에 연결합니다.',
      en: 'Connect deploy status, issues, and pull request activity to the operations timeline.',
    },
    category: 'developer',
    status: 'connected',
    accentColor: '#24292f',
    featured: true,
  },
  {
    id: 'figma',
    name: 'Figma',
    description: {
      ko: '디자인 변경 알림과 QA 체크리스트를 제품 운영 카드로 가져옵니다.',
      en: 'Bring design change alerts and QA checklists into product operations cards.',
    },
    category: 'developer',
    status: 'available',
    accentColor: '#f24e1e',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: {
      ko: '로드맵, 스프린트, 장애 대응 티켓을 관리자 작업 목록과 연결합니다.',
      en: 'Link roadmap, sprint, and incident tickets with the admin task list.',
    },
    category: 'developer',
    status: 'connected',
    accentColor: '#5e6ad2',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: {
      ko: '캠페인 성과와 사용자 세그먼트를 마케팅 리포트에 표시합니다.',
      en: 'Show campaign performance and user segments in marketing reports.',
    },
    category: 'marketing',
    status: 'available',
    accentColor: '#ffe01b',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: {
      ko: '운영 매뉴얼과 고객 대응 문서를 help center에 연결합니다.',
      en: 'Connect operations manuals and customer response docs to the help center.',
    },
    category: 'communication',
    status: 'available',
    accentColor: '#111827',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: {
      ko: '프리뷰 배포, 프로덕션 릴리스, 빌드 실패 이벤트를 추적합니다.',
      en: 'Track preview deployments, production releases, and build failure events.',
    },
    category: 'developer',
    status: 'connected',
    accentColor: '#000000',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: {
      ko: '제품 사용량, 유입 채널, 전환 퍼널을 분석 카드로 가져옵니다.',
      en: 'Import product usage, acquisition channels, and conversion funnels into analytics cards.',
    },
    category: 'analytics',
    status: 'available',
    accentColor: '#f9ab00',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: {
      ko: '리드, 영업 파이프라인, 고객 상태를 CRM 요약으로 동기화합니다.',
      en: 'Sync leads, sales pipeline, and customer status into CRM summaries.',
    },
    category: 'marketing',
    status: 'coming-soon',
    accentColor: '#ff5c35',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: {
      ko: '인보이스, 비용, 세금 보고 상태를 재무 위젯에 표시합니다.',
      en: 'Display invoices, expenses, and tax reporting status in finance widgets.',
    },
    category: 'finance',
    status: 'coming-soon',
    accentColor: '#2ca01c',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    description: {
      ko: '인프라 지표와 장애 알림을 실시간 운영 상태에 연결합니다.',
      en: 'Connect infrastructure metrics and incident alerts to live operations status.',
    },
    category: 'analytics',
    status: 'available',
    accentColor: '#632ca6',
  },
] as const;

function buildFaker(locale: SampleAppsLocale): Faker {
  return new Faker({ locale: locale === 'ko' ? [ko, en] : [en] });
}

export function generateApps(locale: SampleAppsLocale = 'ko'): SampleApp[] {
  const faker = buildFaker(locale);
  faker.seed(APP_SEED);

  return appDefinitions.map((app) => ({
    id: app.id,
    name: app.name,
    description: app.description[locale],
    category: app.category,
    status: app.status,
    accentColor: app.accentColor,
    users: faker.number.int({ min: 900, max: 95000 }),
    rating: Number(faker.number.float({ min: 3.7, max: 5, fractionDigits: 1 }).toFixed(1)),
    reviews: faker.number.int({ min: 120, max: 15000 }),
    featured: app.featured ?? false,
  }));
}

export const apps: SampleApp[] = generateApps();
