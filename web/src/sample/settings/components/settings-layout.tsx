import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  isSettingsNavItemActive,
  settingsNavItems,
} from '@/sample/settings/data/settings-navigation';
import { Link, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t } = useTranslation('sample');

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <SettingsHeader />
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="p-2">
            <nav className="space-y-1" aria-label={t('settings.menuLabel')}>
              {settingsNavItems.map((item) => {
                const Icon = item.icon;
                const active = isSettingsNavItemActive(pathname, item);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex items-start gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <Icon
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        active ? 'text-primary' : 'text-muted-foreground'
                      )}
                      aria-hidden="true"
                    />
                    <span className="grid gap-1">
                      <span className="font-medium text-foreground leading-none">
                        {t(`settings.nav.${item.i18nKey}.title`)}
                      </span>
                      <span className="text-muted-foreground text-xs leading-snug">
                        {t(`settings.nav.${item.i18nKey}.description`)}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </CardContent>
        </Card>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function SettingsHeader() {
  const { t } = useTranslation('sample');

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-2xl tracking-tight md:text-3xl">{t('settings.title')}</h1>
          <Badge variant="outline">{t('settings.pageCount')}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{t('settings.description')}</p>
      </div>
    </header>
  );
}
