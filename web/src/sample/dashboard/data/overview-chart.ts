import type { OverviewChartPoint } from '@/sample/dashboard/types/chart';
import { Faker, en, ko } from '@faker-js/faker';

/**
 * Overview(BarChart) 12 개월 매출 mock 데이터 생성기.
 *
 * 결정성: `faker.seed(42)` 로 매번 동일한 시드 결과를 생성한다.
 * locale 별로 X 축 월 라벨만 달라지고 수치는 동일하게 유지되도록
 * 라벨은 정적 매핑, 수치만 faker 로 생성한다.
 */
export type SampleLocale = 'ko' | 'en';

const SAMPLE_CHART_SEED = 42;

/** 매출 mock 의 최소·최대 (단위: 원). */
const MIN_TOTAL = 1_200_000;
const MAX_TOTAL = 5_500_000;

const MONTH_LABELS_KO: readonly string[] = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

const MONTH_LABELS_EN: readonly string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function buildFaker(locale: SampleLocale): Faker {
  const localeChain = locale === 'ko' ? [ko, en] : [en];
  return new Faker({ locale: localeChain });
}

function pickMonthLabel(locale: SampleLocale, index: number): string {
  const labels = locale === 'ko' ? MONTH_LABELS_KO : MONTH_LABELS_EN;
  return labels[index] ?? String(index + 1);
}

/**
 * 12 개월(1월~12월) 매출 mock 데이터.
 *
 * 호출 측은 locale 만 넘기면 되며, 동일 seed 로 매번 같은 곡선이 나온다.
 */
export function generateOverviewChart(locale: SampleLocale = 'ko'): OverviewChartPoint[] {
  const faker = buildFaker(locale);
  faker.seed(SAMPLE_CHART_SEED);

  return Array.from({ length: 12 }, (_, monthIndex): OverviewChartPoint => {
    const total = faker.number.int({ min: MIN_TOTAL, max: MAX_TOTAL });
    return {
      monthIndex,
      label: pickMonthLabel(locale, monthIndex),
      total,
    };
  });
}

/**
 * 기본 ko locale 의 정적 차트 데이터.
 *
 * 라우트 기본 locale 이 ko 이고, 별도 i18n 분기가 도입되기 전까지 사용한다.
 * 후속 sub-AC(i18n)에서 locale 전환 hook 으로 교체할 수 있다.
 */
export const overviewChart: readonly OverviewChartPoint[] = generateOverviewChart('ko');
