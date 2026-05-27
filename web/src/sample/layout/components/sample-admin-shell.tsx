import { ThemeToggle } from '@/components/theme-toggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Command as CommandRoot,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  SAMPLE_DASHBOARD_PATH,
  SAMPLE_SIGN_IN_PATH,
  type SampleNavItem,
  type SampleSecondLevelAccordionNavItem,
  getSampleNavItem,
  getSampleRouteOpenAccordionGroups,
  getSampleSidebarOpenAccordionGroups,
  isSampleNavItemActive,
  sampleNavItems,
  samplePagesMenuItem,
} from '@/sample/layout/navigation';
import { SAMPLE_BRAND_NAME, sampleBrandUser } from '@/sample/lib/branding';
import { type SampleThemePreset, useSampleThemePreset } from '@/sample/lib/sample-theme';
import {
  SETTINGS_APPEARANCE_PATH,
  SETTINGS_PROFILE_PATH,
} from '@/sample/settings/data/settings-navigation';
import useModal from '@/stores/modal-store';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Check,
  Command as CommandIcon,
  Languages,
  LogOut,
  Menu,
  MonitorCog,
  Palette,
  Settings,
  User,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function SampleAdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentItem = getSampleNavItem(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation('sample');
  const currentTitle = t(currentItem.titleI18nKey);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-sidebar-border border-r bg-sidebar text-sidebar-foreground shadow-sm transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SampleSidebar onNavigate={() => setMobileOpen(false)} pathname={pathname} />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden />
          </Button>

          <SampleBreadcrumb currentTitle={currentTitle} />

          <div className="ml-auto flex items-center gap-2">
            <CommandButton />
            <ThemeToggle />
            <ThemePresetMenu />
            <LanguageToggle />
            <SampleUserMenu />
          </div>
        </header>

        <main className="flex flex-1 flex-col bg-muted/20">{children}</main>
      </div>
    </div>
  );
}

function SampleSidebar({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const { t } = useTranslation('sample');
  const routeOpenGroups = useMemo(() => getSampleRouteOpenAccordionGroups(pathname), [pathname]);
  const [openGroups, setOpenGroups] = useState<string[]>(() => routeOpenGroups);
  const PagesIcon = samplePagesMenuItem.icon;
  const pagesActive = routeOpenGroups.includes(samplePagesMenuItem.value);
  const pagesTitle = t(samplePagesMenuItem.titleI18nKey);
  const pagesDescription = t(samplePagesMenuItem.descriptionI18nKey);

  const handleOpenGroupsChange = useCallback(
    (nextOpenGroups: string[]) => {
      setOpenGroups((currentOpenGroups) =>
        getStableSidebarOpenAccordionGroups(currentOpenGroups, nextOpenGroups, routeOpenGroups)
      );
    },
    [routeOpenGroups]
  );

  useEffect(() => {
    setOpenGroups((currentOpenGroups) =>
      getStableSidebarOpenAccordionGroups(currentOpenGroups, currentOpenGroups, routeOpenGroups)
    );
  }, [routeOpenGroups]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-16 items-center gap-3 border-sidebar-border border-b px-5">
        <Link to={SAMPLE_DASHBOARD_PATH} className="flex items-center gap-3" onClick={onNavigate}>
          <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sidebar-primary-foreground shadow-sm">
            SA
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-semibold tracking-tight">{SAMPLE_BRAND_NAME}</span>
            <span className="mt-1 text-sidebar-foreground/60 text-xs">{t('brand.reference')}</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Sample Admin navigation">
        <Accordion
          multiple
          value={openGroups}
          onValueChange={handleOpenGroupsChange}
          className="space-y-1"
        >
          <AccordionItem value={samplePagesMenuItem.value} className="border-0">
            <AccordionTrigger
              className={cn(
                'items-center gap-3 px-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:no-underline',
                pagesActive
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80'
              )}
            >
              <PagesIcon
                className={cn(
                  'size-4 shrink-0',
                  pagesActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'
                )}
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span>{pagesTitle}</span>
                <span className="truncate font-normal text-sidebar-foreground/50 text-xs">
                  {pagesDescription}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-1 pb-0 pl-5 [&_a]:no-underline">
              {samplePagesMenuItem.items.map((item) =>
                item.kind === 'accordion' ? (
                  <SampleSidebarAccordionGroup
                    key={item.value}
                    item={item}
                    pathname={pathname}
                    routeOpenGroups={routeOpenGroups}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <SampleSidebarLink
                    key={item.to}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                )
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-3">
          <Avatar className="size-9 border border-sidebar-border">
            <AvatarImage src={sampleBrandUser.avatarUrl} alt="" />
            <AvatarFallback>{sampleBrandUser.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-sm">{sampleBrandUser.name}</div>
            <div className="truncate text-sidebar-foreground/60 text-xs">
              {sampleBrandUser.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStableSidebarOpenAccordionGroups(
  currentOpenGroups: string[],
  nextOpenGroups: readonly string[],
  routeOpenGroups: readonly string[]
): string[] {
  const resolvedOpenGroups = getSampleSidebarOpenAccordionGroups(nextOpenGroups, routeOpenGroups);

  return haveSameOrderedValues(currentOpenGroups, resolvedOpenGroups)
    ? currentOpenGroups
    : resolvedOpenGroups;
}

function haveSameOrderedValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function SampleSidebarAccordionGroup({
  item,
  pathname,
  routeOpenGroups,
  onNavigate,
}: {
  item: SampleSecondLevelAccordionNavItem;
  pathname: string;
  routeOpenGroups: readonly string[];
  onNavigate: () => void;
}) {
  const { t } = useTranslation('sample');
  const Icon = item.icon;
  const active = routeOpenGroups.includes(item.value);
  const title = t(item.titleI18nKey);
  const description = t(item.descriptionI18nKey);

  return (
    <AccordionItem value={item.value} className="border-0">
      <AccordionTrigger
        className={cn(
          'items-center gap-3 px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:no-underline',
          active
            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80'
        )}
      >
        <Icon
          className={cn(
            'size-4 shrink-0',
            active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'
          )}
          aria-hidden
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span>{title}</span>
          <span className="truncate font-normal text-sidebar-foreground/50 text-xs">
            {description}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-1 pb-0 pl-4">
        {item.items.map((childItem) => (
          <SampleSidebarLink
            key={childItem.to}
            item={childItem}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}

function SampleSidebarLink({
  item,
  pathname,
  onNavigate,
}: {
  item: SampleNavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const { t } = useTranslation('sample');
  const Icon = item.icon;
  const active = isSampleNavItemActive(pathname, item);
  const title = t(item.titleI18nKey);
  const description = t(item.descriptionI18nKey);

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80'
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'
        )}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col">
        <span>{title}</span>
        <span className="truncate text-sidebar-foreground/50 text-xs">{description}</span>
      </span>
    </Link>
  );
}

function SampleBreadcrumb({ currentTitle }: { currentTitle: string }) {
  return (
    <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="Breadcrumb">
      <Link
        to={SAMPLE_DASHBOARD_PATH}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {SAMPLE_BRAND_NAME}
      </Link>
      <span className="text-muted-foreground/60">/</span>
      <span className="truncate font-medium">{currentTitle}</span>
    </nav>
  );
}

function CommandButton() {
  const { t } = useTranslation('sample');
  const { openModal } = useModal();
  const openCommandPalette = useCallback(() => {
    openModal({ custom: <SampleCommandPalette />, size: 'md', className: 'overflow-hidden p-0' });
  }, [openModal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openCommandPalette]);

  return (
    <Button
      type="button"
      variant="outline"
      className="hidden h-9 gap-2 px-3 text-muted-foreground md:flex"
      onClick={openCommandPalette}
    >
      <CommandIcon className="size-4" aria-hidden />
      <span>{t('header.search')}</span>
      <kbd className="pointer-events-none ml-6 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px] text-muted-foreground opacity-100 lg:inline-flex">
        ⌘K
      </kbd>
    </Button>
  );
}

function SampleCommandPalette() {
  const navigate = useNavigate();
  const { closeModal } = useModal();
  const { t } = useTranslation('sample');

  const goTo = (to: (typeof sampleNavItems)[number]['to']) => {
    closeModal();
    navigate({ to });
  };

  return (
    <CommandRoot className="rounded-xl border-0">
      <div className="border-b px-2 py-2">
        <p className="px-2 pb-2 font-medium text-sm">{t('command.title')}</p>
        <CommandInput autoFocus placeholder={t('command.placeholder')} />
      </div>
      <CommandList>
        <CommandEmpty>{t('command.empty')}</CommandEmpty>
        <CommandGroup heading={t('command.navigation')}>
          {sampleNavItems.map((item) => {
            const Icon = item.icon;
            const title = t(item.titleI18nKey);
            const description = t(item.descriptionI18nKey);

            return (
              <CommandItem
                key={item.to}
                value={`${title} ${description}`}
                onSelect={() => goTo(item.to)}
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <span>{title}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandRoot>
  );
}

const themePresetLabels: Record<SampleThemePreset, string> = {
  default: 'Default',
  blue: 'Blue',
  green: 'Green',
  orange: 'Orange',
  red: 'Red',
};

function ThemePresetMenu() {
  const { t } = useTranslation('sample');
  const { preset, setPreset } = useSampleThemePreset();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('header.themePreset')}
          />
        }
      >
        <Palette className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t('header.themePreset')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.keys(themePresetLabels).map((value) => {
          const option = value as SampleThemePreset;

          return (
            <DropdownMenuItem key={option} onClick={() => setPreset(option)}>
              {preset === option ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <span className="size-4" />
              )}
              {t(`themePreset.${option}`)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LanguageToggle() {
  const { i18n, t } = useTranslation('sample');
  const nextLanguage = i18n.language === 'ko' ? 'en' : 'ko';

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 gap-2 px-3"
      aria-label={t('header.language')}
      onClick={() => i18n.changeLanguage(nextLanguage)}
    >
      <Languages className="size-4" aria-hidden />
      <span className="font-medium text-xs uppercase">{i18n.language}</span>
    </Button>
  );
}

function SampleUserMenu() {
  const navigate = useNavigate();
  const { t } = useTranslation('sample');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={buttonVariants({ variant: 'ghost', className: 'h-10 gap-2 px-2' })}
            aria-label={t('header.openUserMenu', { name: sampleBrandUser.name })}
          />
        }
      >
        <Avatar className="size-8">
          <AvatarImage src={sampleBrandUser.avatarUrl} alt="" />
          <AvatarFallback>{sampleBrandUser.initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-24 truncate text-sm md:inline">{sampleBrandUser.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground text-sm">{sampleBrandUser.name}</span>
            <span className="truncate font-normal text-muted-foreground text-xs">
              {sampleBrandUser.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: SETTINGS_PROFILE_PATH })}>
          <User className="size-4 text-muted-foreground" aria-hidden />
          {t('userMenu.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: SETTINGS_PROFILE_PATH })}>
          <Settings className="size-4 text-muted-foreground" aria-hidden />
          {t('userMenu.settings')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: SETTINGS_APPEARANCE_PATH })}>
          <MonitorCog className="size-4 text-muted-foreground" aria-hidden />
          {t('userMenu.appearance')}
        </DropdownMenuItem>
        <Separator className="my-1" />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => navigate({ to: SAMPLE_SIGN_IN_PATH })}
        >
          <LogOut className="size-4" aria-hidden />
          {t('userMenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
