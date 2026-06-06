import { Link } from '@tanstack/react-router';
import { ChevronLeft, LayoutDashboard } from 'lucide-react';

import { cn } from '@/lib/utils';

export function PlaceholderScreen({
  title,
  icon,
}: {
  title: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="max-w-[420px]">
        <div className="mx-auto mb-5 grid size-[72px] place-items-center rounded-[20px] bg-[#E8F0FF] text-primary [&_svg]:size-[34px]">
          {icon ?? <LayoutDashboard />}
        </div>
        <h2 className="mb-2 text-[22px] font-extrabold tracking-[-0.02em]">{title}</h2>
        <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">
          이 화면은 대시보드 다음 단계에서 구성할 영역입니다. 먼저 대시보드를 확정한 뒤 이어서
          설계하겠습니다.
        </p>
        <Link
          to="/"
          className={cn(
            'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5',
            'bg-[#E8F0FF] text-sm font-medium text-primary transition-colors hover:bg-[#DBE7FF]',
            "[&_svg]:size-4"
          )}
        >
          <ChevronLeft />
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  );
}
