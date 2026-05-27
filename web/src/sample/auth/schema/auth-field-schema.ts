import { z } from 'zod';

export const SAMPLE_AUTH_PASSWORD_MIN_LENGTH = 8;

export const sampleAuthValidationMessages = {
  emailInvalid: 'Please enter a valid email address.',
  emailRequired: 'Please enter your email.',
  passwordMinLength: `Password must be at least ${SAMPLE_AUTH_PASSWORD_MIN_LENGTH} characters long.`,
  passwordRequired: 'Please enter your password.',
} as const;

const sampleEmailFormatSchema = z.string().email();

export const sampleEmailSchema = z
  .string()
  .trim()
  .superRefine((email, context) => {
    if (email.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: sampleAuthValidationMessages.emailRequired,
      });
      return;
    }

    if (!sampleEmailFormatSchema.safeParse(email).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: sampleAuthValidationMessages.emailInvalid,
      });
    }
  });

export const samplePasswordSchema = z
  .string()
  .min(1, sampleAuthValidationMessages.passwordRequired)
  .min(SAMPLE_AUTH_PASSWORD_MIN_LENGTH, sampleAuthValidationMessages.passwordMinLength)
  .refine((value) => value.trim().length > 0, sampleAuthValidationMessages.passwordRequired);
