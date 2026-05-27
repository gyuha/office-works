import { overviewChart as defaultOverview } from '@/sample/dashboard/data/overview-chart';
import type { OverviewChartPoint } from '@/sample/dashboard/types/chart';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

interface OverviewChartProps {
  /** 외부 주입 데이터. 미지정 시 ko locale 의 기본 mock(시드=42)을 사용. */
  data?: readonly OverviewChartPoint[];
  /** 컨테이너 높이 (px). 카드 안에서 일관된 비율 유지를 위해 노출. */
  height?: number;
  /** Y 축 값을 사람이 읽을 수 있는 라벨로 포맷. 기본은 ₩ + 천 단위 콤마. */
  formatValue?: (value: number) => string;
}

const DEFAULT_HEIGHT = 320;

/** 기본 Y 축 / Tooltip 포맷터 (₩ + 천 단위 콤마, 백만 단위 축약). */
function defaultFormatValue(value: number): string {
  if (value >= 1_000_000) {
    return `₩${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `₩${Math.round(value / 1_000).toLocaleString('ko-KR')}K`;
  }
  return `₩${value.toLocaleString('ko-KR')}`;
}

interface OverviewTooltipPayload {
  value?: number;
  payload?: OverviewChartPoint;
}

interface OverviewTooltipProps {
  active?: boolean;
  label?: string;
  payload?: readonly OverviewTooltipPayload[];
  formatValue: (value: number) => string;
}

/**
 * 차트 위에 띄울 커스텀 Tooltip.
 *
 * shadcn-admin 의 Tooltip 비주얼(작은 카드 + label/value 두 줄)을 그대로 모사한다.
 * recharts 가 넘기는 payload 가 `unknown` 에 가까운 타입이라 좁힌 인터페이스를 둔다.
 */
function OverviewTooltip({ active, label, payload, formatValue }: OverviewTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const value = payload[0]?.value;
  if (typeof value !== 'number') {
    return null;
  }
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-popover-foreground">{label}</div>
      <div className="mt-1 text-muted-foreground">{formatValue(value)}</div>
    </div>
  );
}

/**
 * Dashboard overview 카드 안에 들어가는 12 개월 매출 BarChart.
 *
 * shadcn-admin 의 Overview 컴포넌트를 Recharts(v3) 로 그대로 옮긴 것으로,
 * - X 축: 월 라벨
 * - Y 축: 매출 합계 (₩, 축약 포맷)
 * - Bar: 둥근 상단(radius 4) + chart-1 토큰 색상
 *
 * 외부 의존성: `recharts`, `@/sample/dashboard/data/overview-chart` 두 가지뿐이라
 * 다른 프로젝트로 복사 시 함께 가져오면 즉시 동작한다.
 */
export function OverviewChart({
  data = defaultOverview,
  height = DEFAULT_HEIGHT,
  formatValue = defaultFormatValue,
}: OverviewChartProps) {
  return (
    <div className="w-full overflow-x-auto" style={{ height }}>
      <BarChart
        width={720}
        height={height}
        data={[...data]}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--color-border)"
          opacity={0.6}
        />
        <XAxis
          dataKey="label"
          stroke="var(--color-muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--color-muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatValue}
          width={64}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          content={(tooltipProps) => (
            <OverviewTooltip
              active={tooltipProps.active}
              label={typeof tooltipProps.label === 'string' ? tooltipProps.label : undefined}
              payload={tooltipProps.payload as readonly OverviewTooltipPayload[] | undefined}
              formatValue={formatValue}
            />
          )}
        />
        <Bar dataKey="total" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </div>
  );
}
