import type { ComponentType, SVGProps } from 'react';

/**
 * 대시보드 상단 KPI 카드 1 개의 데이터 모델.
 *
 * shadcn-admin 의 Total Revenue / Subscriptions / Sales / Active Now 카드를
 * 단일 타입으로 추상화한다. value, delta 는 사전 포맷팅된 문자열을 그대로 받아
 * 카드 렌더러는 표시 책임만 갖는다 (포맷팅 책임 분리).
 */
export interface DashboardStat {
  /** 카드 식별자. React key 와 i18n key suffix 등에 활용 가능. */
  id: 'total-revenue' | 'subscriptions' | 'sales' | 'active-now';
  /** 카드 좌상단 라벨 (예: "총 매출"). */
  label: string;
  /** 카드 메인 수치 문자열 (예: "₩45,231,890"). */
  value: string;
  /** 카드 하단 보조 설명/델타 문자열 (예: "+20.1% 전월 대비"). */
  delta: string;
  /** 우상단 lucide 아이콘 컴포넌트. */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}
