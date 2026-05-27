export type SampleAppCategory =
  | 'analytics'
  | 'communication'
  | 'developer'
  | 'finance'
  | 'marketing';

export type SampleAppStatus = 'connected' | 'available' | 'coming-soon';

export interface SampleApp {
  id: string;
  name: string;
  description: string;
  category: SampleAppCategory;
  status: SampleAppStatus;
  accentColor: string;
  users: number;
  rating: number;
  reviews: number;
  featured: boolean;
}
