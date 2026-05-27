import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  helpCenterArticles,
  helpCenterContactOptions,
  helpCenterFaqs,
} from '@/sample/help-center/data/help-center';
import type {
  HelpCenterArticle,
  HelpCenterArticleStatus,
  HelpCenterCategory,
  HelpCenterContactOption,
} from '@/sample/help-center/types/help-center';
import type { TFunction } from 'i18next';
import {
  BookOpen,
  Clock3,
  HelpCircle,
  LifeBuoy,
  MailQuestion,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const categoryFilters = [
  'all',
  'getting-started',
  'account',
  'workflow',
  'billing',
  'security',
] as const;

const statusMeta = {
  popular: { labelKey: 'helpCenter.status.popular', variant: 'default' },
  updated: { labelKey: 'helpCenter.status.updated', variant: 'secondary' },
  new: { labelKey: 'helpCenter.status.new', variant: 'outline' },
} as const satisfies Record<HelpCenterArticleStatus, { labelKey: string; variant: BadgeVariant }>;

const categoryIcons = {
  'getting-started': Sparkles,
  account: MessageSquareText,
  workflow: BookOpen,
  billing: MailQuestion,
  security: ShieldCheck,
} as const satisfies Record<HelpCenterCategory, typeof HelpCircle>;

type CategoryFilter = (typeof categoryFilters)[number];
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function HelpCenterPage() {
  const { t } = useTranslation('sample');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return helpCenterArticles.filter((article) => {
      const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
      const searchableText = [
        article.title,
        article.excerpt,
        t(`helpCenter.category.${article.category}`),
        t(statusMeta[article.status].labelKey),
      ]
        .join(' ')
        .toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, t]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <HelpCenterHeader
        articleCount={helpCenterArticles.length}
        faqCount={helpCenterFaqs.length}
        t={t}
      />
      <HelpCenterSearch
        activeCategory={activeCategory}
        query={query}
        onCategoryChange={setActiveCategory}
        onQueryChange={setQuery}
        t={t}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section aria-label={t('helpCenter.articlesLabel')} className="grid gap-4 md:grid-cols-2">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} t={t} />
            ))}
          </section>
          {filteredArticles.length === 0 ? <HelpCenterEmptyState t={t} /> : null}
          <FaqSection t={t} />
        </div>
        <ContactPanel t={t} />
      </section>
    </main>
  );
}

function HelpCenterHeader({
  articleCount,
  faqCount,
  t,
}: { articleCount: number; faqCount: number; t: TFunction<'sample'> }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <LifeBuoy className="size-4" aria-hidden />
          <span>{t('helpCenter.eyebrow')}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('helpCenter.title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('helpCenter.description')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <MetricCard label={t('helpCenter.articles')} value={articleCount.toString()} />
        <MetricCard label={t('helpCenter.faqs')} value={faqCount.toString()} />
      </div>
    </header>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="font-semibold text-2xl">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function HelpCenterSearch({
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
      aria-label={t('helpCenter.filtersLabel')}
    >
      <div className="relative max-w-xl">
        <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder={t('helpCenter.search')}
          className="pl-8"
          aria-label={t('helpCenter.searchLabel')}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {categoryFilters.map((category) => {
          const active = category === activeCategory;
          const label =
            category === 'all' ? t('helpCenter.all') : t(`helpCenter.category.${category}`);

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

function ArticleCard({ article, t }: { article: HelpCenterArticle; t: TFunction<'sample'> }) {
  const Icon = categoryIcons[article.category];
  const status = statusMeta[article.status];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-base leading-6">{article.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(`helpCenter.category.${article.category}`)}</Badge>
              <Badge variant={status.variant}>{t(status.labelKey)}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm leading-6">{article.excerpt}</p>
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" aria-hidden />
            {t('helpCenter.minRead', { count: article.readMinutes })}
          </span>
          <span>
            {t('helpCenter.updated', { date: dateFormatter.format(new Date(article.updatedAt)) })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function FaqSection({ t }: { t: TFunction<'sample'> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" aria-hidden />
          {t('helpCenter.faqTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion className="rounded-lg border px-4">
          {helpCenterFaqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function ContactPanel({ t }: { t: TFunction<'sample'> }) {
  return (
    <aside className="space-y-4" aria-label={t('helpCenter.contactLabel')}>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="size-5 text-primary" aria-hidden />
            {t('helpCenter.needHelp')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground leading-6">{t('helpCenter.contactDescription')}</p>
          {helpCenterContactOptions.map((option) => (
            <ContactOptionCard key={option.id} option={option} />
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}

function ContactOptionCard({ option }: { option: HelpCenterContactOption }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="font-medium">{option.title}</div>
      <p className="mt-1 text-muted-foreground leading-6">{option.description}</p>
      <Badge className="mt-3" variant="secondary">
        {option.responseTime}
      </Badge>
    </div>
  );
}

function HelpCenterEmptyState({ t }: { t: TFunction<'sample'> }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card p-8 text-center">
      <HelpCircle className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold">{t('helpCenter.emptyTitle')}</h2>
      <p className="text-muted-foreground text-sm">{t('helpCenter.emptyDescription')}</p>
    </div>
  );
}
