import { sampleSignUpFieldErrorMessageProps } from './components/sample-sign-up-page';
import {
  sampleSignUpFieldNames,
  sampleSignUpSchema,
  sampleSignUpValidationMessages,
} from './schema/sign-up-schema';

const configuredErrorMessageFields = Object.keys(sampleSignUpFieldErrorMessageProps).sort();
const expectedErrorMessageFields = [...sampleSignUpFieldNames].sort();

if (configuredErrorMessageFields.join(',') !== expectedErrorMessageFields.join(',')) {
  throw new Error('Sign-up UI must expose user-visible validation message slots for every field.');
}

for (const fieldName of sampleSignUpFieldNames) {
  const errorMessageProps = sampleSignUpFieldErrorMessageProps[fieldName];

  if (errorMessageProps['data-field-error'] !== fieldName) {
    throw new Error(`Sign-up ${fieldName} validation message must be tied to its field.`);
  }

  if (errorMessageProps['aria-live'] !== 'polite') {
    throw new Error(`Sign-up ${fieldName} validation message must be announced politely.`);
  }
}

assertRequiredFieldMessage(
  { name: '', email: 'new-user@example.com', password: 'password', confirmPassword: 'password' },
  'name',
  sampleSignUpValidationMessages.nameRequired
);
assertRequiredFieldMessage(
  { name: 'Ada Lovelace', email: '', password: 'password', confirmPassword: 'password' },
  'email',
  sampleSignUpValidationMessages.emailRequired
);
assertRequiredFieldMessage(
  { name: 'Ada Lovelace', email: 'new-user@example.com', password: '', confirmPassword: '' },
  'password',
  sampleSignUpValidationMessages.passwordRequired
);
assertRequiredFieldMessage(
  {
    name: 'Ada Lovelace',
    email: 'new-user@example.com',
    password: 'password',
    confirmPassword: '',
  },
  'confirmPassword',
  sampleSignUpValidationMessages.confirmPasswordRequired
);

function assertRequiredFieldMessage(
  values: { name: string; email: string; password: string; confirmPassword: string },
  fieldName: (typeof sampleSignUpFieldNames)[number],
  message: string
) {
  const parsedValues = sampleSignUpSchema.safeParse(values);

  if (parsedValues.success) {
    throw new Error(`Sign-up schema must reject empty ${fieldName} values client-side.`);
  }

  const hasExpectedIssue = parsedValues.error.issues.some(
    (issue) => issue.path.join('.') === fieldName && issue.message === message
  );

  if (!hasExpectedIssue) {
    throw new Error(`Sign-up ${fieldName} must show the expected required-field message.`);
  }
}
