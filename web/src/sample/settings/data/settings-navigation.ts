import type { SettingsNavItem } from '@/sample/settings/types/settings';
import { Bell, MonitorCog, Palette, Shield, UserRound } from 'lucide-react';

export const SETTINGS_PROFILE_PATH = '/sample/settings/profile';
export const SETTINGS_ACCOUNT_PATH = '/sample/settings/account';
export const SETTINGS_APPEARANCE_PATH = '/sample/settings/appearance';
export const SETTINGS_NOTIFICATIONS_PATH = '/sample/settings/notifications';
export const SETTINGS_DISPLAY_PATH = '/sample/settings/display';

export const settingsNavItems = [
  {
    i18nKey: 'profile',
    to: SETTINGS_PROFILE_PATH,
    icon: UserRound,
  },
  {
    i18nKey: 'account',
    to: SETTINGS_ACCOUNT_PATH,
    icon: Shield,
  },
  {
    i18nKey: 'appearance',
    to: SETTINGS_APPEARANCE_PATH,
    icon: Palette,
  },
  {
    i18nKey: 'notifications',
    to: SETTINGS_NOTIFICATIONS_PATH,
    icon: Bell,
  },
  {
    i18nKey: 'display',
    to: SETTINGS_DISPLAY_PATH,
    icon: MonitorCog,
  },
] as const satisfies readonly SettingsNavItem[];

export function isSettingsNavItemActive(pathname: string, item: SettingsNavItem): boolean {
  return pathname === item.to;
}
