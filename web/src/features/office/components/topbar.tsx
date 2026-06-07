import { useNavigate } from '@tanstack/react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { OfficeIcon } from '../icons';
import { useSidebarStore } from '../store/sidebar-store';

/* ============================================================
   OfficeMate — 상단바 (글래스 헤더, h 76px)
   ============================================================ */

function IconButton({
  name,
  badge,
}: {
  name: 'bell' | 'mail' | 'calendar';
  badge?: number;
}) {
  return (
    <button
      type="button"
      className="relative grid size-[42px] place-items-center rounded-xl text-[#8A93A6] transition-colors hover:bg-[#0000000a] hover:text-[#1B2435] [&_svg]:size-[21px]"
    >
      <OfficeIcon name={name} />
      {badge != null && (
        <span className="absolute right-[7px] top-[7px] grid h-[17px] min-w-[17px] place-items-center rounded-[9px] border-2 border-om-canvas bg-om-red px-1 font-mono text-[10px] font-extrabold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export function OfficeTopbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);

  const handleLogout = () => {
    clearUser();
    navigate({ to: '/login' });
  };

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center gap-4 border-b border-border bg-om-canvas/85 px-7 backdrop-blur-md backdrop-saturate-150">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="grid size-10 place-items-center rounded-[10px] text-[#69748A] transition-colors hover:bg-[#0000000a] [&_svg]:size-[22px]"
      >
        <OfficeIcon name="menu" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="text-[22px] font-extrabold leading-tight tracking-[-0.025em] text-[#1B2435]">
          {title}
        </div>
        <div className="mt-px text-[13.5px] font-medium text-[#69748A]">{subtitle}</div>
      </div>

      <div className="flex items-center gap-1.5">
        <IconButton name="bell" badge={8} />
        <IconButton name="mail" badge={3} />
        <IconButton name="calendar" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="ml-1.5 flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-white py-[5px] pl-1.5 pr-2.5 transition-colors hover:bg-[#F7F8FA]"
              >
                <img
                  src="https://i.pravatar.cc/80?img=12"
                  alt="프로필"
                  className="size-[38px] rounded-[10px] object-cover"
                />
                <span className="text-left">
                  <span className="block text-sm font-bold leading-tight text-[#1B2435]">
                    {user?.name ?? '김지훈 대리'}
                  </span>
                  <span className="block text-xs text-[#69748A]">개발팀</span>
                </span>
                <OfficeIcon name="chevDown" className="size-[18px] text-[#69748A]" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled className="flex-col items-start gap-0">
              <span className="text-sm font-semibold text-foreground">
                {user?.name ?? '김지훈 대리'}
              </span>
              {user?.email && (
                <span className="font-mono text-xs text-muted-foreground">{user.email}</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <OfficeIcon name="chevL" className="size-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
