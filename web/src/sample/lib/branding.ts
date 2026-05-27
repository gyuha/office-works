import { Faker, en, ko } from '@faker-js/faker';

export const SAMPLE_BRAND_NAME = 'Sample Admin';

export interface SampleBrandUser {
  name: string;
  email: string;
  avatarUrl: string;
  initials: string;
}

function createBrandUser(): SampleBrandUser {
  const faker = new Faker({ locale: [ko, en] });
  faker.seed(42);

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const name = `${lastName}${firstName}`;

  return {
    name,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    avatarUrl: faker.image.avatar(),
    initials: `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase(),
  };
}

export const sampleBrandUser = createBrandUser();
