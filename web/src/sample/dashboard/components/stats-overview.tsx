import { StatCard } from '@/sample/dashboard/components/stat-card';
import { dashboardStats } from '@/sample/dashboard/data/stats';
import type { DashboardStat } from '@/sample/dashboard/types/stat';

interface StatsOverviewProps {
  /** 외부에서 다른 KPI 셋을 주입하고 싶을 때 사용. 미지정 시 기본 4 종을 사용한다. */
  stats?: readonly DashboardStat[];
}

/**
 * shadcn-admin dashboard 의 상단 KPI 4 종 카드 그리드.
 *
 * - 모바일: 1 열
 * - sm  : 2 열
 * - lg+ : 4 열
 *
 * 카드 데이터는 props 또는 기본값(`dashboardStats`)에서 가져온다.
 * 컴포넌트 자체는 상태/사이드이펙트가 없으므로 다른 프로젝트로 복사 시
 * `@/sample/dashboard/data/stats`, `@/sample/dashboard/components/stat-card`
 * 만 함께 복사하면 동작한다.
 */
export function StatsOverview({ stats = dashboardStats }: StatsOverviewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
