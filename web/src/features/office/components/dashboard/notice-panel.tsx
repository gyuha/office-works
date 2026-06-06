import { Panel, PanelBody, PanelHeader } from './panel';
import { notices } from './dashboard-data';

/* ============================================================
   OfficeMate — 공지사항 리스트
   ============================================================ */

export function NoticePanel() {
  return (
    <Panel>
      <PanelHeader title="공지사항" moreScreenId="appr-home" />
      <PanelBody>
        <div className="flex flex-col">
          {notices.map((n, i) => (
            <button
              type="button"
              key={n.title}
              className={`group flex cursor-pointer items-center gap-2.5 py-[13px] text-left ${
                i > 0 ? 'border-t border-[#F0F1F3]' : ''
              }`}
            >
              <span
                className={`flex-shrink-0 rounded-md px-2 py-[3px] text-[11px] font-extrabold ${
                  n.type === 'n'
                    ? 'bg-[#E8F0FF] text-primary'
                    : 'bg-[#EEF0F3] text-[#69748A]'
                }`}
              >
                {n.type === 'n' ? '공지' : '일반'}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-[#1B2435] transition-colors group-hover:text-primary">
                {n.title}
              </span>
              <span className="flex-shrink-0 font-mono text-[12.5px] text-[#69748A]">{n.date}</span>
            </button>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
