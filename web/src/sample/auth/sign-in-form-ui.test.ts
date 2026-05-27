import {
  sampleSignInFieldErrorMessageProps,
  sampleSignInSubmissionFeedbackProps,
} from './components/sample-sign-in-feedback-contract';
import { sampleSignIn2PageCopy, sampleSignInPageCopy } from './sample-auth-copy';
import { sampleSignInFieldNames } from './schema/sign-in-schema';

const configuredErrorMessageFields = Object.keys(sampleSignInFieldErrorMessageProps).sort();
const expectedErrorMessageFields = [...sampleSignInFieldNames].sort();

if (configuredErrorMessageFields.join(',') !== expectedErrorMessageFields.join(',')) {
  throw new Error(
    'Sign-in UI must expose field-level validation message slots for every form field.'
  );
}

for (const fieldName of sampleSignInFieldNames) {
  const errorMessageProps = sampleSignInFieldErrorMessageProps[fieldName];

  if (errorMessageProps['data-field-error'] !== fieldName) {
    throw new Error(`Sign-in ${fieldName} validation message must be tied to its field.`);
  }

  if (errorMessageProps['aria-live'] !== 'polite') {
    throw new Error(`Sign-in ${fieldName} validation message must be announced politely.`);
  }
}

assertLocalSignInFeedback('Sign-in', sampleSignInSubmissionFeedbackProps, {
  kind: 'success',
  title: sampleSignInPageCopy.feedback.successTitle,
  description: sampleSignInPageCopy.referenceValidatedMessage,
});
assertLocalSignInFeedback('Two-column sign-in', sampleSignInSubmissionFeedbackProps, {
  kind: 'success',
  title: sampleSignIn2PageCopy.feedback.successTitle,
  description: sampleSignIn2PageCopy.referenceValidatedMessage,
});

function assertLocalSignInFeedback(
  label: string,
  props: { 'aria-live': 'polite'; 'data-sign-in-feedback': 'submission' },
  feedback: { kind: 'success'; title: string; description: string }
) {
  if (props['aria-live'] !== 'polite') {
    throw new Error(`${label} local demo feedback must be announced politely.`);
  }

  if (props['data-sign-in-feedback'] !== 'submission') {
    throw new Error(`${label} local demo feedback must expose a stable test hook.`);
  }

  if (!feedback.title.includes('no real authentication occurred')) {
    throw new Error(
      `${label} feedback title must clearly state that no real authentication occurred.`
    );
  }

  if (
    !feedback.description.includes('No real authentication occurred') ||
    !feedback.description.includes('no session was created') ||
    !feedback.description.includes('no authentication request was sent')
  ) {
    throw new Error(`${label} feedback description must clearly state local UI-only auth safety.`);
  }
}
