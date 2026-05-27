import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apps } from '@/sample/apps/data/apps';
import type { SampleApp, SampleAppCategory, SampleAppStatus } from '@/sample/apps/types/app';
import type { TFunction } from 'i18next';
import { Boxes, CheckCircle2, PlugZap, Search, Sparkles, Star } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const categoryMeta: Record<SampleAppCategory, { labelKey: string; descriptionKey: string }> = {
  analytics: {
    labelKey: 'apps.category.analytics.label',
    descriptionKey: 'apps.category.analytics.description',
  },
  communication: {
    labelKey: 'apps.category.communication.label',
    descriptionKey: 'apps.category.communication.description',
  },
  developer: {
    labelKey: 'apps.category.developer.label',
    descriptionKey: 'apps.category.developer.description',
  },
  finance: {
    labelKey: 'apps.category.finance.label',
    descriptionKey: 'apps.category.finance.description',
  },
  marketing: {
    labelKey: 'apps.category.marketing.label',
    descriptionKey: 'apps.category.marketing.description',
  },
};

const statusMeta: Record<
  SampleAppStatus,
  { labelKey: string; badge: 'default' | 'secondary' | 'outline' }
> = {
  connected: { labelKey: 'apps.status.connected', badge: 'default' },
  available: { labelKey: 'apps.status.available', badge: 'secondary' },
  'coming-soon': { labelKey: 'apps.status.coming-soon', badge: 'outline' },
};

const categoryFilters: readonly ('all' | SampleAppCategory)[] = [
  'all',
  'analytics',
  'communication',
  'developer',
  'finance',
  'marketing',
] as const;

const formatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

type CategoryFilter = (typeof categoryFilters)[number];

export function AppsPage() {
  const { t } = useTranslation('sample');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return apps.filter((app) => {
      const matchesCategory = activeCategory === 'all' || app.category === activeCategory;
      const searchableText =
        `${app.name} ${app.description} ${t(categoryMeta[app.category].labelKey)}`.toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, t]);

  const featuredApps = useMemo(() => apps.filter((app) => app.featured), []);
  const connectedCount = useMemo(() => apps.filter((app) => app.status === 'connected').length, []);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <AppsHeader connectedCount={connectedCount} totalCount={apps.length} t={t} />
      <FeaturedApps apps={featuredApps} t={t} />
      <AppsToolbar
        activeCategory={activeCategory}
        query={query}
        onCategoryChange={setActiveCategory}
        onQueryChange={setQuery}
        t={t}
      />
      <section
        aria-label={t('apps.listLabel')}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {filteredApps.map((app) => (
          <AppCard key={app.id} app={app} t={t} />
        ))}
      </section>
      {filteredApps.length === 0 ? <AppsEmptyState t={t} /> : null}
    </main>
  );
}

function AppsHeader({
  connectedCount,
  totalCount,
  t,
}: { connectedCount: number; totalCount: number; t: TFunction<'sample'> }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Boxes className="size-4" aria-hidden />
          <span>{t('apps.eyebrow')}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('apps.title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('apps.description')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
          <div className="font-semibold text-2xl">{connectedCount}</div>
          <div className="text-muted-foreground">{t('apps.connected')}</div>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
          <div className="font-semibold text-2xl">{totalCount}</div>
          <div className="text-muted-foreground">{t('apps.availableApps')}</div>
        </div>
      </div>
    </header>
  );
}

function FeaturedApps({ apps: featuredApps, t }: { apps: SampleApp[]; t: TFunction<'sample'> }) {
  return (
    <section aria-label="Featured apps" className="grid gap-4 lg:grid-cols-3">
      {featuredApps.map((app) => (
        <Card key={app.id} className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden />
              {app.name}
            </CardTitle>
            <CardDescription>{app.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t(categoryMeta[app.category].labelKey)}</span>
            <StatusBadge status={app.status} t={t} />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function AppsToolbar({
  activeCategory,
  query,
  onCategoryChange,
  onQueryChange,
  t,
}: {
  activeCategory: CategoryFilter;
  query: string;
  onCategoryChange: (category: CategoryFilter) => void;
  onQueryChange: (query: string) => void;
  t: TFunction<'sample'>;
}) {
  return (
    <section
      className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
      aria-label={t('apps.filtersLabel')}
    >
      <div className="relative max-w-md">
        <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder={t('apps.search')}
          className="pl-8"
          aria-label={t('apps.searchLabel')}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {categoryFilters.map((category) => {
          const active = category === activeCategory;
          const label = category === 'all' ? t('apps.all') : t(categoryMeta[category].labelKey);

          return (
            <Button
              key={category}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(category)}
              aria-pressed={active}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}

function AppCard({ app, t }: { app: SampleApp; t: TFunction<'sample'> }) {
  const status = statusMeta[app.status];
  const connected = app.status === 'connected';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AppLogo app={app} />
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="truncate">{app.name}</CardTitle>
            <CardDescription>{t(categoryMeta[app.category].descriptionKey)}</CardDescription>
          </div>
        </div>
        <CardAction>
          <StatusBadge status={app.status} t={t} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="min-h-12 text-muted-foreground text-sm leading-6">{app.description}</p>
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
          <Metric label={t('apps.metrics.users')} value={formatter.format(app.users)} />
          <Metric
            label={t('apps.metrics.rating')}
            value={app.rating.toFixed(1)}
            icon={<Star className="size-3" />}
          />
          <Metric label={t('apps.metrics.reviews')} value={formatter.format(app.reviews)} />
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="text-muted-foreground text-xs">
          {t(categoryMeta[app.category].labelKey)}
        </span>
        <Button
          type="button"
          size="sm"
          variant={connected ? 'outline' : 'default'}
          disabled={app.status === 'coming-soon'}
        >
          {connected ? (
            <CheckCircle2 className="size-4" aria-hidden />
          ) : (
            <PlugZap className="size-4" aria-hidden />
          )}
          {connected ? t('apps.manage') : t(status.labelKey)}
        </Button>
      </CardFooter>
    </Card>
  );
}

function AppLogo({ app }: { app: SampleApp }) {
  return (
    <div
      className="flex size-11 shrink-0 items-center justify-center rounded-xl font-semibold text-primary-foreground shadow-sm"
      style={{ backgroundColor: app.accentColor }}
      aria-hidden
    >
      {getAppInitials(app.name)}
    </div>
  );
}

function StatusBadge({ status, t }: { status: SampleAppStatus; t: TFunction<'sample'> }) {
  const meta = statusMeta[status];

  return <Badge variant={meta.badge}>{t(meta.labelKey)}</Badge>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 font-medium">
        {icon}
        <span>{value}</span>
      </div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}

function AppsEmptyState({ t }: { t: TFunction<'sample'> }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card p-8 text-center">
      <Boxes className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold">{t('apps.emptyTitle')}</h2>
      <p className="text-muted-foreground text-sm">{t('apps.emptyDescription')}</p>
    </div>
  );
}

function getAppInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.at(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
