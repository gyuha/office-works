import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SAMPLE_SIGN_IN_PATH } from '@/sample/layout/navigation';
import { SAMPLE_BRAND_NAME } from '@/sample/lib/branding';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { Mail } from 'lucide-react';
import type { FieldErrors } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  createSampleForgotPasswordDemoSubmitHandler,
  sampleForgotPasswordPageCopy,
} from '../sample-auth-copy';
import type {
  SampleForgotPasswordFormValues,
  sampleForgotPasswordFieldNames,
} from '../schema/forgot-password-schema';
import { sampleForgotPasswordSchema } from '../schema/forgot-password-schema';
import { SampleAuthLogo } from './sample-auth-logo';

interface SampleForgotPasswordFieldErrorMessageProps {
  'aria-live': 'polite';
  'data-field-error': (typeof sampleForgotPasswordFieldNames)[number];
}

export const sampleForgotPasswordFieldErrorMessageProps = {
  email: {
    'aria-live': 'polite',
    'data-field-error': 'email',
  },
} as const satisfies Record<
  (typeof sampleForgotPasswordFieldNames)[number],
  SampleForgotPasswordFieldErrorMessageProps
>;

export const sampleForgotPasswordPageLayout = {
  rootClassName: 'container grid h-svh max-w-none items-center justify-center',
  contentClassName: 'mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8',
  brandClassName: 'mb-4 flex items-center justify-center',
  cardClassName: 'max-w-sm gap-4',
  formClassName: 'grid gap-3',
  emailInput: {
    type: 'email',
    autoComplete: 'email',
    className: 'h-9 rounded-md px-3',
  },
  submitButtonClassName: 'mt-2',
} as const;

export function SampleForgotPasswordPage() {
  const { t } = useTranslation('sample');
  const form = useForm<SampleForgotPasswordFormValues>({
    resolver: zodResolver(sampleForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleValidSubmit = createSampleForgotPasswordDemoSubmitHandler((result) => {
    toast.success(
      t('auth.forgotPassword.referenceValidatedMessage', {
        defaultValue: result.message,
        email: result.values.email,
      })
    );
  });

  function handleInvalidSubmit(errors: FieldErrors<SampleForgotPasswordFormValues>) {
    if (errors.email) {
      form.setFocus('email');
    }
  }

  return (
    <main className={sampleForgotPasswordPageLayout.rootClassName}>
      <div className={sampleForgotPasswordPageLayout.contentClassName}>
        <div className={sampleForgotPasswordPageLayout.brandClassName}>
          <SampleAuthLogo className="me-2" />
          <h1 className="font-medium text-xl">{SAMPLE_BRAND_NAME}</h1>
        </div>

        <Card className={sampleForgotPasswordPageLayout.cardClassName}>
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">
              {t('auth.forgotPassword.title', {
                defaultValue: sampleForgotPasswordPageCopy.title,
              })}
            </CardTitle>
            <CardDescription>
              {t('auth.forgotPassword.description', {
                defaultValue: sampleForgotPasswordPageCopy.description,
              })}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                noValidate
                onSubmit={form.handleSubmit(handleValidSubmit, handleInvalidSubmit)}
                className={sampleForgotPasswordPageLayout.formClassName}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('auth.forgotPassword.emailLabel', {
                          defaultValue: sampleForgotPasswordPageCopy.emailLabel,
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={sampleForgotPasswordPageLayout.emailInput.type}
                          placeholder={t('auth.forgotPassword.emailPlaceholder', {
                            defaultValue: sampleForgotPasswordPageCopy.emailPlaceholder,
                          })}
                          autoComplete={sampleForgotPasswordPageLayout.emailInput.autoComplete}
                          className={sampleForgotPasswordPageLayout.emailInput.className}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage {...sampleForgotPasswordFieldErrorMessageProps.email} />
                    </FormItem>
                  )}
                />

                <Button
                  className={sampleForgotPasswordPageLayout.submitButtonClassName}
                  type="submit"
                >
                  <Mail aria-hidden />
                  {t('auth.forgotPassword.submit', {
                    defaultValue: sampleForgotPasswordPageCopy.submit,
                  })}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter>
            <p className="w-full text-center text-muted-foreground text-sm">
              {t('auth.forgotPassword.signInPrompt', {
                defaultValue: sampleForgotPasswordPageCopy.signInPrompt,
              })}{' '}
              <Link
                to={SAMPLE_SIGN_IN_PATH}
                className="text-nowrap underline underline-offset-4 hover:text-primary"
              >
                {t('auth.forgotPassword.signInLink', {
                  defaultValue: sampleForgotPasswordPageCopy.signInLink,
                })}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
