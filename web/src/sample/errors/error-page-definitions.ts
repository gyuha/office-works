import type { LucideIcon } from 'lucide-react';
import { Construction, LockKeyhole, SearchX, ServerCrash, ShieldAlert } from 'lucide-react';

export interface SampleErrorPageDefinition {
  code: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const sampleUnauthorizedErrorPage = {
  code: '401',
  title: 'Unauthorized',
  description:
    'This demo route shows how an unauthenticated state can be presented without wiring a real session gate.',
  icon: ShieldAlert,
} as const satisfies SampleErrorPageDefinition;

export const sampleForbiddenErrorPage = {
  code: '403',
  title: 'Forbidden',
  description:
    'The sample UI can demonstrate a denied permission state while keeping every /sample route public.',
  icon: LockKeyhole,
} as const satisfies SampleErrorPageDefinition;

export const sampleNotFoundErrorPage = {
  code: '404',
  title: 'Not Found',
  description: 'The route you are looking for does not exist in the Sample Admin reference tree.',
  icon: SearchX,
} as const satisfies SampleErrorPageDefinition;

export const sampleInternalServerErrorPage = {
  code: '500',
  title: 'Internal Server Error',
  description:
    'Use this mock page as a copyable reference for unexpected backend or integration failures.',
  icon: ServerCrash,
} as const satisfies SampleErrorPageDefinition;

export const sampleMaintenanceErrorPage = {
  code: '503',
  title: 'Maintenance Error',
  description:
    'The reference page models a temporary outage or scheduled maintenance state without calling a backend.',
  icon: Construction,
} as const satisfies SampleErrorPageDefinition;
