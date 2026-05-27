export type HelpCenterCategory =
  | 'getting-started'
  | 'account'
  | 'workflow'
  | 'billing'
  | 'security';
export type HelpCenterArticleStatus = 'popular' | 'updated' | 'new';

export interface HelpCenterArticle {
  id: string;
  title: string;
  excerpt: string;
  category: HelpCenterCategory;
  status: HelpCenterArticleStatus;
  readMinutes: number;
  updatedAt: string;
}

export interface HelpCenterFaq {
  id: string;
  question: string;
  answer: string;
  category: HelpCenterCategory;
}

export interface HelpCenterContactOption {
  id: string;
  title: string;
  description: string;
  responseTime: string;
}
