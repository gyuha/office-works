import { z } from 'zod';
import {
  SAMPLE_AUTH_PASSWORD_MIN_LENGTH,
  sampleAuthValidationMessages,
  sampleEmailSchema,
  samplePasswordSchema,
} from './auth-field-schema';

export const SAMPLE_SIGN_UP_PASSWORD_MIN_LENGTH = SAMPLE_AUTH_PASSWORD_MIN_LENGTH;

export const sampleSignUpValidationMessages = {
  ...sampleAuthValidationMessages,
  confirmPasswordRequired: 'Please confirm your password.',
  nameMinLength: 'Name must be at least 2 characters long.',
  nameRequired: 'Please enter your name.',
  passwordMismatch: "Passwords don't match.",
  passwordWeak: 'Password must include at least one letter and one number.',
} as const;

const sampleSignUpPasswordSchema = samplePasswordSchema.refine(
  (password) => {
    const trimmedPassword = password.trim();

    return (
      trimmedPassword.length === 0 ||
      (/[A-Za-z]/.test(trimmedPassword) && /\d/.test(trimmedPassword))
    );
  },
  { message: sampleSignUpValidationMessages.passwordWeak }
);

export const sampleSignUpSchema = z
  .object({
    confirmPassword: z.string().min(1, sampleSignUpValidationMessages.confirmPasswordRequired),
    email: sampleEmailSchema,
    name: z
      .string()
      .trim()
      .min(1, sampleSignUpValidationMessages.nameRequired)
      .min(2, sampleSignUpValidationMessages.nameMinLength),
    password: sampleSignUpPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: sampleSignUpValidationMessages.passwordMismatch,
    path: ['confirmPassword'],
  });

export type SampleSignUpFormValues = z.infer<typeof sampleSignUpSchema>;

export const sampleSignUpFieldNames = [
  'name',
  'email',
  'password',
  'confirmPassword',
] as const satisfies readonly (keyof SampleSignUpFormValues)[];
