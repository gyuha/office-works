import type { sampleSignInFieldNames } from '../schema/sign-in-schema';

interface SampleSignInFieldErrorMessageProps {
  'aria-live': 'polite';
  'data-field-error': (typeof sampleSignInFieldNames)[number];
}

export const sampleSignInFieldErrorMessageProps = {
  email: {
    'aria-live': 'polite',
    'data-field-error': 'email',
  },
  password: {
    'aria-live': 'polite',
    'data-field-error': 'password',
  },
} as const satisfies Record<
  (typeof sampleSignInFieldNames)[number],
  SampleSignInFieldErrorMessageProps
>;

export type SampleSignInSubmissionFeedbackKind = 'success';

export interface SampleSignInSubmissionFeedback {
  kind: SampleSignInSubmissionFeedbackKind;
  title: string;
  description: string;
}

export const sampleSignInSubmissionFeedbackProps = {
  'aria-live': 'polite',
  'data-sign-in-feedback': 'submission',
} as const;
