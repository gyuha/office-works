import { useNavigate } from '@tanstack/react-router';

import { OfficeIcon } from '../../icons';
import { TINT, quickLinks } from './dashboard-data';

/* ============================================================
   OfficeMate — 바로가기 8개 그리드
   ============================================================ */

export function QuickLinks() {
  const navigate = useNavigate();

  const go = (id: string) => {
    if (id === 'dashboard') navigate({ to: '/' });
    else navigate({ to: '/app/$screenId', params: { screenId: id } });
  };

  return (
    <div className="rounded-xl border border-border bg-white px-[22px] pb-[22px] pt-5 shadow-sm">
      <div className="mb-3.5 text-base font-extrabold tracking-[-0.02em]">바로가기</div>
      <div className="grid grid-cols-4 gap-3 min-[1100px]:grid-cols-8">
        {quickLinks.map((q) => (
          <button
            type="button"
            key={q.id + q.label}
            onClick={() => go(q.id)}
            className="flex cursor-pointer flex-col items-center gap-2.5 rounded-[14px] border border-border bg-white px-2.5 py-[18px] transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
          >
            <span
              className={`grid size-[42px] place-items-center rounded-xl [&_svg]:size-[21px] ${TINT[q.tint]}`}
            >
              <OfficeIcon name={q.icon} />
            </span>
            <span className="whitespace-nowrap text-[13px] font-bold text-[#3D4A5C]">{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
