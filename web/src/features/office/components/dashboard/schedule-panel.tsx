import { OfficeIcon } from '../../icons';
import { Panel, PanelBody, PanelHeader } from './panel';
import { schedule } from './dashboard-data';

/* ============================================================
   OfficeMate — 내 일정 타임라인
   ============================================================ */

function SchedArrow({ name }: { name: 'chevL' | 'chevR' }) {
  return (
    <button
      type="button"
      className="grid size-[26px] place-items-center rounded-lg text-[#69748A] transition-colors hover:bg-[#0000000a] hover:text-[#1B2435] [&_svg]:size-4"
    >
      <OfficeIcon name={name} />
    </button>
  );
}

export function SchedulePanel() {
  return (
    <Panel>
      <PanelHeader title="내 일정">
        <div className="flex items-center gap-1.5">
          <SchedArrow name="chevL" />
          <span className="font-mono text-[13.5px] font-bold text-[#3D4A5C]">2024.05.20 (월)</span>
          <SchedArrow name="chevR" />
        </div>
      </PanelHeader>
      <PanelBody>
        <div className="flex flex-col">
          {schedule.map((s, i) => (
            <div
              key={s.time + s.title}
              className={`grid grid-cols-[52px_14px_1fr] gap-3 py-3 ${
                i > 0 ? 'border-t border-[#F0F1F3]' : ''
              }`}
            >
              <div className="pt-px font-mono text-[13px] font-bold text-[#3D4A5C]">{s.time}</div>
              <div
                className="mt-1.5 size-[9px] justify-self-center rounded-full"
                style={{ background: s.color }}
              />
              <div>
                <div className="text-sm font-bold text-[#1B2435]">{s.title}</div>
                <div className="mt-0.5 text-[12.5px] text-[#69748A]">{s.loc}</div>
              </div>
            </div>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
