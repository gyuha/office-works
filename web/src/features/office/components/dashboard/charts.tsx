import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

/* ============================================================
   OfficeMate — dashboard charts (recharts)
   Data baked in as module consts, matching the design exactly.
   ============================================================ */

const COLORS = {
  green: '#00BF40',
  orange: '#FF9200',
  red: '#FF3B3B',
  blue: '#0066FF',
  blueTint: '#D6E4FF',
  track: '#F3F4F6',
  axis: '#69748A',
  grid: '#EEF0F3',
  textPrimary: '#1B2435',
  textAssistive: '#69748A',
};

type DonutSegment = { label: string; value: number; color: string; legendValue: string };

const ATTENDANCE_SEGMENTS: DonutSegment[] = [
  { label: '정상 출근', value: 90, color: COLORS.green, legendValue: '45명 (90%)' },
  { label: '지각', value: 6, color: COLORS.orange, legendValue: '3명 (6%)' },
  { label: '결근', value: 4, color: COLORS.red, legendValue: '2명 (4%)' },
];

const APPROVAL_SEGMENTS: DonutSegment[] = [
  { label: '승인', value: 65, color: COLORS.blue, legendValue: '15 (65%)' },
  { label: '진행 중', value: 22, color: COLORS.orange, legendValue: '5 (22%)' },
  { label: '반려', value: 13, color: COLORS.red, legendValue: '3 (13%)' },
];

const LEAVE_MONTHS = [14, 26, 22, 23, 11, 24, 4, 17, 2, 15, 16, 15].map((v, i) => ({
  label: `${i + 1}월`,
  a: v,
  b: [4, 3, 5, 4, 8, 3, 11, 6, 9, 4, 5, 6][i],
}));

const COST_MONTHS = [62, 88, 75, 120, 150, 138, 182, 140, 95, 80, 72, 90].map((v, i) => ({
  label: `${i + 1}월`,
  v,
}));

/* ---- shared donut renderer ---- */
function Donut({
  segments,
  center,
  sub,
}: {
  segments: DonutSegment[];
  center: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[116px] w-[116px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {segments.map((s) => (
                <Cell key={s.label} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-[26px] font-extrabold leading-none"
            style={{ color: COLORS.textPrimary }}
          >
            {center}
          </span>
          <span
            className="mt-1 text-xs font-semibold"
            style={{ color: COLORS.textAssistive }}
          >
            {sub}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="flex flex-1 items-center justify-between gap-2 text-[13px]">
              <span style={{ color: COLORS.textPrimary }}>{s.label}</span>
              <span className="font-mono font-semibold" style={{ color: COLORS.textAssistive }}>
                {s.legendValue}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceDonut() {
  return <Donut segments={ATTENDANCE_SEGMENTS} center="90%" sub="전체 출근율" />;
}

export function ApprovalDonut() {
  return <Donut segments={APPROVAL_SEGMENTS} center="23" sub="이번 달 (건)" />;
}

export function LeaveBar() {
  return (
    <div>
      <div className="h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={LEAVE_MONTHS} margin={{ top: 12, right: 8, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9.5, fill: COLORS.axis }}
              interval={0}
            />
            <YAxis
              domain={[0, 40]}
              ticks={[0, 10, 20, 30, 40]}
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontSize: 9.5, fill: COLORS.axis, fontFamily: 'var(--font-mono)' }}
            />
            <Bar dataKey="a" fill={COLORS.blue} radius={[3, 3, 0, 0]} barSize={6} />
            <Bar dataKey="b" fill={COLORS.blueTint} radius={[3, 3, 0, 0]} barSize={6} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1.5 flex justify-center gap-4">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: COLORS.textAssistive }}
        >
          <span className="h-[9px] w-[9px] rounded-sm" style={{ background: COLORS.blue }} />
          사용일수
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: COLORS.textAssistive }}
        >
          <span className="h-[9px] w-[9px] rounded-sm" style={{ background: COLORS.blueTint }} />
          예정일수
        </span>
      </div>
    </div>
  );
}

export function CostArea() {
  return (
    <div className="h-[190px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={COST_MONTHS} margin={{ top: 12, right: 10, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="om-cost-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.22} />
              <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: COLORS.axis }}
            interval={0}
          />
          <YAxis
            domain={[0, 200]}
            ticks={[0, 50, 100, 150, 200]}
            tickLine={false}
            axisLine={false}
            width={36}
            tick={{ fontSize: 9, fill: COLORS.axis, fontFamily: 'var(--font-mono)' }}
            tickFormatter={(t: number) => (t === 0 ? '0' : `${t}만`)}
          />
          <Area
            type="linear"
            dataKey="v"
            stroke={COLORS.blue}
            strokeWidth={2.4}
            fill="url(#om-cost-gradient)"
            dot={{ r: 2.6, fill: COLORS.blue, strokeWidth: 0 }}
            activeDot={{ r: 3.4, fill: COLORS.blue, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
