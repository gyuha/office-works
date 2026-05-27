import type { DashboardStat } from '@/sample/dashboard/types/stat';
import { Activity, CreditCard, DollarSign, Users } from 'lucide-react';

/**
 * shadcn-admin 의 dashboard overview 상단 4 종 KPI 카드 데이터.
 *
 * 원본:
 *   - Total Revenue : $45,231.89  (+20.1% from last month)
 *   - Subscriptions : +2350       (+180.1% from last month)
 *   - Sales         : +12,234     (+19% from last month)
 *   - Active Now    : +573        (+201 since last hour)
 *
 * 본 포트에서는 default locale = ko 기준으로 라벨/문구만 한국어화하고,
 * 수치는 원본 정적 mock 값을 유지한다 (₩ 환산 + 천단위 콤마).
 * 후속 i18n sub-AC 에서 label/delta 를 i18n key 로 치환해도
 * 카드 컴포넌트 시그니처는 변하지 않도록 데이터 형태로 분리한다.
 */
export const dashboardStats: readonly DashboardStat[] = [
  {
    id: 'total-revenue',
    label: '총 매출',
    value: '₩45,231,890',
    delta: '+20.1% 전월 대비',
    icon: DollarSign,
  },
  {
    id: 'subscriptions',
    label: '구독자 수',
    value: '+2,350',
    delta: '+180.1% 전월 대비',
    icon: Users,
  },
  {
    id: 'sales',
    label: '판매 수',
    value: '+12,234',
    delta: '+19% 전월 대비',
    icon: CreditCard,
  },
  {
    id: 'active-now',
    label: '활성 사용자',
    value: '+573',
    delta: '+201 직전 시간 대비',
    icon: Activity,
  },
] as const;
