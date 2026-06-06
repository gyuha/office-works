import { AttendanceDonut, ApprovalDonut, CostArea, LeaveBar } from './charts';
import { KpiRow } from './kpi-cards';
import { NoticePanel } from './notice-panel';
import { Panel, PanelBody, PanelHeader } from './panel';
import { ProjectTable } from './project-table';
import { QuickLinks } from './quick-links';
import { SchedulePanel } from './schedule-panel';

/* ============================================================
   OfficeMate — 대시보드 조합
   ============================================================ */

export function Dashboard() {
  return (
    <div className="grid gap-5">
      {/* KPI ROW */}
      <KpiRow />

      {/* MIDDLE ROW — 1.7fr / 1fr / 1fr (≥1100px) */}
      <div className="grid grid-cols-1 gap-5 min-[1100px]:grid-cols-[1.7fr_1fr_1fr]">
        <ProjectTable />
        <SchedulePanel />
        <NoticePanel />
      </div>

      {/* CHART ROW — 4열 → 2열 (<1320px) */}
      <div className="grid grid-cols-1 gap-5 min-[760px]:grid-cols-2 min-[1320px]:grid-cols-4">
        <Panel>
          <PanelHeader title="부서별 근태 현황" moreScreenId="att-team" />
          <PanelBody>
            <AttendanceDonut />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title={
              <>
                연차 사용 현황{' '}
                <span className="text-[13px] font-semibold text-[#69748A]">(2024년)</span>
              </>
            }
            moreScreenId="att-my"
          />
          <PanelBody>
            <LeaveBar />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="월별 비용 현황" moreScreenId="att-work" />
          <PanelBody>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[28px] font-extrabold tracking-[-0.03em] text-[#1B2435]">
                1,250,000
              </span>
              <span className="text-[15px] font-semibold text-[#69748A]">원</span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-[#69748A]">2024년 5월</div>
            <div className="mt-2">
              <CostArea />
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="결재 현황" moreScreenId="appr-home" />
          <PanelBody>
            <ApprovalDonut />
          </PanelBody>
        </Panel>
      </div>

      {/* QUICK LINKS */}
      <QuickLinks />
    </div>
  );
}
