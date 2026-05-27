import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Route } from '@/routes/sample/auth/forgot-password';
import {
  SampleForgotPasswordPage,
  sampleForgotPasswordFieldErrorMessageProps,
  sampleForgotPasswordPageLayout,
} from '@/sample/auth/components/sample-forgot-password-page';
import { SAMPLE_FORGOT_PASSWORD_PATH } from '@/sample/layout/navigation';
import {
  createSampleForgotPasswordDemoSubmitHandler,
  sampleForgotPasswordPageCopy,
  toSampleForgotPasswordReferenceSubmissionMessage,
} from './sample-auth-copy';
import {
  sampleForgotPasswordFieldNames,
  sampleForgotPasswordSchema,
} from './schema/forgot-password-schema';

const validForgotPasswordValues = {
  email: ' Reset@Example.COM ',
};

const parsedValidValues = sampleForgotPasswordSchema.safeParse(validForgotPasswordValues);

if (!parsedValidValues.success) {
  throw new Error('Forgot-password schema must accept a valid email address.');
}

if (parsedValidValues.data.email !== 'Reset@Example.COM') {
  throw new Error('Forgot-password schema must trim email input before submit handling.');
}

const configuredErrorMessageFields = Object.keys(sampleForgotPasswordFieldErrorMessageProps).sort();
const expectedErrorMessageFields = [...sampleForgotPasswordFieldNames].sort();

if (configuredErrorMessageFields.join(',') !== expectedErrorMessageFields.join(',')) {
  throw new Error(
    'Forgot-password UI must expose user-visible validation message slots for every field.'
  );
}

for (const fieldName of sampleForgotPasswordFieldNames) {
  const errorMessageProps = sampleForgotPasswordFieldErrorMessageProps[fieldName];

  if (errorMessageProps['data-field-error'] !== fieldName) {
    throw new Error(`Forgot-password ${fieldName} validation message must be tied to its field.`);
  }

  if (errorMessageProps['aria-live'] !== 'polite') {
    throw new Error(`Forgot-password ${fieldName} validation message must be announced politely.`);
  }
}

assertRejectedEmail('', sampleForgotPasswordPageCopy.validation.emailRequired);
assertRejectedEmail('not-an-email', sampleForgotPasswordPageCopy.validation.emailInvalid);

const submissionMessage = toSampleForgotPasswordReferenceSubmissionMessage(parsedValidValues.data);

if (
  submissionMessage !==
  'Sample forgot-password reference validated for Reset@Example.COM. No password reset request was sent.'
) {
  throw new Error(
    'Forgot-password submission must stay a client-only reference with no reset request.'
  );
}

const demoSubmitNotifications: string[] = [];
const demoSubmitHandler = createSampleForgotPasswordDemoSubmitHandler((result) => {
  demoSubmitNotifications.push(result.message);
});
const demoSubmitResult = demoSubmitHandler(parsedValidValues.data);

if (demoSubmitResult.kind !== 'demo-only') {
  throw new Error('Forgot-password submit handler must explicitly report demo-only execution.');
}

if (demoSubmitResult.message !== submissionMessage) {
  throw new Error('Forgot-password submit handler must return the demo-only validation message.');
}

if (demoSubmitNotifications.join('\n') !== submissionMessage) {
  throw new Error('Forgot-password submit handler must notify only the demo validation message.');
}

const sampleAuthDirectory = dirname(new URL(import.meta.url).pathname);
const forgotPasswordReferenceSourceFiles = [
  resolve(sampleAuthDirectory, 'sample-auth-copy.ts'),
  resolve(sampleAuthDirectory, 'components/sample-forgot-password-page.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/forgot-password.tsx'),
] as const;

const forbiddenSourcePatterns = [
  {
    pattern: /(^|\n)\s*['\"]use server['\"]\s*;?/m,
    reason: 'Server action directives are forbidden in sample forgot-password references.',
  },
  {
    pattern: /\bfetch\s*\(/,
    reason: 'Network fetch calls are forbidden in sample forgot-password references.',
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    reason: 'XMLHttpRequest usage is forbidden in sample forgot-password references.',
  },
  {
    pattern: /\bnavigator\.sendBeacon\s*\(/,
    reason: 'Beacon requests are forbidden in sample forgot-password references.',
  },
  {
    pattern: /\bWebSocket\b/,
    reason: 'WebSocket usage is forbidden in sample forgot-password references.',
  },
  {
    pattern: /\bEventSource\b/,
    reason: 'EventSource usage is forbidden in sample forgot-password references.',
  },
  {
    pattern: /\buseMutation\b/,
    reason: 'Mutation hooks are forbidden in sample forgot-password references.',
  },
  {
    pattern: /\bmutation\b/,
    reason: 'Mutation helpers are forbidden in sample forgot-password references.',
  },
  {
    pattern: /\bmutate(?:Async)?\b/,
    reason: 'Mutation triggers are forbidden in sample forgot-password references.',
  },
  {
    pattern: /\baxios\b/,
    reason: 'Axios usage is forbidden in sample forgot-password references.',
  },
  {
    pattern: /\bky\b/,
    reason: 'ky usage is forbidden in sample forgot-password references.',
  },
  {
    pattern: /<form\b[^>]*\baction\s*=/,
    reason: 'Form action attributes are forbidden in sample forgot-password references.',
  },
  {
    pattern: /<form\b[^>]*\bmethod\s*=\s*{?\s*['\"]post['\"]\s*}?/i,
    reason: 'POST form submissions are forbidden in sample forgot-password references.',
  },
] as const;

for (const filePath of forgotPasswordReferenceSourceFiles) {
  const source = readFileSync(filePath, 'utf8');

  for (const { pattern, reason } of forbiddenSourcePatterns) {
    if (pattern.test(source)) {
      throw new Error(`${reason} Found in ${filePath}.`);
    }
  }
}

if (Route.fullPath !== SAMPLE_FORGOT_PASSWORD_PATH) {
  throw new Error('Forgot-password route must use the shadcn-style kebab auth URL.');
}

if (Route.options.component !== SampleForgotPasswordPage) {
  throw new Error('Forgot-password route must render the sample forgot-password reference page.');
}

if (
  sampleForgotPasswordPageLayout.rootClassName !==
  'container grid h-svh max-w-none items-center justify-center'
) {
  throw new Error('Forgot-password page must use the centered auth-page root layout styling.');
}

if (sampleForgotPasswordPageLayout.cardClassName !== 'max-w-sm gap-4') {
  throw new Error('Forgot-password page must use the compact auth card styling.');
}

if (sampleForgotPasswordPageLayout.formClassName !== 'grid gap-3') {
  throw new Error('Forgot-password form must use the existing auth form spacing.');
}

if (sampleForgotPasswordPageLayout.emailInput.type !== 'email') {
  throw new Error('Forgot-password form must expose an email input.');
}

if (sampleForgotPasswordPageLayout.emailInput.autoComplete !== 'email') {
  throw new Error('Forgot-password email input must use email autocomplete.');
}

if (sampleForgotPasswordPageLayout.emailInput.className !== 'h-9 rounded-md px-3') {
  throw new Error('Forgot-password email input must use existing auth input styling.');
}

if (sampleForgotPasswordPageLayout.submitButtonClassName !== 'mt-2') {
  throw new Error('Forgot-password submit button must use existing auth submit spacing.');
}

function assertRejectedEmail(email: string, message: string) {
  const parsedValues = sampleForgotPasswordSchema.safeParse({ email });

  if (parsedValues.success) {
    throw new Error('Forgot-password schema must reject invalid email values client-side.');
  }

  const hasExpectedIssue = parsedValues.error.issues.some(
    (issue) => issue.path.join('.') === 'email' && issue.message === message
  );

  if (!hasExpectedIssue) {
    throw new Error('Forgot-password schema must return the expected email validation message.');
  }
}
