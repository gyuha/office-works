import type { LucideIcon } from 'lucide-react';

export type SettingsRoutePath =
  | '/sample/settings/profile'
  | '/sample/settings/account'
  | '/sample/settings/appearance'
  | '/sample/settings/notifications'
  | '/sample/settings/display';

export interface SettingsNavItem {
  i18nKey: 'profile' | 'account' | 'appearance' | 'notifications' | 'display';
  to: SettingsRoutePath;
  icon: LucideIcon;
}

export interface ChoiceItem {
  value: string;
  label: string;
  description: string;
}
