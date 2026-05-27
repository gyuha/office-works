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
import { SAMPLE_FORGOT_PASSWORD_PATH, SAMPLE_SIGN_UP_PATH } from '@/sample/layout/navigation';
import { SAMPLE_BRAND_NAME } from '@/sample/lib/branding';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { createSampleSignInDemoSubmitHandler, sampleSignInPageCopy } from '../sample-auth-copy';
import type { SampleSignInFormValues } from '../schema/sign-in-schema';
import { sampleSignInFieldNames, sampleSignInSchema } from '../schema/sign-in-schema';
import { SampleAuthLogo } from './sample-auth-logo';
import { focusFirstInvalidSampleField } from './sample-form-validation';
import { SamplePasswordInput } from './sample-password-input';
import { SampleSignInDemoFeedbackAlert } from './sample-sign-in-feedback';
import type { SampleSignInSubmissionFeedback } from './sample-sign-in-feedback-contract';
import { sampleSignInFieldErrorMessageProps } from './sample-sign-in-feedback-contract';
import { SampleSocialAuthButtons } from './sample-social-auth-buttons';

export const sampleSignInSuccessFeedback = {
  kind: 'success',
  title: sampleSignInPageCopy.feedback.successTitle,
  description: sampleSignInPageCopy.referenceValidatedMessage,
} as const satisfies SampleSignInSubmissionFeedback;

export function SampleSignInPage() {
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

  const handleValidSubmit = createSampleSignInDemoSubmitHandler((result) => {
    const message = t('auth.signIn.referenceValidatedMessage', {
      defaultValue: result.message,
      email: result.values.email,
    });

    setSubmissionFeedback({
      kind: sampleSignInSuccessFeedback.kind,
      title: t('auth.signIn.feedback.successTitle', {
        defaultValue: sampleSignInSuccessFeedback.title,
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
    <main className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
        <div className="mb-4 flex items-center justify-center">
          <SampleAuthLogo className="me-2" />
          <h1 className="font-medium text-xl">{SAMPLE_BRAND_NAME}</h1>
        </div>

        <Card className="max-w-sm gap-4">
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">
              {t('auth.signIn.title', { defaultValue: sampleSignInPageCopy.title })}
            </CardTitle>
            <CardDescription>
              {t('auth.signIn.description', {
                defaultValue: sampleSignInPageCopy.description,
              })}{' '}
              {t('auth.signIn.signUpPrompt', {
                defaultValue: sampleSignInPageCopy.signUpPrompt,
              })}{' '}
              <Link
                to={SAMPLE_SIGN_UP_PATH}
                preload={false}
                className="text-nowrap underline underline-offset-4 hover:text-primary"
              >
                {t('auth.signIn.signUpLink', { defaultValue: sampleSignInPageCopy.signUpLink })}
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('auth.signIn.emailLabel', {
                          defaultValue: sampleSignInPageCopy.emailLabel,
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('auth.signIn.emailPlaceholder', {
                            defaultValue: sampleSignInPageCopy.emailPlaceholder,
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
                        {t('auth.signIn.passwordLabel', {
                          defaultValue: sampleSignInPageCopy.passwordLabel,
                        })}
                      </FormLabel>
                      <FormControl>
                        <SamplePasswordInput
                          placeholder={t('auth.signIn.passwordPlaceholder', {
                            defaultValue: sampleSignInPageCopy.passwordPlaceholder,
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
                        className="absolute inset-e-0 -top-0.5 font-medium text-muted-foreground text-sm hover:opacity-75"
                      >
                        {t('auth.signIn.forgotPassword', {
                          defaultValue: sampleSignInPageCopy.forgotPassword,
                        })}
                      </Link>
                    </FormItem>
                  )}
                />

                {submissionFeedback ? (
                  <SampleSignInDemoFeedbackAlert feedback={submissionFeedback} />
                ) : null}

                <Button className="mt-2" type="submit">
                  <LogIn aria-hidden />
                  {t('auth.signIn.submit', { defaultValue: sampleSignInPageCopy.submit })}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('auth.signIn.continueWith', {
                        defaultValue: sampleSignInPageCopy.continueWith,
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
              {t('auth.signIn.termsPrefix', {
                defaultValue: sampleSignInPageCopy.termsPrefix,
              })}{' '}
              <Link
                to="/sample/help-center"
                preload={false}
                className="underline underline-offset-4 hover:text-primary"
              >
                {t('auth.signIn.termsOfService', {
                  defaultValue: sampleSignInPageCopy.termsOfService,
                })}
              </Link>{' '}
              {t('auth.signIn.termsConjunction', {
                defaultValue: sampleSignInPageCopy.termsConjunction,
              })}{' '}
              <Link
                to="/sample/help-center"
                preload={false}
                className="underline underline-offset-4 hover:text-primary"
              >
                {t('auth.signIn.privacyPolicy', {
                  defaultValue: sampleSignInPageCopy.privacyPolicy,
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
