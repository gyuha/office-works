import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { OverviewChart } from '@/sample/dashboard/components/overview-chart';
import { RecentSales } from '@/sample/dashboard/components/recent-sales';
import { StatsOverview } from '@/sample/dashboard/components/stats-overview';
import { createFileRoute } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/sample/dashboard')({
  component: DashboardPage,
});

/**
 * Dashboard 페이지 셸.
 *
 * 본 컴포넌트는 shadcn-admin 의 dashboard overview 페이지 레이아웃을
 * 그대로 옮긴 것으로, 헤더 / 탭 네비게이션 / 그리드 골격을 정의한다.
 * 상단 KPI 4 종 카드(Total Revenue / Subscriptions / Sales / Active Now),
 * Overview BarChart(12 개월 매출, Recharts), 그리고 우측 Recent Sales 패널
 * (아바타 + 이름·이메일 + 금액 5 건) 모두 src/sample/dashboard/ 의 feature
 * 컴포넌트로 분리되어 있어 다른 프로젝트로 복사·붙여넣기 시 함께 가져오면
 * 즉시 동작한다.
 */
function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <DashboardHeader />
      <DashboardTabs />
    </div>
  );
}

function DashboardHeader() {
  const { t } = useTranslation('sample');

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.description')}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Download aria-hidden="true" />
          <span>{t('dashboard.download')}</span>
        </Button>
      </div>
    </header>
  );
}

interface DashboardTab {
  value: 'overview' | 'analytics' | 'reports' | 'notifications';
  disabled?: boolean;
}

const tabs: readonly DashboardTab[] = [
  { value: 'overview' },
  { value: 'analytics', disabled: true },
  { value: 'reports', disabled: true },
  { value: 'notifications', disabled: true },
] as const;

function DashboardTabs() {
  const { t } = useTranslation('sample');

  return (
    <Tabs defaultValue="overview" className="flex w-full flex-col gap-6">
      <TabsList className="w-fit">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled}>
            {t(`dashboard.tabs.${tab.value}`)}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <StatsOverview />
        <ContentGrid />
      </TabsContent>

      <TabsContent value="analytics">
        <PlaceholderPanel label={t('dashboard.tabs.analytics')} />
      </TabsContent>
      <TabsContent value="reports">
        <PlaceholderPanel label={t('dashboard.tabs.reports')} />
      </TabsContent>
      <TabsContent value="notifications">
        <PlaceholderPanel label={t('dashboard.tabs.notifications')} />
      </TabsContent>
    </Tabs>
  );
}

function ContentGrid() {
  const { t } = useTranslation('sample');

  return (
    <div className="grid gap-4 lg:grid-cols-7">
      <Card className={cn('lg:col-span-4')}>
        <CardHeader>
          <CardTitle>{t('dashboard.overviewTitle')}</CardTitle>
          <CardDescription>{t('dashboard.overviewDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <OverviewChart />
        </CardContent>
      </Card>
      <Card className={cn('lg:col-span-3')}>
        <CardHeader>
          <CardTitle>{t('dashboard.recentSalesTitle')}</CardTitle>
          <CardDescription>{t('dashboard.recentSalesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentSales />
        </CardContent>
      </Card>
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  const { t } = useTranslation('sample');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>{t('dashboard.placeholderDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
          {t('dashboard.preparing')}
        </div>
      </CardContent>
    </Card>
  );
}
