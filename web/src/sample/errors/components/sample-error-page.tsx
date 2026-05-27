import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SAMPLE_DASHBOARD_PATH } from '@/sample/layout/navigation';
import { SAMPLE_BRAND_NAME } from '@/sample/lib/branding';
import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface SampleErrorPageProps {
  code: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function SampleErrorPage({ code, title, description, icon: Icon }: SampleErrorPageProps) {
  const { t } = useTranslation('sample');

  return (
    <main className="container grid min-h-svh max-w-none place-items-center bg-muted/20 px-4 py-10">
      <Card className="w-full max-w-lg gap-6 text-center shadow-sm">
        <CardHeader className="items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-8" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-muted-foreground text-sm tracking-[0.3em]">{code}</p>
            <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
            <CardDescription className="text-base leading-7">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {t('errors.standalone', { brand: SAMPLE_BRAND_NAME })}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link to={SAMPLE_DASHBOARD_PATH} className={buttonVariants({ size: 'lg' })}>
            <Home className="size-4" aria-hidden />
            {t('errors.backToDashboard')}
          </Link>
          <Link
            to="/sample/help-center"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('errors.visitHelpCenter')}
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
