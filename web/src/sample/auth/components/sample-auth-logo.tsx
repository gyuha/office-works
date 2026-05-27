import { cn } from '@/lib/utils';
import { SAMPLE_BRAND_NAME } from '@/sample/lib/branding';
import type { SVGProps } from 'react';

export function SampleAuthLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      height="24"
      width="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-6', className)}
      {...props}
    >
      <title>{SAMPLE_BRAND_NAME}</title>
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </svg>
  );
}
