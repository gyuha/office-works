import type { User, UserRole, UserStatus } from '@/sample/users/types/user';
import { Faker, en, ko } from '@faker-js/faker';

/**
 * faker locale presets for the /sample admin demo.
 *
 * 결정성 보장: faker.seed(42)로 매번 동일한 결과를 생성합니다.
 * locale 전환 시에도 seed가 같으면 동일 인덱스의 레코드는 동일 구조(역할/상태/날짜)로 생성됩니다.
 */
export type SampleLocale = 'ko' | 'en';

const ROLES: readonly UserRole[] = ['superadmin', 'admin', 'manager', 'cashier'] as const;

const STATUSES: readonly UserStatus[] = ['active', 'inactive', 'invited', 'suspended'] as const;

const SAMPLE_USER_SEED = 42;
const DEFAULT_USER_COUNT = 50;
const SAMPLE_REFERENCE_DATE = new Date('2025-01-01T00:00:00.000Z');

function buildFaker(locale: SampleLocale): Faker {
  // ko 우선 + en fallback. en만 쓸 때도 동일한 Faker 인스턴스 인터페이스를 유지한다.
  const localeChain = locale === 'ko' ? [ko, en] : [en];
  return new Faker({ locale: localeChain });
}

/**
 * 결정적으로 mock 사용자 목록을 생성한다.
 *
 * 호출 측에서 zustand store init 시점에만 호출하면 새로고침 시 항상 동일한 시드 데이터로 초기화된다.
 */
export function generateUsers(
  count: number = DEFAULT_USER_COUNT,
  locale: SampleLocale = 'en'
): User[] {
  const faker = buildFaker(locale);
  faker.seed(SAMPLE_USER_SEED);

  return Array.from({ length: count }, (): User => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet.username({ firstName, lastName }).toLowerCase();

    const createdAt = faker.date.past({ years: 2, refDate: SAMPLE_REFERENCE_DATE });
    const updatedAt = faker.date.between({
      from: createdAt,
      to: SAMPLE_REFERENCE_DATE,
    });

    return {
      id: faker.string.uuid(),
      firstName,
      lastName,
      username,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      phoneNumber: faker.phone.number({ style: 'international' }),
      status: faker.helpers.arrayElement(STATUSES),
      role: faker.helpers.arrayElement(ROLES),
      createdAt,
      updatedAt,
    };
  });
}

/**
 * 기본 export. en locale + seed=42로 생성된 50명의 결정적 시드 데이터.
 *
 * 다른 locale이 필요하거나 zustand store가 동적으로 재생성하려면 generateUsers()를 직접 호출한다.
 */
export const users: User[] = generateUsers();
