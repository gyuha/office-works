import { z } from 'zod';
import {
  SAMPLE_AUTH_PASSWORD_MIN_LENGTH,
  sampleAuthValidationMessages,
  sampleEmailSchema,
  samplePasswordSchema,
} from './auth-field-schema';

export const SAMPLE_SIGN_IN_PASSWORD_MIN_LENGTH = SAMPLE_AUTH_PASSWORD_MIN_LENGTH;

export const sampleSignInValidationMessages = sampleAuthValidationMessages;

export const sampleSignInSchema = z.object({
  email: sampleEmailSchema,
  password: samplePasswordSchema,
});

export type SampleSignInFormValues = z.infer<typeof sampleSignInSchema>;

export const sampleSignInFieldNames = [
  'email',
  'password',
] as const satisfies readonly (keyof SampleSignInFormValues)[];
