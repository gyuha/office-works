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
import { UserPlus } from 'lucide-react';
import type { FieldErrors } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { createSampleSignUpDemoSubmitHandler, sampleSignUpPageCopy } from '../sample-auth-copy';
import type { SampleSignUpFormValues } from '../schema/sign-up-schema';
import { sampleSignUpFieldNames, sampleSignUpSchema } from '../schema/sign-up-schema';
import { SampleAuthLogo } from './sample-auth-logo';
import { focusFirstInvalidSampleField } from './sample-form-validation';
import { SamplePasswordInput } from './sample-password-input';
import { SampleSocialAuthButtons } from './sample-social-auth-buttons';

interface SampleSignUpFieldErrorMessageProps {
  'aria-live': 'polite';
  'data-field-error': (typeof sampleSignUpFieldNames)[number];
}

export const sampleSignUpFieldErrorMessageProps = {
  confirmPassword: {
    'aria-live': 'polite',
    'data-field-error': 'confirmPassword',
  },
  email: {
    'aria-live': 'polite',
    'data-field-error': 'email',
  },
  name: {
    'aria-live': 'polite',
    'data-field-error': 'name',
  },
  password: {
    'aria-live': 'polite',
    'data-field-error': 'password',
  },
} as const satisfies Record<
  (typeof sampleSignUpFieldNames)[number],
  SampleSignUpFieldErrorMessageProps
>;

export function SampleSignUpPage() {
  const { t } = useTranslation('sample');
  const form = useForm<SampleSignUpFormValues>({
    resolver: zodResolver(sampleSignUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleValidSubmit = createSampleSignUpDemoSubmitHandler((result) => {
    toast.success(
      t('auth.signUp.referenceValidatedMessage', {
        defaultValue: result.message,
        email: result.values.email,
      })
    );
  });

  function handleInvalidSubmit(errors: FieldErrors<SampleSignUpFormValues>) {
    focusFirstInvalidSampleField(sampleSignUpFieldNames, errors, form.setFocus);
  }

  return (
    <main className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
        <div className="mb-4 flex items-center justify-center">
          <SampleAuthLogo className="me-2" />
          <h1 className="font-medium text-xl">{SAMPLE_BRAND_NAME}</h1>
        </div>

        <Card className="max-w-md gap-4">
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">
              {t('auth.signUp.title', { defaultValue: sampleSignUpPageCopy.title })}
            </CardTitle>
            <CardDescription>
              {t('auth.signUp.description', {
                defaultValue: sampleSignUpPageCopy.description,
              })}{' '}
              {t('auth.signUp.signInPrompt', {
                defaultValue: sampleSignUpPageCopy.signInPrompt,
              })}{' '}
              <Link
                to={SAMPLE_SIGN_IN_PATH}
                className="text-nowrap underline underline-offset-4 hover:text-primary"
              >
                {t('auth.signUp.signInLink', { defaultValue: sampleSignUpPageCopy.signInLink })}
              </Link>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                noValidate
                onSubmit={form.handleSubmit(handleValidSubmit, handleInvalidSubmit)}
                className="grid gap-3"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('auth.signUp.nameLabel', {
                          defaultValue: sampleSignUpPageCopy.nameLabel,
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder={t('auth.signUp.namePlaceholder', {
                            defaultValue: sampleSignUpPageCopy.namePlaceholder,
                          })}
                          autoComplete="name"
                          className="h-9 rounded-md px-3"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage {...sampleSignUpFieldErrorMessageProps.name} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('auth.signUp.emailLabel', {
                          defaultValue: sampleSignUpPageCopy.emailLabel,
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('auth.signUp.emailPlaceholder', {
                            defaultValue: sampleSignUpPageCopy.emailPlaceholder,
                          })}
                          autoComplete="email"
                          className="h-9 rounded-md px-3"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage {...sampleSignUpFieldErrorMessageProps.email} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('auth.signUp.passwordLabel', {
                          defaultValue: sampleSignUpPageCopy.passwordLabel,
                        })}
                      </FormLabel>
                      <FormControl>
                        <SamplePasswordInput
                          placeholder={t('auth.signUp.passwordPlaceholder', {
                            defaultValue: sampleSignUpPageCopy.passwordPlaceholder,
                          })}
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage {...sampleSignUpFieldErrorMessageProps.password} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('auth.signUp.confirmPasswordLabel', {
                          defaultValue: sampleSignUpPageCopy.confirmPasswordLabel,
                        })}
                      </FormLabel>
                      <FormControl>
                        <SamplePasswordInput
                          placeholder={t('auth.signUp.confirmPasswordPlaceholder', {
                            defaultValue: sampleSignUpPageCopy.confirmPasswordPlaceholder,
                          })}
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage {...sampleSignUpFieldErrorMessageProps.confirmPassword} />
                    </FormItem>
                  )}
                />

                <Button className="mt-2" type="submit">
                  <UserPlus aria-hidden />
                  {t('auth.signUp.submit', { defaultValue: sampleSignUpPageCopy.submit })}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('auth.signUp.continueWith', {
                        defaultValue: sampleSignUpPageCopy.continueWith,
                      })}
                    </span>
                  </div>
                </div>

                <SampleSocialAuthButtons />
              </form>
            </Form>
          </CardContent>

          <CardFooter>
            <p className="px-8 text-center text-muted-foreground text-sm">
              {t('auth.signUp.termsPrefix', {
                defaultValue: sampleSignUpPageCopy.termsPrefix,
              })}{' '}
              <Link
                to="/sample/help-center"
                className="underline underline-offset-4 hover:text-primary"
              >
                {t('auth.signUp.termsOfService', {
                  defaultValue: sampleSignUpPageCopy.termsOfService,
                })}
              </Link>{' '}
              {t('auth.signUp.termsConjunction', {
                defaultValue: sampleSignUpPageCopy.termsConjunction,
              })}{' '}
              <Link
                to="/sample/help-center"
                className="underline underline-offset-4 hover:text-primary"
              >
                {t('auth.signUp.privacyPolicy', {
                  defaultValue: sampleSignUpPageCopy.privacyPolicy,
                })}
              </Link>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
