import { z } from 'zod';
import { sampleAuthValidationMessages, sampleEmailSchema } from './auth-field-schema';

export const sampleForgotPasswordValidationMessages = sampleAuthValidationMessages;

export const sampleForgotPasswordSchema = z.object({
  email: sampleEmailSchema,
});

export type SampleForgotPasswordFormValues = z.infer<typeof sampleForgotPasswordSchema>;

export const sampleForgotPasswordFieldNames = [
  'email',
] as const satisfies readonly (keyof SampleForgotPasswordFormValues)[];
