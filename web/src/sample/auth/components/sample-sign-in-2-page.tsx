import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SAMPLE_FORGOT_PASSWORD_PATH, SAMPLE_SIGN_UP_PATH } from '@/sample/layout/navigation';
import { SAMPLE_BRAND_NAME } from '@/sample/lib/branding';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { createSampleSignIn2DemoSubmitHandler, sampleSignIn2PageCopy } from '../sample-auth-copy';
import type { SampleSignInFormValues } from '../schema/sign-in-schema';
import { sampleSignInFieldNames, sampleSignInSchema } from '../schema/sign-in-schema';
import { SampleAuthLogo } from './sample-auth-logo';
import { focusFirstInvalidSampleField } from './sample-form-validation';
import { SamplePasswordInput } from './sample-password-input';
import { SampleSignInDemoFeedbackAlert } from './sample-sign-in-feedback';
import type { SampleSignInSubmissionFeedback } from './sample-sign-in-feedback-contract';
import { sampleSignInFieldErrorMessageProps } from './sample-sign-in-feedback-contract';
import { SampleSocialAuthButtons } from './sample-social-auth-buttons';

export const sampleSignIn2SuccessFeedback = {
  kind: 'success',
  title: sampleSignIn2PageCopy.feedback.successTitle,
  description: sampleSignIn2PageCopy.referenceValidatedMessage,
} as const satisfies SampleSignInSubmissionFeedback;

export function SampleSignIn2Page() {
  const { t } = useTranslation('sample');
  const [submissionFeedback, setSubmissionFeedback] =
    useState<SampleSignInSubmissionFeedback | null>(null);
  const form = useForm<SampleSignInFormValues>({
    resolver: zodResolver(sampleSignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const brandHighlights = sampleSignIn2PageCopy.brandHighlights.map((highlight, index) =>
    t(`auth.signIn2.brandHighlights.${index}`, { defaultValue: highlight })
  );

  const handleValidSubmit = createSampleSignIn2DemoSubmitHandler((result) => {
    const message = t('auth.signIn2.referenceValidatedMessage', {
      defaultValue: result.message,
      email: result.values.email,
    });

    setSubmissionFeedback({
      kind: sampleSignIn2SuccessFeedback.kind,
      title: t('auth.signIn2.feedback.successTitle', {
        defaultValue: sampleSignIn2SuccessFeedback.title,
      }),
      description: message,
    });
  });

  function clearSubmissionFeedback() {
    if (submissionFeedback) {
      setSubmissionFeedback(null);
    }
  }

  function handleInvalidSubmit(errors: FieldErrors<SampleSignInFormValues>) {
    clearSubmissionFeedback();
    focusFirstInvalidSampleField(sampleSignInFieldNames, errors, form.setFocus);
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-zinc-950 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,_rgba(250,250,250,0.18),_transparent_24%),radial-gradient(circle_at_78%_22%,_hsl(var(--primary)/0.36),_transparent_30%),linear-gradient(135deg,_#09090b_0%,_#18181b_56%,_#27272a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.055)_1px,_transparent_1px)] bg-[size:56px_56px] opacity-35" />
        <div className="absolute -left-24 bottom-12 h-72 w-72 rounded-full border border-white/10 bg-white/5 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link
            to="/sample/dashboard"
            preload={false}
            className="flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-2 font-medium text-sm shadow-2xl shadow-black/20 backdrop-blur-md transition-colors hover:bg-white/15"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-zinc-950">
              <SampleAuthLogo className="size-4" />
            </span>
            <span>{SAMPLE_BRAND_NAME}</span>
          </Link>

          <div className="max-w-xl space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  <Sparkles aria-hidden />
                  {t('auth.signIn2.brandBadge', {
                    defaultValue: sampleSignIn2PageCopy.brandBadge,
                  })}
                </Badge>
                <span className="font-medium text-white/60 text-xs uppercase tracking-[0.32em]">
                  {t('auth.signIn2.brandEyebrow', {
                    defaultValue: sampleSignIn2PageCopy.brandEyebrow,
                  })}
                </span>
              </div>
              <p className="text-balance font-semibold text-4xl leading-tight tracking-tight xl:text-5xl">
                {t('auth.signIn2.brandStatement', {
                  defaultValue: sampleSignIn2PageCopy.brandStatement,
                })}
              </p>
              <p className="max-w-lg text-pretty text-sm text-white/68 leading-6">
                {t('auth.signIn2.brandDescription', {
                  defaultValue: sampleSignIn2PageCopy.brandDescription,
                })}
              </p>
            </div>

            <div className="grid gap-3">
              {brandHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-sm text-white/82 shadow-2xl shadow-black/10 backdrop-blur-md"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
                    <ShieldCheck className="size-4" aria-hidden />
                  </span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 md:px-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center lg:hidden">
            <SampleAuthLogo />
            <p className="font-medium text-lg">{SAMPLE_BRAND_NAME}</p>
          </div>

          <Card className="gap-4 border-none shadow-none sm:border sm:shadow-xs lg:border-none lg:shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-xl tracking-tight">
                {t('auth.signIn2.title', { defaultValue: sampleSignIn2PageCopy.title })}
              </CardTitle>
              <CardDescription>
                {t('auth.signIn2.description', {
                  defaultValue: sampleSignIn2PageCopy.description,
                })}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form
                  noValidate
                  onSubmit={form.handleSubmit(handleValidSubmit, handleInvalidSubmit)}
                  className="grid gap-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('auth.signIn2.emailLabel', {
                            defaultValue: sampleSignIn2PageCopy.emailLabel,
                          })}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t('auth.signIn2.emailPlaceholder', {
                              defaultValue: sampleSignIn2PageCopy.emailPlaceholder,
                            })}
                            autoComplete="email"
                            className="h-9 rounded-md px-3"
                            {...field}
                            onChange={(event) => {
                              clearSubmissionFeedback();
                              field.onChange(event);
                            }}
                          />
                        </FormControl>
                        <FormMessage {...sampleSignInFieldErrorMessageProps.email} />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="relative">
                        <FormLabel>
                          {t('auth.signIn2.passwordLabel', {
                            defaultValue: sampleSignIn2PageCopy.passwordLabel,
                          })}
                        </FormLabel>
                        <FormControl>
                          <SamplePasswordInput
                            placeholder={t('auth.signIn2.passwordPlaceholder', {
                              defaultValue: sampleSignIn2PageCopy.passwordPlaceholder,
                            })}
                            autoComplete="current-password"
                            {...field}
                            onChange={(event) => {
                              clearSubmissionFeedback();
                              field.onChange(event);
                            }}
                          />
                        </FormControl>
                        <FormMessage {...sampleSignInFieldErrorMessageProps.password} />
                        <Link
                          to={SAMPLE_FORGOT_PASSWORD_PATH}
                          preload={false}
                          className="absolute inset-e-0 -top-0.5 font-medium text-muted-foreground text-sm hover:text-primary"
                        >
                          {t('auth.signIn2.forgotPassword', {
                            defaultValue: sampleSignIn2PageCopy.forgotPassword,
                          })}
                        </Link>
                      </FormItem>
                    )}
                  />

                  {submissionFeedback ? (
                    <SampleSignInDemoFeedbackAlert feedback={submissionFeedback} />
                  ) : null}

                  <Button className="mt-2 w-full" type="submit">
                    <LogIn aria-hidden />
                    {t('auth.signIn2.submit', { defaultValue: sampleSignIn2PageCopy.submit })}
                  </Button>

                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {t('auth.signIn2.continueWith', {
                          defaultValue: sampleSignIn2PageCopy.continueWith,
                        })}
                      </span>
                    </div>
                  </div>

                  <SampleSocialAuthButtons />
                </form>
              </Form>

              <p className="mt-6 text-center text-muted-foreground text-sm">
                {t('auth.signIn2.signUpPrompt', {
                  defaultValue: sampleSignIn2PageCopy.signUpPrompt,
                })}{' '}
                <Link
                  to={SAMPLE_SIGN_UP_PATH}
                  preload={false}
                  className="underline underline-offset-4 hover:text-primary"
                >
                  {t('auth.signIn2.signUpLink', {
                    defaultValue: sampleSignIn2PageCopy.signUpLink,
                  })}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
