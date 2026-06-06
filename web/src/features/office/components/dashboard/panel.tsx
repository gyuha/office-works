import { useNavigate } from '@tanstack/react-router';

import { cn } from '@/lib/utils';
import { OfficeIcon } from '../../icons';

/* ============================================================
   OfficeMate — 재사용 Panel 카드
   ============================================================ */

export function PanelHeader({
  title,
  moreScreenId,
  extra,
  children,
}: {
  title: React.ReactNode;
  moreScreenId?: string;
  extra?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const navigate = useNavigate();

  const goMore = () => {
    if (!moreScreenId) return;
    if (moreScreenId === 'dashboard') navigate({ to: '/' });
    else navigate({ to: '/app/$screenId', params: { screenId: moreScreenId } });
  };

  return (
    <div className="flex items-center justify-between px-[22px] pb-3.5 pt-5">
      <div className="text-[17px] font-extrabold tracking-[-0.02em] text-[#1B2435]">{title}</div>
      {extra}
      {moreScreenId && (
        <button
          type="button"
          onClick={goMore}
          className="inline-flex cursor-pointer items-center gap-[3px] text-[13px] font-semibold text-[#69748A] transition-colors hover:text-primary [&_svg]:size-3.5"
        >
          전체보기
          <OfficeIcon name="chevR" />
        </button>
      )}
      {children}
    </div>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm',
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('flex-1 px-[22px] pb-[22px]', className)}>{children}</div>;
}
