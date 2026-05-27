import type { RecentSale } from '@/sample/dashboard/types/recent-sale';
import { Faker, en, ko } from '@faker-js/faker';

/**
 * Dashboard 우측 "최근 판매" 패널의 mock 데이터 생성기.
 *
 * 결정성: `faker.seed(42)` 로 매번 동일한 시드 결과를 생성한다.
 * locale 별로 이름/이메일 문화권이 자연스럽게 바뀌고, 금액 표기는
 * ko 는 "+₩" + 천 단위 콤마, en 은 "+$" + 소수 두 자리로 분기한다.
 */
export type SampleLocale = 'ko' | 'en';

const SAMPLE_RECENT_SALES_SEED = 42;
const DEFAULT_RECENT_SALES_COUNT = 5;

/** 결제 금액 mock 의 최소·최대. ko 는 원, en 은 달러 기준. */
const MIN_AMOUNT_KRW = 89_000;
const MAX_AMOUNT_KRW = 3_900_000;
const MIN_AMOUNT_USD = 39;
const MAX_AMOUNT_USD = 1_999;

function buildFaker(locale: SampleLocale): Faker {
  // ko 우선 + en fallback. en 단독일 때도 동일한 Faker 인터페이스를 유지한다.
  const localeChain = locale === 'ko' ? [ko, en] : [en];
  return new Faker({ locale: localeChain });
}

function formatAmount(value: number, locale: SampleLocale): string {
  if (locale === 'ko') {
    return `+₩${Math.round(value).toLocaleString('ko-KR')}`;
  }
  return `+$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildInitials(firstName: string, lastName: string, locale: SampleLocale): string {
  // 한글: 성 1자 + 이름 첫 글자 / 영문: 각 첫 글자 대문자
  if (locale === 'ko') {
    const last = lastName.charAt(0) ?? '';
    const first = firstName.charAt(0) ?? '';
    return `${last}${first}`;
  }
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  return `${first}${last}`;
}

/**
 * 결정적으로 mock 최근 판매 목록을 생성한다.
 *
 * 호출 측은 locale 만 넘기면 되며, 동일 seed 로 매번 같은 5 건이 생성된다.
 * locale 변경 시에도 인덱스별 데이터 구조(이름/이메일 형태)는 일관되게 유지된다.
 */
export function generateRecentSales(
  count: number = DEFAULT_RECENT_SALES_COUNT,
  locale: SampleLocale = 'ko'
): RecentSale[] {
  const faker = buildFaker(locale);
  faker.seed(SAMPLE_RECENT_SALES_SEED);

  const minAmount = locale === 'ko' ? MIN_AMOUNT_KRW : MIN_AMOUNT_USD;
  const maxAmount = locale === 'ko' ? MAX_AMOUNT_KRW : MAX_AMOUNT_USD;

  return Array.from({ length: count }, (): RecentSale => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = locale === 'ko' ? `${lastName} ${firstName}` : `${firstName} ${lastName}`;

    const rawAmount =
      locale === 'ko'
        ? faker.number.int({ min: minAmount, max: maxAmount })
        : faker.number.float({ min: minAmount, max: maxAmount, fractionDigits: 2 });

    return {
      id: faker.string.uuid(),
      name: fullName,
      initials: buildInitials(firstName, lastName, locale),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      amount: formatAmount(rawAmount, locale),
      avatarUrl: faker.image.avatar(),
    };
  });
}

/**
 * 기본 export. ko locale + seed=42 로 생성된 5 건의 결정적 시드 데이터.
 *
 * 다른 locale 이 필요하거나 컴포넌트가 동적으로 재생성하려면 generateRecentSales() 를 직접 호출한다.
 */
export const recentSales: readonly RecentSale[] = generateRecentSales();
