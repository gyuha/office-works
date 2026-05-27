import { z } from 'zod';

export const SAMPLE_OTP_CODE_LENGTH = 6;

export const sampleOtpValidationMessages = {
  codeRequired: 'Please enter the one-time password.',
  codeLength: `One-time password must be ${SAMPLE_OTP_CODE_LENGTH} digits.`,
  codeNumeric: 'One-time password must contain digits only.',
} as const;

export const sampleOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .superRefine((code, context) => {
      if (!code) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: sampleOtpValidationMessages.codeRequired,
        });
        return;
      }

      if (code.length !== SAMPLE_OTP_CODE_LENGTH || /\s/.test(code)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: sampleOtpValidationMessages.codeLength,
        });
        return;
      }

      if (!/^\d+$/.test(code)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: sampleOtpValidationMessages.codeNumeric,
        });
      }
    }),
});

export type SampleOtpFormValues = z.infer<typeof sampleOtpSchema>;

export const sampleOtpFieldNames = [
  'code',
] as const satisfies readonly (keyof SampleOtpFormValues)[];
