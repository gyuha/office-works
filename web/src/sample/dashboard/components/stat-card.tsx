import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStat } from '@/sample/dashboard/types/stat';

interface StatCardProps {
  stat: DashboardStat;
}

/**
 * 대시보드 상단 KPI 카드 (Total Revenue / Subscriptions / Sales / Active Now).
 *
 * shadcn-admin 원본의 size="sm" Card 레이아웃을 그대로 옮긴 것으로,
 * 카드 헤더에 라벨 + 우측 아이콘, 컨텐츠에 큰 수치 + 보조 델타를 노출한다.
 * 별도 props 없이 데이터 객체 1 개만 받으므로 다른 프로젝트로 복사·붙여넣기 시
 * 데이터 모델만 정의하면 즉시 사용 가능하다.
 */
export function StatCard({ stat }: StatCardProps) {
  const Icon = stat.icon;
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
        <p className="text-xs text-muted-foreground">{stat.delta}</p>
      </CardContent>
    </Card>
  );
}
