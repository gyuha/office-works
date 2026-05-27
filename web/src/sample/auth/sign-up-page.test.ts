import {
  createSampleSignUpDemoSubmitHandler,
  toSampleSignUpReferenceSubmissionMessage,
} from './sample-auth-copy';
import { sampleSignUpSchema, sampleSignUpValidationMessages } from './schema/sign-up-schema';

const validSignUpValues = {
  name: 'Ada Lovelace',
  email: 'new-user@example.com',
  password: 'password1',
  confirmPassword: 'password1',
};

const parsedValidValues = sampleSignUpSchema.safeParse(validSignUpValues);

if (!parsedValidValues.success) {
  throw new Error('Sign-up schema must accept matching valid account credentials.');
}

const parsedMismatchedPasswords = sampleSignUpSchema.safeParse({
  ...validSignUpValues,
  confirmPassword: 'different-password',
});

if (parsedMismatchedPasswords.success) {
  throw new Error('Sign-up schema must reject mismatched passwords client-side.');
}

const parsedEmptyValues = sampleSignUpSchema.safeParse({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

if (parsedEmptyValues.success) {
  throw new Error('Sign-up schema must reject empty account credentials client-side.');
}

assertInvalidSignUpValueMessage(
  {
    ...validSignUpValues,
    email: 'not-an-email',
  },
  'email',
  sampleSignUpValidationMessages.emailInvalid
);

assertInvalidSignUpValueMessage(
  {
    ...validSignUpValues,
    password: 'password',
    confirmPassword: 'password',
  },
  'password',
  'Password must include at least one letter and one number.'
);

assertInvalidSignUpValueMessage(
  {
    ...validSignUpValues,
    confirmPassword: 'different-password',
  },
  'confirmPassword',
  sampleSignUpValidationMessages.passwordMismatch
);

const submissionMessage = toSampleSignUpReferenceSubmissionMessage(parsedValidValues.data);

if (
  submissionMessage !==
  'Sample sign-up reference validated for new-user@example.com. No authentication request was sent.'
) {
  throw new Error('Sign-up submission must stay a client-only reference with no auth request.');
}

const demoSubmitNotifications: string[] = [];
const demoSubmitHandler = createSampleSignUpDemoSubmitHandler((result) => {
  demoSubmitNotifications.push(result.message);
});
const demoSubmitResult = demoSubmitHandler(parsedValidValues.data);

if (demoSubmitResult.kind !== 'demo-only') {
  throw new Error('Sign-up submit handler must explicitly report demo-only execution.');
}

if (demoSubmitResult.message !== submissionMessage) {
  throw new Error('Sign-up submit handler must return the demo-only validation message.');
}

if (demoSubmitNotifications.join('\n') !== submissionMessage) {
  throw new Error('Sign-up submit handler must notify only the demo validation message.');
}

function assertInvalidSignUpValueMessage(
  values: { name: string; email: string; password: string; confirmPassword: string },
  fieldName: 'name' | 'email' | 'password' | 'confirmPassword',
  message: string
) {
  const parsedValues = sampleSignUpSchema.safeParse(values);

  if (parsedValues.success) {
    throw new Error(`Sign-up schema must reject invalid ${fieldName} values client-side.`);
  }

  const hasExpectedIssue = parsedValues.error.issues.some(
    (issue) => issue.path.join('.') === fieldName && issue.message === message
  );

  if (!hasExpectedIssue) {
    throw new Error(`Sign-up ${fieldName} must show the expected invalid-value message.`);
  }
}
