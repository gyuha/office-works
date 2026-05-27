import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck } from 'lucide-react';
import type { SampleSignInSubmissionFeedback } from './sample-sign-in-feedback-contract';
import { sampleSignInSubmissionFeedbackProps } from './sample-sign-in-feedback-contract';

interface SampleSignInDemoFeedbackAlertProps {
  feedback: SampleSignInSubmissionFeedback;
}

export function SampleSignInDemoFeedbackAlert({ feedback }: SampleSignInDemoFeedbackAlertProps) {
  return (
    <Alert
      {...sampleSignInSubmissionFeedbackProps}
      data-sign-in-feedback-kind={feedback.kind}
      className="border-emerald-500/50 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300"
    >
      <ShieldCheck aria-hidden />
      <AlertTitle>{feedback.title}</AlertTitle>
      <AlertDescription>{feedback.description}</AlertDescription>
    </Alert>
  );
}
