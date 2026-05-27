import type { UserRole, UserStatus } from '@/sample/users/types/user';
import { Crown, type LucideIcon, ShieldCheck, ShoppingCart, UserCog } from 'lucide-react';

/**
 * Status badge color presets for user statuses.
 *
 * Note: 키는 `UserStatus`와 1:1 대응됩니다. 누락 시 colmuns 셀 렌더가 fallback class로 떨어집니다.
 */
export const userStatusStyles: Record<UserStatus, string> = {
  active:
    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400',
  inactive:
    'bg-neutral-500/10 text-neutral-600 border-neutral-500/20 dark:bg-neutral-500/15 dark:text-neutral-400',
  invited: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400',
  suspended:
    'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400',
};

export interface UserStatusOption {
  value: UserStatus;
  label: string;
}

export const userStatuses: UserStatusOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
];

export interface UserRoleOption {
  value: UserRole;
  label: string;
  icon: LucideIcon;
}

export const userRoles: UserRoleOption[] = [
  { value: 'superadmin', label: 'Superadmin', icon: Crown },
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
  { value: 'manager', label: 'Manager', icon: UserCog },
  { value: 'cashier', label: 'Cashier', icon: ShoppingCart },
];
