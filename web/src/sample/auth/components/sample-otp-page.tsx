import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { CircleAlert, ShieldCheck } from 'lucide-react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { createSampleOtpDemoSubmitHandler, sampleOtpPageCopy } from '../sample-auth-copy';
import type { SampleOtpFormValues, sampleOtpFieldNames } from '../schema/otp-schema';
import { SAMPLE_OTP_CODE_LENGTH, sampleOtpSchema } from '../schema/otp-schema';
import { SampleAuthLogo } from './sample-auth-logo';

interface SampleOtpFieldErrorMessageProps {
  'aria-live': 'polite';
  'data-field-error': (typeof sampleOtpFieldNames)[number];
}

export const sampleOtpFieldErrorMessageProps = {
  code: {
    'aria-live': 'polite',
    'data-field-error': 'code',
  },
} as const satisfies Record<(typeof sampleOtpFieldNames)[number], SampleOtpFieldErrorMessageProps>;

type SampleOtpSubmissionFeedbackKind = 'incomplete' | 'invalid' | 'success';

interface SampleOtpSubmissionFeedback {
  kind: SampleOtpSubmissionFeedbackKind;
  title: string;
  description: string;
}

export const sampleOtpSubmissionFeedbackProps = {
  'aria-live': 'polite',
  'data-otp-feedback': 'submission',
} as const;

export const sampleOtpSubmissionFeedbackCopy = sampleOtpPageCopy.feedback;

export const sampleOtpIncompleteFeedback = {
  kind: 'incomplete',
  title: sampleOtpSubmissionFeedbackCopy.incompleteTitle,
  description: sampleOtpSubmissionFeedbackCopy.incompleteDescription,
} as const satisfies SampleOtpSubmissionFeedback;

export const sampleOtpInvalidFeedback = {
  kind: 'invalid',
  title: sampleOtpSubmissionFeedbackCopy.invalidTitle,
  description: sampleOtpSubmissionFeedbackCopy.invalidDescription,
} as const satisfies SampleOtpSubmissionFeedback;

export const sampleOtpSuccessFeedback = {
  kind: 'success',
  title: sampleOtpSubmissionFeedbackCopy.successTitle,
  description: sampleOtpPageCopy.referenceValidatedMessage,
} as const satisfies SampleOtpSubmissionFeedback;

export const sampleOtpPageLayout = {
  rootClassName: 'container grid h-svh max-w-none items-center justify-center',
  contentClassName: 'mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8',
  brandClassName: 'mb-4 flex items-center justify-center',
  cardClassName: 'max-w-sm gap-4',
  formClassName: 'grid gap-3',
  codeInputGroupClassName: 'grid grid-cols-6 gap-2',
  codeInput: {
    inputMode: 'numeric',
    pattern: '[0-9]*',
    autoComplete: 'one-time-code',
    maxLength: 1,
    className:
      'h-12 rounded-md px-0 text-center font-medium text-lg tabular-nums sm:h-11 sm:text-base',
  },
  submitButtonClassName: 'mt-2',
} as const;

const sampleOtpCodeSlots = Array.from({ length: SAMPLE_OTP_CODE_LENGTH }, (_, index) => ({
  index,
  key: `sample-otp-code-slot-${index + 1}`,
}));

export function SampleOtpPage() {
  const { t } = useTranslation('sample');
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [submissionFeedback, setSubmissionFeedback] = useState<SampleOtpSubmissionFeedback | null>(
    null
  );
  const form = useForm<SampleOtpFormValues>({
    resolver: zodResolver(sampleOtpSchema),
    defaultValues: {
      code: '',
    },
  });

  const handleValidSubmit = createSampleOtpDemoSubmitHandler((result) => {
    const message = t('auth.otp.referenceValidatedMessage', {
      codeSuffix: result.values.code.slice(-2),
      defaultValue: result.message,
    });

    setSubmissionFeedback({
      kind: sampleOtpSuccessFeedback.kind,
      title: t('auth.otp.feedback.successTitle', {
        defaultValue: sampleOtpSuccessFeedback.title,
      }),
      description: message,
    });
    toast.success(message);
  });

  function focusCodeInput(index: number) {
    codeInputRefs.current[index]?.focus();
  }

  function handleCodeSlotChange(
    index: number,
    event: ChangeEvent<HTMLInputElement>,
    currentCode: string,
    onChange: (value: string) => void
  ) {
    const codeCharacters = toOtpCodeCharacters(event.currentTarget.value);
    const nextCode = replaceCodeCharacters(currentCode, index, codeCharacters);

    setSubmissionFeedback(null);
    onChange(nextCode);

    if (codeCharacters) {
      focusCodeInput(Math.min(index + codeCharacters.length, SAMPLE_OTP_CODE_LENGTH - 1));
    }
  }

  function handleCodeSlotKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !event.currentTarget.value && index > 0) {
      focusCodeInput(index - 1);
    }
  }

  function handleCodeSlotPaste(
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
    currentCode: string,
    onChange: (value: string) => void
  ) {
    const codeCharacters = toOtpCodeCharacters(event.clipboardData.getData('text'));

    if (!codeCharacters) {
      return;
    }

    event.preventDefault();
    const nextCode = replaceCodeCharacters(currentCode, index, codeCharacters);

    setSubmissionFeedback(null);
    onChange(nextCode);
    focusCodeInput(Math.min(index + codeCharacters.length, SAMPLE_OTP_CODE_LENGTH - 1));
  }

  function handleInvalidSubmit(errors: FieldErrors<SampleOtpFormValues>) {
    const feedback = getSampleOtpInvalidSubmissionFeedback(form.getValues('code'));

    setSubmissionFeedback({
      kind: feedback.kind,
      title: t(`auth.otp.feedback.${feedback.kind}Title`, {
        defaultValue: feedback.title,
      }),
      description: t(`auth.otp.feedback.${feedback.kind}Description`, {
        defaultValue: feedback.description,
      }),
    });

    if (errors.code) {
      form.setFocus('code');
    }
  }

  return (
    <main className={sampleOtpPageLayout.rootClassName}>
      <div className={sampleOtpPageLayout.contentClassName}>
        <div className={sampleOtpPageLayout.brandClassName}>
          <SampleAuthLogo className="me-2" />
          <h1 className="font-medium text-xl">{SAMPLE_BRAND_NAME}</h1>
        </div>

        <Card className={sampleOtpPageLayout.cardClassName}>
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">
              {t('auth.otp.title', { defaultValue: sampleOtpPageCopy.title })}
            </CardTitle>
            <CardDescription>
              {t('auth.otp.description', { defaultValue: sampleOtpPageCopy.description })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                noValidate
                className={sampleOtpPageLayout.formClassName}
                onSubmit={form.handleSubmit(handleValidSubmit, handleInvalidSubmit)}
              >
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => {
                    const currentCode = field.value ?? '';

                    return (
                      <FormItem>
                        <FormLabel>
                          {t('auth.otp.codeLabel', { defaultValue: sampleOtpPageCopy.codeLabel })}
                        </FormLabel>
                        <FormControl>
                          <div className={sampleOtpPageLayout.codeInputGroupClassName}>
                            {sampleOtpCodeSlots.map(({ index, key }) => (
                              <Input
                                key={key}
                                ref={(input) => {
                                  codeInputRefs.current[index] = input;

                                  if (index === 0) {
                                    field.ref(input);
                                  }
                                }}
                                inputMode={sampleOtpPageLayout.codeInput.inputMode}
                                pattern={sampleOtpPageLayout.codeInput.pattern}
                                aria-label={t('auth.otp.codeDigitLabel', {
                                  defaultValue: sampleOtpPageCopy.codeDigitLabel,
                                  position: index + 1,
                                })}
                                placeholder={t('auth.otp.codePlaceholder', {
                                  defaultValue: sampleOtpPageCopy.codePlaceholder,
                                })}
                                autoComplete={
                                  index === 0 ? sampleOtpPageLayout.codeInput.autoComplete : 'off'
                                }
                                maxLength={sampleOtpPageLayout.codeInput.maxLength}
                                className={sampleOtpPageLayout.codeInput.className}
                                value={currentCode[index] === ' ' ? '' : (currentCode[index] ?? '')}
                                disabled={form.formState.isSubmitting}
                                onBlur={field.onBlur}
                                onChange={(event) =>
                                  handleCodeSlotChange(index, event, currentCode, field.onChange)
                                }
                                onKeyDown={(event) => handleCodeSlotKeyDown(index, event)}
                                onPaste={(event) =>
                                  handleCodeSlotPaste(index, event, currentCode, field.onChange)
                                }
                              />
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage {...sampleOtpFieldErrorMessageProps.code} />
                      </FormItem>
                    );
                  }}
                />

                {submissionFeedback ? (
                  <Alert
                    {...sampleOtpSubmissionFeedbackProps}
                    data-otp-feedback={submissionFeedback.kind}
                    role={submissionFeedback.kind === 'success' ? 'status' : 'alert'}
                    variant={submissionFeedback.kind === 'success' ? 'default' : 'destructive'}
                    className={
                      submissionFeedback.kind === 'success'
                        ? 'border-emerald-500/50 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300'
                        : undefined
                    }
                  >
                    {submissionFeedback.kind === 'success' ? (
                      <ShieldCheck aria-hidden />
                    ) : (
                      <CircleAlert aria-hidden />
                    )}
                    <AlertTitle>{submissionFeedback.title}</AlertTitle>
                    <AlertDescription>{submissionFeedback.description}</AlertDescription>
                  </Alert>
                ) : null}

                <Button
                  className={sampleOtpPageLayout.submitButtonClassName}
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  <ShieldCheck aria-hidden />
                  {form.formState.isSubmitting
                    ? t('auth.otp.verifyingSubmit', {
                        defaultValue: sampleOtpPageCopy.verifyingSubmit,
                      })
                    : t('auth.otp.submit', { defaultValue: sampleOtpPageCopy.submit })}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <Link
              to={SAMPLE_SIGN_IN_PATH}
              className="w-full text-center text-muted-foreground text-sm underline underline-offset-4 hover:text-primary"
            >
              {t('auth.otp.signInLink', { defaultValue: sampleOtpPageCopy.signInLink })}
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

function toOtpCodeCharacters(value: string) {
  return value.slice(0, SAMPLE_OTP_CODE_LENGTH);
}

function replaceCodeCharacters(currentCode: string, index: number, codeCharacters: string) {
  const codeSlots = currentCode
    .padEnd(SAMPLE_OTP_CODE_LENGTH, ' ')
    .slice(0, SAMPLE_OTP_CODE_LENGTH)
    .split('');

  if (!codeCharacters) {
    codeSlots[index] = ' ';
    return codeSlots.join('').trimEnd();
  }

  for (const [offset, codeCharacter] of Array.from(codeCharacters).entries()) {
    const slotIndex = index + offset;

    if (slotIndex >= SAMPLE_OTP_CODE_LENGTH) {
      break;
    }

    codeSlots[slotIndex] = codeCharacter;
  }

  return codeSlots.join('').trimEnd();
}

export function isSampleOtpCodeIncomplete(code: string) {
  const trimmedCode = code.trim();

  if (!trimmedCode) {
    return true;
  }

  return trimmedCode.length !== SAMPLE_OTP_CODE_LENGTH || /\s/.test(trimmedCode);
}

export function getSampleOtpInvalidSubmissionFeedback(code: string) {
  return isSampleOtpCodeIncomplete(code) ? sampleOtpIncompleteFeedback : sampleOtpInvalidFeedback;
}
