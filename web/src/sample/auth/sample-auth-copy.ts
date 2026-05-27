import type { SampleForgotPasswordFormValues } from './schema/forgot-password-schema';
import { sampleForgotPasswordValidationMessages } from './schema/forgot-password-schema';
import type { SampleSignInFormValues } from './schema/sign-in-schema';

type SampleOtpFormValues = import('./schema/otp-schema').SampleOtpFormValues;
type SampleSignUpFormValues = import('./schema/sign-up-schema').SampleSignUpFormValues;

export interface SampleAuthDemoSubmissionSafeguards {
  validationScope: 'client-side-react-hook-form-zod-only';
  createsSession: false;
  callsBackendRoute: false;
  mutatesPersistedData: false;
  triggersRealAuthenticationFlow: false;
}

export const sampleAuthDemoSubmissionSafeguards = {
  validationScope: 'client-side-react-hook-form-zod-only',
  createsSession: false,
  callsBackendRoute: false,
  mutatesPersistedData: false,
  triggersRealAuthenticationFlow: false,
} as const satisfies SampleAuthDemoSubmissionSafeguards;

export const sampleOtpDemoSubmissionSafeguards = sampleAuthDemoSubmissionSafeguards;

export const sampleSignInPageCopy = {
  title: 'Sign in',
  description: 'Enter your email and password below to log into your account.',
  emailLabel: 'Email',
  emailPlaceholder: 'name@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: '********',
  forgotPassword: 'Forgot password?',
  submit: 'Sign in',
  continueWith: 'Or continue with',
  signUpPrompt: "Don't have an account?",
  signUpLink: 'Sign Up',
  termsPrefix: 'By clicking sign in, you agree to our',
  termsOfService: 'Terms of Service',
  privacyPolicy: 'Privacy Policy',
  termsConjunction: 'and',
  referenceValidatedMessage:
    'Local demo sign-in feedback for {{email}} only. No real authentication occurred, no session was created, and no authentication request was sent.',
  feedback: {
    successTitle: 'Demo only: no real authentication occurred',
  },
} as const;

export const sampleSignUpPageCopy = {
  title: 'Create an account',
  description: 'Enter your name, email, and password to create an account.',
  nameLabel: 'Name',
  namePlaceholder: 'Ada Lovelace',
  emailLabel: sampleSignInPageCopy.emailLabel,
  emailPlaceholder: sampleSignInPageCopy.emailPlaceholder,
  passwordLabel: sampleSignInPageCopy.passwordLabel,
  passwordPlaceholder: sampleSignInPageCopy.passwordPlaceholder,
  confirmPasswordLabel: 'Confirm Password',
  confirmPasswordPlaceholder: sampleSignInPageCopy.passwordPlaceholder,
  submit: 'Create account',
  continueWith: sampleSignInPageCopy.continueWith,
  signInPrompt: 'Already have an account?',
  signInLink: 'Sign in',
  termsPrefix: 'By creating an account, you agree to our',
  termsOfService: sampleSignInPageCopy.termsOfService,
  privacyPolicy: sampleSignInPageCopy.privacyPolicy,
  termsConjunction: sampleSignInPageCopy.termsConjunction,
  referenceValidatedMessage:
    'Sample sign-up reference validated for {{email}}. No authentication request was sent.',
} as const;

export const sampleSignIn2PageCopy = {
  brandEyebrow: 'Sample Admin Studio',
  brandBadge: 'UI reference',
  brandStatement: 'Build focused admin authentication references without backend coupling.',
  brandDescription:
    'This two-column sample mirrors the shadcn-admin auth pattern while keeping validation entirely client-side for reusable UI review.',
  brandHighlights: [
    'Client-side validation only',
    'No sessions or guards',
    'Ready for layout review',
  ],
  title: 'Sign in to your account',
  description: 'Enter your email and password below to validate the sample form.',
  emailLabel: sampleSignInPageCopy.emailLabel,
  emailPlaceholder: sampleSignInPageCopy.emailPlaceholder,
  passwordLabel: sampleSignInPageCopy.passwordLabel,
  passwordPlaceholder: sampleSignInPageCopy.passwordPlaceholder,
  forgotPassword: sampleSignInPageCopy.forgotPassword,
  submit: sampleSignInPageCopy.submit,
  continueWith: sampleSignInPageCopy.continueWith,
  signUpPrompt: sampleSignInPageCopy.signUpPrompt,
  signUpLink: sampleSignInPageCopy.signUpLink,
  referenceValidatedMessage:
    'Local demo two-column sign-in feedback for {{email}} only. No real authentication occurred, no session was created, and no authentication request was sent.',
  feedback: {
    successTitle: sampleSignInPageCopy.feedback.successTitle,
  },
} as const;

export const sampleForgotPasswordPageCopy = {
  title: 'Forgot password?',
  description: 'Enter your email address and we will validate this sample reset form.',
  emailLabel: sampleSignInPageCopy.emailLabel,
  emailPlaceholder: sampleSignInPageCopy.emailPlaceholder,
  submit: 'Send reset link',
  signInPrompt: 'Remembered your password?',
  signInLink: 'Back to sign in',
  referenceValidatedMessage:
    'Sample forgot-password reference validated for {{email}}. No password reset request was sent.',
  validation: sampleForgotPasswordValidationMessages,
} as const;

export const sampleOtpPageCopy = {
  title: 'Two-factor authentication',
  description:
    'Enter the one-time password from your authenticator app to validate this sample form.',
  codeLabel: 'One-time password',
  codeDigitLabel: 'Digit {{position}} of the one-time password',
  codePlaceholder: '0',
  submit: 'Verify',
  verifyingSubmit: 'Verifying...',
  signInLink: 'Back to sign in',
  referenceValidatedMessage:
    'Sample OTP reference validated for code ending in {{codeSuffix}}. No authentication request was sent.',
  feedback: {
    incompleteTitle: 'Code incomplete',
    incompleteDescription: 'Enter all six digits before verifying this sample OTP.',
    invalidTitle: 'Code invalid',
    invalidDescription: 'Use digits only for this six-character sample OTP.',
    successTitle: 'Code verified',
  },
} as const;

export interface SampleSignInDemoSubmitResult {
  kind: 'demo-only';
  safeguards: SampleAuthDemoSubmissionSafeguards;
  message: string;
  values: SampleSignInFormValues;
}

export interface SampleSignUpDemoSubmitResult {
  kind: 'demo-only';
  safeguards: SampleAuthDemoSubmissionSafeguards;
  message: string;
  values: SampleSignUpFormValues;
}

export interface SampleSignIn2DemoSubmitResult {
  kind: 'demo-only';
  safeguards: SampleAuthDemoSubmissionSafeguards;
  message: string;
  values: SampleSignInFormValues;
}

export interface SampleForgotPasswordDemoSubmitResult {
  kind: 'demo-only';
  safeguards: SampleAuthDemoSubmissionSafeguards;
  message: string;
  values: SampleForgotPasswordFormValues;
}

export interface SampleOtpDemoSubmitResult {
  kind: 'demo-only';
  safeguards: SampleAuthDemoSubmissionSafeguards;
  message: string;
  values: SampleOtpFormValues;
}

export type SampleSignInDemoSubmitNotifier = (result: SampleSignInDemoSubmitResult) => void;

export type SampleSignUpDemoSubmitNotifier = (result: SampleSignUpDemoSubmitResult) => void;

export type SampleSignIn2DemoSubmitNotifier = (result: SampleSignIn2DemoSubmitResult) => void;

export type SampleForgotPasswordDemoSubmitNotifier = (
  result: SampleForgotPasswordDemoSubmitResult
) => void;

export type SampleOtpDemoSubmitNotifier = (result: SampleOtpDemoSubmitResult) => void;

export function toSampleSignInReferenceSubmissionMessage(values: SampleSignInFormValues) {
  return sampleSignInPageCopy.referenceValidatedMessage.replace('{{email}}', values.email);
}

export function createSampleSignInDemoSubmitHandler(notify: SampleSignInDemoSubmitNotifier) {
  return (values: SampleSignInFormValues): SampleSignInDemoSubmitResult => {
    const result = {
      kind: 'demo-only',
      safeguards: sampleAuthDemoSubmissionSafeguards,
      message: toSampleSignInReferenceSubmissionMessage(values),
      values,
    } as const satisfies SampleSignInDemoSubmitResult;

    notify(result);

    return result;
  };
}

export function toSampleSignUpReferenceSubmissionMessage(values: SampleSignUpFormValues) {
  return sampleSignUpPageCopy.referenceValidatedMessage.replace('{{email}}', values.email);
}

export function createSampleSignUpDemoSubmitHandler(notify: SampleSignUpDemoSubmitNotifier) {
  return (values: SampleSignUpFormValues): SampleSignUpDemoSubmitResult => {
    const result = {
      kind: 'demo-only',
      safeguards: sampleAuthDemoSubmissionSafeguards,
      message: toSampleSignUpReferenceSubmissionMessage(values),
      values,
    } as const satisfies SampleSignUpDemoSubmitResult;

    notify(result);

    return result;
  };
}

export function toSampleSignIn2ReferenceSubmissionMessage(values: SampleSignInFormValues) {
  return sampleSignIn2PageCopy.referenceValidatedMessage.replace('{{email}}', values.email);
}

export function createSampleSignIn2DemoSubmitHandler(notify: SampleSignIn2DemoSubmitNotifier) {
  return (values: SampleSignInFormValues): SampleSignIn2DemoSubmitResult => {
    const result = {
      kind: 'demo-only',
      safeguards: sampleAuthDemoSubmissionSafeguards,
      message: toSampleSignIn2ReferenceSubmissionMessage(values),
      values,
    } as const satisfies SampleSignIn2DemoSubmitResult;

    notify(result);

    return result;
  };
}

export function toSampleForgotPasswordReferenceSubmissionMessage(
  values: SampleForgotPasswordFormValues
) {
  return sampleForgotPasswordPageCopy.referenceValidatedMessage.replace('{{email}}', values.email);
}

export function createSampleForgotPasswordDemoSubmitHandler(
  notify: SampleForgotPasswordDemoSubmitNotifier
) {
  return (values: SampleForgotPasswordFormValues): SampleForgotPasswordDemoSubmitResult => {
    const result = {
      kind: 'demo-only',
      safeguards: sampleAuthDemoSubmissionSafeguards,
      message: toSampleForgotPasswordReferenceSubmissionMessage(values),
      values,
    } as const satisfies SampleForgotPasswordDemoSubmitResult;

    notify(result);

    return result;
  };
}

export function toSampleOtpReferenceSubmissionMessage(values: SampleOtpFormValues) {
  return sampleOtpPageCopy.referenceValidatedMessage.replace(
    '{{codeSuffix}}',
    values.code.slice(-2)
  );
}

export function createSampleOtpDemoSubmitHandler(notify: SampleOtpDemoSubmitNotifier) {
  return (values: SampleOtpFormValues): SampleOtpDemoSubmitResult => {
    const result = {
      kind: 'demo-only',
      safeguards: sampleOtpDemoSubmissionSafeguards,
      message: toSampleOtpReferenceSubmissionMessage(values),
      values,
    } as const satisfies SampleOtpDemoSubmitResult;

    notify(result);

    return result;
  };
}
