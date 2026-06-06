import { Panel, PanelBody, PanelHeader } from './panel';
import { projects } from './dashboard-data';

/* ============================================================
   OfficeMate — 진행 중인 프로젝트 테이블
   ============================================================ */

export function ProjectTable() {
  return (
    <Panel>
      <PanelHeader title="진행 중인 프로젝트" moreScreenId="proj-list" />
      <PanelBody>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-border px-1.5 pb-3 pt-2 text-left text-[12.5px] font-bold text-[#69748A]">
                프로젝트명
              </th>
              <th className="border-b border-border px-1.5 pb-3 pt-2 text-left text-[12.5px] font-bold text-[#69748A]">
                역할
              </th>
              <th className="w-[170px] border-b border-border px-1.5 pb-3 pt-2 text-left text-[12.5px] font-bold text-[#69748A]">
                진척도
              </th>
              <th className="border-b border-border px-1.5 pb-3 pt-2 text-left text-[12.5px] font-bold text-[#69748A]">
                기간
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.name} className="group">
                <td className="whitespace-nowrap border-b border-[#F0F1F3] px-1.5 py-[15px] text-sm font-bold text-[#1B2435] group-last:border-b-0">
                  {p.name}
                </td>
                <td className="whitespace-nowrap border-b border-[#F0F1F3] px-1.5 py-[15px] text-sm text-[#3D4A5C] group-last:border-b-0">
                  {p.role}
                </td>
                <td className="border-b border-[#F0F1F3] px-1.5 py-[15px] text-sm group-last:border-b-0">
                  <div className="flex min-w-[96px] items-center gap-[9px]">
                    <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#EEF0F3]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                    <span className="w-[34px] text-right font-mono text-[13px] font-bold text-[#3D4A5C]">
                      {p.pct}%
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap border-b border-[#F0F1F3] px-1.5 py-[15px] font-mono text-xs text-[#69748A] group-last:border-b-0">
                  {p.period}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelBody>
    </Panel>
  );
}
