import type {
  SampleAccordionNavItem,
  SampleAccordionNavValue,
  SampleSecondLevelAccordionNavItem,
} from './navigation';
import {
  SAMPLE_DASHBOARD_PATH,
  SAMPLE_ERROR_401_PATH,
  SAMPLE_ERROR_403_PATH,
  SAMPLE_ERROR_404_PATH,
  SAMPLE_ERROR_500_PATH,
  SAMPLE_ERROR_503_PATH,
  SAMPLE_ERROR_FORBIDDEN_PATH,
  SAMPLE_ERROR_INTERNAL_SERVER_ERROR_PATH,
  SAMPLE_ERROR_MAINTENANCE_ALIAS_PATH,
  SAMPLE_ERROR_MAINTENANCE_PATH,
  SAMPLE_ERROR_NOT_FOUND_PATH,
  SAMPLE_ERROR_UNAUTHORIZED_PATH,
  SAMPLE_FORGOT_PASSWORD_PATH,
  SAMPLE_LOGIN_PATH,
  SAMPLE_OTP_PATH,
  SAMPLE_SIGNUP_PATH,
  SAMPLE_SIGN_IN_2_COLUMN_PATH,
  SAMPLE_SIGN_IN_2_PATH,
  SAMPLE_SIGN_IN_PATH,
  SAMPLE_SIGN_UP_PATH,
  getSamplePagesChildRouteGroup,
  getSampleRouteOpenAccordionGroups,
  getSampleSidebarOpenAccordionGroups,
  isSampleAuthChildRoute,
  isSampleErrorChildRoute,
  samplePagesMenuItem,
} from './navigation';

interface SampleNavItemWithLabelKeys {
  i18nKey: string;
  titleI18nKey?: string;
  descriptionI18nKey?: string;
}

function expectSampleNavLabelKeys(item: SampleNavItemWithLabelKeys) {
  const expectedTitleKey = `nav.${item.i18nKey}.title`;
  const expectedDescriptionKey = `nav.${item.i18nKey}.description`;

  if (item.titleI18nKey !== expectedTitleKey) {
    throw new Error(
      `Navigation item ${item.i18nKey} must resolve its title from ${expectedTitleKey}.`
    );
  }

  if (item.descriptionI18nKey !== expectedDescriptionKey) {
    throw new Error(
      `Navigation item ${item.i18nKey} must resolve its description from ${expectedDescriptionKey}.`
    );
  }
}

function expectPagesTopLevelAccordion(item: SampleAccordionNavItem) {
  if (item.kind !== 'accordion') {
    throw new Error('Pages navigation item must be an accordion.');
  }

  if (item.i18nKey !== 'pages') {
    throw new Error('Pages navigation item must use the pages i18n key.');
  }

  expectSampleNavLabelKeys(item);
}

function expectSecondLevelAccordion(
  item: SampleAccordionNavItem,
  value: SampleSecondLevelAccordionNavItem['value']
) {
  if (item.kind !== 'accordion') {
    throw new Error(`${value} navigation item must be an accordion.`);
  }

  if (item.value !== value) {
    throw new Error(`${value} navigation item must use the ${value} accordion value.`);
  }

  if (item.i18nKey !== value) {
    throw new Error(`${value} navigation item must use the ${value} i18n key.`);
  }

  expectSampleNavLabelKeys(item);
}

function getSecondLevelAccordionNavItem(
  value: SampleSecondLevelAccordionNavItem['value']
): SampleSecondLevelAccordionNavItem {
  const item = samplePagesMenuItem.items.find(
    (navItem) => navItem.kind === 'accordion' && navItem.value === value
  );

  if (!item || item.kind !== 'accordion') {
    throw new Error(`Pages navigation item must contain a ${value} accordion group.`);
  }

  return item;
}

function expectRouteOpenAccordionGroups(
  pathname: string,
  expectedGroups: readonly SampleAccordionNavValue[]
) {
  const actualGroups = getSampleRouteOpenAccordionGroups(pathname);

  expectAccordionGroups(
    actualGroups,
    expectedGroups,
    `Route ${pathname} must open accordion groups ${expectedGroups.join(', ')}, but opened ${actualGroups.join(', ')}.`
  );
}

function expectSidebarOpenAccordionGroups(
  currentOpenGroups: readonly string[],
  routeOpenGroups: readonly string[],
  expectedGroups: readonly SampleAccordionNavValue[]
) {
  const actualGroups = getSampleSidebarOpenAccordionGroups(currentOpenGroups, routeOpenGroups);

  expectAccordionGroups(
    actualGroups,
    expectedGroups,
    `Sidebar accordion must resolve ${currentOpenGroups.join(', ')} with route groups ${routeOpenGroups.join(', ')} to ${expectedGroups.join(', ')}, but resolved ${actualGroups.join(', ')}.`
  );
}

function expectAccordionGroups(
  actualGroups: readonly SampleAccordionNavValue[],
  expectedGroups: readonly SampleAccordionNavValue[],
  errorMessage: string
) {
  if (actualGroups.length !== expectedGroups.length) {
    throw new Error(errorMessage);
  }

  for (const [index, expectedGroup] of expectedGroups.entries()) {
    if (actualGroups[index] !== expectedGroup) {
      throw new Error(errorMessage);
    }
  }
}

expectPagesTopLevelAccordion(samplePagesMenuItem);

const authGroup = getSecondLevelAccordionNavItem('auth');

expectSecondLevelAccordion(authGroup, 'auth');

const expectedAuthLinks = [
  { path: SAMPLE_SIGN_IN_PATH, i18nKey: 'signIn' },
  { path: SAMPLE_SIGN_IN_2_PATH, i18nKey: 'signIn2Column' },
  { path: SAMPLE_SIGN_UP_PATH, i18nKey: 'signUp' },
  { path: SAMPLE_FORGOT_PASSWORD_PATH, i18nKey: 'forgotPassword' },
  { path: SAMPLE_OTP_PATH, i18nKey: 'otp' },
] as const;

for (const expectedLink of expectedAuthLinks) {
  const authLink = authGroup.items.find((item) => item.to === expectedLink.path);

  if (!authLink) {
    throw new Error(`Auth accordion group must contain ${expectedLink.path}.`);
  }

  if (authLink.i18nKey !== expectedLink.i18nKey) {
    throw new Error(
      `Auth accordion link ${expectedLink.path} must use the ${expectedLink.i18nKey} i18n key.`
    );
  }

  expectSampleNavLabelKeys(authLink);

  if (getSamplePagesChildRouteGroup(expectedLink.path) !== 'auth') {
    throw new Error(`Auth child route ${expectedLink.path} must be detected as the Auth group.`);
  }

  if (!isSampleAuthChildRoute(expectedLink.path)) {
    throw new Error(`Auth child route ${expectedLink.path} must match Auth child route detection.`);
  }

  if (isSampleErrorChildRoute(expectedLink.path)) {
    throw new Error(
      `Auth child route ${expectedLink.path} must not match Error child route detection.`
    );
  }

  expectRouteOpenAccordionGroups(expectedLink.path, ['pages', 'auth']);
}

const preservedAuthAliasPaths: readonly string[] = [
  SAMPLE_LOGIN_PATH,
  SAMPLE_SIGN_IN_2_COLUMN_PATH,
  SAMPLE_SIGNUP_PATH,
];
const authRoutePaths: readonly string[] = authGroup.items.map((item) => item.to);
const actualAuthAliases: readonly string[] = authGroup.items.flatMap((item) => item.aliases ?? []);

for (const aliasPath of preservedAuthAliasPaths) {
  if (authRoutePaths.includes(aliasPath)) {
    throw new Error(
      `Auth accordion links must use shadcn-style kebab URLs instead of ${aliasPath}.`
    );
  }

  if (!actualAuthAliases.includes(aliasPath)) {
    throw new Error(`Auth accordion group must preserve alias ${aliasPath}.`);
  }

  expectRouteOpenAccordionGroups(aliasPath, ['pages', 'auth']);
}

const errorsGroup = getSecondLevelAccordionNavItem('errors');

expectSecondLevelAccordion(errorsGroup, 'errors');

const errorRoutePaths: readonly string[] = errorsGroup.items.map((item) => item.to);
const expectedSemanticErrorRoutePaths = [
  SAMPLE_ERROR_UNAUTHORIZED_PATH,
  SAMPLE_ERROR_FORBIDDEN_PATH,
  SAMPLE_ERROR_NOT_FOUND_PATH,
  SAMPLE_ERROR_INTERNAL_SERVER_ERROR_PATH,
  SAMPLE_ERROR_MAINTENANCE_PATH,
] as const;
const preservedNumericErrorRoutePaths = [
  SAMPLE_ERROR_401_PATH,
  SAMPLE_ERROR_403_PATH,
  SAMPLE_ERROR_404_PATH,
  SAMPLE_ERROR_500_PATH,
  SAMPLE_ERROR_503_PATH,
] as const;

for (const expectedPath of expectedSemanticErrorRoutePaths) {
  const errorLink = errorsGroup.items.find((item) => item.to === expectedPath);

  if (!errorLink) {
    throw new Error(`Errors accordion group must contain semantic route ${expectedPath}.`);
  }

  expectSampleNavLabelKeys(errorLink);

  if (getSamplePagesChildRouteGroup(expectedPath) !== 'errors') {
    throw new Error(`Error child route ${expectedPath} must be detected as the Errors group.`);
  }

  if (!isSampleErrorChildRoute(expectedPath)) {
    throw new Error(`Error child route ${expectedPath} must match Error child route detection.`);
  }

  if (isSampleAuthChildRoute(expectedPath)) {
    throw new Error(`Error child route ${expectedPath} must not match Auth child route detection.`);
  }

  expectRouteOpenAccordionGroups(expectedPath, ['pages', 'errors']);
}

for (const numericPath of preservedNumericErrorRoutePaths) {
  if (errorRoutePaths.includes(numericPath)) {
    throw new Error(`Errors accordion links must use semantic URLs instead of ${numericPath}.`);
  }
}

const actualNumericAliases = errorsGroup.items.flatMap((item) => item.aliases ?? []);

for (const numericPath of preservedNumericErrorRoutePaths) {
  if (!actualNumericAliases.includes(numericPath)) {
    throw new Error(`Errors accordion group must preserve numeric alias ${numericPath}.`);
  }

  if (getSamplePagesChildRouteGroup(numericPath) !== 'errors') {
    throw new Error(`Numeric error alias ${numericPath} must be detected as the Errors group.`);
  }

  expectRouteOpenAccordionGroups(numericPath, ['pages', 'errors']);
}

if (!actualNumericAliases.includes(SAMPLE_ERROR_MAINTENANCE_ALIAS_PATH)) {
  throw new Error(
    `Errors accordion group must preserve alias ${SAMPLE_ERROR_MAINTENANCE_ALIAS_PATH}.`
  );
}

expectRouteOpenAccordionGroups(SAMPLE_ERROR_MAINTENANCE_ALIAS_PATH, ['pages', 'errors']);

expectSidebarOpenAccordionGroups(
  ['pages', 'auth', 'errors'],
  getSampleRouteOpenAccordionGroups(SAMPLE_SIGN_IN_PATH),
  ['pages', 'auth']
);
expectSidebarOpenAccordionGroups(
  ['pages', 'auth', 'errors'],
  getSampleRouteOpenAccordionGroups(SAMPLE_ERROR_NOT_FOUND_PATH),
  ['pages', 'errors']
);
expectSidebarOpenAccordionGroups(
  ['pages', 'auth', 'errors'],
  getSampleRouteOpenAccordionGroups(SAMPLE_ERROR_404_PATH),
  ['pages', 'errors']
);
expectSidebarOpenAccordionGroups(
  ['pages', 'auth', 'errors'],
  getSampleRouteOpenAccordionGroups(SAMPLE_DASHBOARD_PATH),
  ['pages', 'auth', 'errors']
);

for (const nonChildPath of [SAMPLE_DASHBOARD_PATH, '/sample/auth', '/sample/errors'] as const) {
  if (getSamplePagesChildRouteGroup(nonChildPath) !== undefined) {
    throw new Error(`Non-child route ${nonChildPath} must not be detected as a Pages child group.`);
  }
}

expectRouteOpenAccordionGroups(SAMPLE_DASHBOARD_PATH, ['pages']);
expectRouteOpenAccordionGroups('/sample/auth', []);
expectRouteOpenAccordionGroups('/sample/errors', []);
