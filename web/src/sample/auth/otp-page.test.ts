import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Route } from '@/routes/sample/auth/otp';
import {
  SampleOtpPage,
  getSampleOtpInvalidSubmissionFeedback,
  isSampleOtpCodeIncomplete,
  sampleOtpFieldErrorMessageProps,
  sampleOtpIncompleteFeedback,
  sampleOtpInvalidFeedback,
  sampleOtpPageLayout,
  sampleOtpSubmissionFeedbackProps,
  sampleOtpSuccessFeedback,
} from '@/sample/auth/components/sample-otp-page';
import { SAMPLE_OTP_PATH } from '@/sample/layout/navigation';
import {
  createSampleOtpDemoSubmitHandler,
  sampleOtpDemoSubmissionSafeguards,
  sampleOtpPageCopy,
  toSampleOtpReferenceSubmissionMessage,
} from './sample-auth-copy';
import {
  SAMPLE_OTP_CODE_LENGTH,
  sampleOtpFieldNames,
  sampleOtpSchema,
  sampleOtpValidationMessages,
} from './schema/otp-schema';

const validOtpValues = {
  code: '123456',
};

const parsedValidValues = sampleOtpSchema.safeParse(validOtpValues);

if (!parsedValidValues.success) {
  throw new Error('OTP schema must accept a valid six-digit one-time password.');
}

assertRejectedCode('', sampleOtpValidationMessages.codeRequired);
assertRejectedCode('12345', sampleOtpValidationMessages.codeLength);
assertRejectedCode('12 456', sampleOtpValidationMessages.codeLength);
assertRejectedCode('1234567', sampleOtpValidationMessages.codeLength);
assertRejectedCode('12345a', sampleOtpValidationMessages.codeNumeric);

if (!isSampleOtpCodeIncomplete('') || !isSampleOtpCodeIncomplete('12345')) {
  throw new Error('OTP feedback must classify empty and short submissions as incomplete.');
}

if (!isSampleOtpCodeIncomplete('12 456')) {
  throw new Error('OTP feedback must classify missing visible OTP slots as incomplete.');
}

if (isSampleOtpCodeIncomplete('12345a')) {
  throw new Error('OTP feedback must classify fully-entered non-numeric submissions as invalid.');
}

if (getSampleOtpInvalidSubmissionFeedback('12345') !== sampleOtpIncompleteFeedback) {
  throw new Error('OTP invalid submit feedback must use the incomplete state for short codes.');
}

if (getSampleOtpInvalidSubmissionFeedback('12345a') !== sampleOtpInvalidFeedback) {
  throw new Error('OTP invalid submit feedback must use the invalid state for non-numeric codes.');
}

if (sampleOtpSubmissionFeedbackProps['aria-live'] !== 'polite') {
  throw new Error('OTP local submission feedback must be announced politely.');
}

if (sampleOtpSubmissionFeedbackProps['data-otp-feedback'] !== 'submission') {
  throw new Error('OTP local submission feedback must expose a stable test hook.');
}

if (sampleOtpSuccessFeedback.kind !== 'success') {
  throw new Error('OTP valid submit feedback must expose a local success state.');
}

const configuredErrorMessageFields = Object.keys(sampleOtpFieldErrorMessageProps).sort();
const expectedErrorMessageFields = [...sampleOtpFieldNames].sort();

if (configuredErrorMessageFields.join(',') !== expectedErrorMessageFields.join(',')) {
  throw new Error('OTP UI must expose user-visible validation message slots for every field.');
}

for (const fieldName of sampleOtpFieldNames) {
  const errorMessageProps = sampleOtpFieldErrorMessageProps[fieldName];

  if (errorMessageProps['data-field-error'] !== fieldName) {
    throw new Error(`OTP ${fieldName} validation message must be tied to its field.`);
  }

  if (errorMessageProps['aria-live'] !== 'polite') {
    throw new Error(`OTP ${fieldName} validation message must be announced politely.`);
  }
}

const submissionMessage = toSampleOtpReferenceSubmissionMessage(parsedValidValues.data);

if (
  submissionMessage !==
  'Sample OTP reference validated for code ending in 56. No authentication request was sent.'
) {
  throw new Error('OTP submission must stay a client-only reference with no auth request.');
}

const demoSubmitNotifications: string[] = [];
const demoSubmitHandler = createSampleOtpDemoSubmitHandler((result) => {
  demoSubmitNotifications.push(result.message);
});
const demoSubmitResult = demoSubmitHandler(parsedValidValues.data);

if (demoSubmitResult.kind !== 'demo-only') {
  throw new Error('OTP submit handler must explicitly report demo-only execution.');
}

if (demoSubmitResult.message !== submissionMessage) {
  throw new Error('OTP submit handler must return the demo-only validation message.');
}

if (demoSubmitResult.safeguards !== sampleOtpDemoSubmissionSafeguards) {
  throw new Error(
    'OTP submit handler must attach the explicit no-auth, no-session, no-API safeguard contract.'
  );
}

if (sampleOtpDemoSubmissionSafeguards.createsSession) {
  throw new Error('OTP demo submission must not create or update a real session.');
}

if (sampleOtpDemoSubmissionSafeguards.callsBackendRoute) {
  throw new Error('OTP demo submission must not call backend or authentication endpoints.');
}

if (sampleOtpDemoSubmissionSafeguards.triggersRealAuthenticationFlow) {
  throw new Error('OTP demo submission must not trigger real authentication.');
}

if (sampleOtpDemoSubmissionSafeguards.validationScope !== 'client-side-react-hook-form-zod-only') {
  throw new Error(
    'OTP demo submission must stay within client-side react-hook-form/zod validation.'
  );
}

if (demoSubmitNotifications.join('\n') !== submissionMessage) {
  throw new Error('OTP submit handler must notify only the demo validation message.');
}

const sampleAuthDirectory = dirname(fileURLToPath(import.meta.url));
const otpReferenceSourceFiles = [
  resolve(sampleAuthDirectory, 'sample-auth-copy.ts'),
  resolve(sampleAuthDirectory, 'components/sample-otp-page.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/otp.tsx'),
] as const;

const forbiddenSourcePatterns = [
  {
    pattern: /(^|\n)\s*['\"]use server['\"]\s*;?/m,
    reason: 'Server action directives are forbidden in sample OTP references.',
  },
  {
    pattern: /\bfetch\s*\(/,
    reason: 'Network fetch calls are forbidden in sample OTP references.',
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    reason: 'XMLHttpRequest usage is forbidden in sample OTP references.',
  },
  {
    pattern: /\bnavigator\.sendBeacon\s*\(/,
    reason: 'Beacon requests are forbidden in sample OTP references.',
  },
  {
    pattern: /\bWebSocket\b/,
    reason: 'WebSocket usage is forbidden in sample OTP references.',
  },
  {
    pattern: /\bEventSource\b/,
    reason: 'EventSource usage is forbidden in sample OTP references.',
  },
  {
    pattern: /\buseMutation\b/,
    reason: 'Mutation hooks are forbidden in sample OTP references.',
  },
  {
    pattern: /\bmutation\b/,
    reason: 'Mutation helpers are forbidden in sample OTP references.',
  },
  {
    pattern: /\bmutate(?:Async)?\b/,
    reason: 'Mutation triggers are forbidden in sample OTP references.',
  },
  {
    pattern: /\baxios\b/,
    reason: 'Axios usage is forbidden in sample OTP references.',
  },
  {
    pattern: /\bky\b/,
    reason: 'ky usage is forbidden in sample OTP references.',
  },
  {
    pattern: /<form\b[^>]*\baction\s*=/,
    reason: 'Form action attributes are forbidden in sample OTP references.',
  },
  {
    pattern: /<form\b[^>]*\bmethod\s*=\s*{?\s*['\"]post['\"]\s*}?/i,
    reason: 'POST form submissions are forbidden in sample OTP references.',
  },
] as const;

for (const filePath of otpReferenceSourceFiles) {
  const source = readFileSync(filePath, 'utf8');

  for (const { pattern, reason } of forbiddenSourcePatterns) {
    if (pattern.test(source)) {
      throw new Error(`${reason} Found in ${filePath}.`);
    }
  }
}

if (Route.fullPath !== SAMPLE_OTP_PATH) {
  throw new Error('OTP route must use the shadcn-style kebab auth URL.');
}

if (Route.options.component !== SampleOtpPage) {
  throw new Error('OTP route must render the sample OTP reference page.');
}

if (
  sampleOtpPageLayout.rootClassName !==
  'container grid h-svh max-w-none items-center justify-center'
) {
  throw new Error('OTP page must use the centered auth-page root layout styling.');
}

if (
  sampleOtpPageLayout.contentClassName !==
  'mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8'
) {
  throw new Error('OTP page must use the existing auth content wrapper styling.');
}

if (sampleOtpPageLayout.brandClassName !== 'mb-4 flex items-center justify-center') {
  throw new Error('OTP page must include the existing auth brand header styling.');
}

if (sampleOtpPageLayout.cardClassName !== 'max-w-sm gap-4') {
  throw new Error('OTP page must use the compact auth card styling.');
}

if (sampleOtpPageLayout.formClassName !== 'grid gap-3') {
  throw new Error('OTP form must use the existing auth form spacing.');
}

if (sampleOtpPageLayout.codeInputGroupClassName !== 'grid grid-cols-6 gap-2') {
  throw new Error('OTP form must expose a six-slot shadcn-style code input group.');
}

if (sampleOtpPageLayout.codeInput.inputMode !== 'numeric') {
  throw new Error('OTP code slots must use numeric input mode.');
}

if (sampleOtpPageLayout.codeInput.pattern !== '[0-9]*') {
  throw new Error('OTP code slots must hint digit-only input.');
}

if (sampleOtpPageLayout.codeInput.autoComplete !== 'one-time-code') {
  throw new Error('OTP code slots must support one-time-code autocomplete.');
}

if (sampleOtpPageLayout.codeInput.maxLength !== 1) {
  throw new Error('OTP code slots must accept one visible digit per slot.');
}

if (!sampleOtpPageLayout.codeInput.className.includes('text-center')) {
  throw new Error('OTP code slots must use centered digit styling.');
}

if (sampleOtpPageLayout.submitButtonClassName !== 'mt-2') {
  throw new Error('OTP submit button must use existing auth submit spacing.');
}

if (sampleOtpPageCopy.codePlaceholder !== '0') {
  throw new Error('OTP code slot placeholder must be one digit per visible slot.');
}

function assertRejectedCode(code: string, message: string) {
  const parsedValues = sampleOtpSchema.safeParse({ code });

  if (parsedValues.success) {
    throw new Error('OTP schema must reject invalid code values client-side.');
  }

  const hasExpectedIssue = parsedValues.error.issues.some(
    (issue) => issue.path.join('.') === 'code' && issue.message === message
  );

  if (!hasExpectedIssue) {
    throw new Error('OTP schema must return the expected code validation message.');
  }
}

if (SAMPLE_OTP_CODE_LENGTH !== 6) {
  throw new Error('OTP reference must render and validate a six-digit code.');
}
