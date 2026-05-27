import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  createSampleForgotPasswordDemoSubmitHandler,
  createSampleOtpDemoSubmitHandler,
  createSampleSignIn2DemoSubmitHandler,
  createSampleSignInDemoSubmitHandler,
  createSampleSignUpDemoSubmitHandler,
  sampleAuthDemoSubmissionSafeguards,
  toSampleForgotPasswordReferenceSubmissionMessage,
  toSampleOtpReferenceSubmissionMessage,
  toSampleSignIn2ReferenceSubmissionMessage,
  toSampleSignInReferenceSubmissionMessage,
  toSampleSignUpReferenceSubmissionMessage,
} from './sample-auth-copy';
import { sampleForgotPasswordSchema } from './schema/forgot-password-schema';
import { sampleOtpSchema } from './schema/otp-schema';
import { sampleSignInSchema } from './schema/sign-in-schema';
import { sampleSignUpSchema } from './schema/sign-up-schema';

const sampleAuthDirectory = dirname(fileURLToPath(import.meta.url));
const projectSourceDirectory = resolve(sampleAuthDirectory, '../..');

const validSignInValues = assertParsedValues(
  sampleSignInSchema.safeParse({
    email: 'signin@example.com',
    password: 'password',
  }),
  'Sign-in demo values must pass client-side validation.'
);
const validSignUpValues = assertParsedValues(
  sampleSignUpSchema.safeParse({
    name: 'Ada Lovelace',
    email: 'signup@example.com',
    password: 'password1',
    confirmPassword: 'password1',
  }),
  'Sign-up demo values must pass client-side validation.'
);
const validForgotPasswordValues = assertParsedValues(
  sampleForgotPasswordSchema.safeParse({
    email: 'reset@example.com',
  }),
  'Forgot-password demo values must pass client-side validation.'
);
const validOtpValues = assertParsedValues(
  sampleOtpSchema.safeParse({
    code: '123456',
  }),
  'OTP demo values must pass client-side validation.'
);

assertDemoOnlySubmitHandler(
  'Sign-in',
  createSampleSignInDemoSubmitHandler,
  validSignInValues,
  toSampleSignInReferenceSubmissionMessage(validSignInValues)
);
assertDemoOnlySubmitHandler(
  'Two-column sign-in',
  createSampleSignIn2DemoSubmitHandler,
  validSignInValues,
  toSampleSignIn2ReferenceSubmissionMessage(validSignInValues)
);
assertDemoOnlySubmitHandler(
  'Sign-up',
  createSampleSignUpDemoSubmitHandler,
  validSignUpValues,
  toSampleSignUpReferenceSubmissionMessage(validSignUpValues)
);
assertDemoOnlySubmitHandler(
  'Forgot-password',
  createSampleForgotPasswordDemoSubmitHandler,
  validForgotPasswordValues,
  toSampleForgotPasswordReferenceSubmissionMessage(validForgotPasswordValues)
);
assertDemoOnlySubmitHandler(
  'OTP',
  createSampleOtpDemoSubmitHandler,
  validOtpValues,
  toSampleOtpReferenceSubmissionMessage(validOtpValues)
);

const authReferenceSourceFiles = collectSampleReferenceSourceFiles([
  resolve(sampleAuthDirectory, 'sample-auth-copy.ts'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/forgot-password.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/login.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/otp.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/sign-in-2-column.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/sign-in-2.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/sign-in.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/sign-up.tsx'),
  resolve(sampleAuthDirectory, '../../routes/sample/auth/signup.tsx'),
]);

const forbiddenDemoSubmitSideEffects = [
  {
    pattern: /(^|\n)\s*['"]use server['"]\s*;?/m,
    reason: 'Server action directives are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bfetch\s*\(/,
    reason: 'Network fetch calls are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    reason: 'XMLHttpRequest usage is forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bnavigator\.sendBeacon\s*\(/,
    reason: 'Beacon requests are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bWebSocket\b/,
    reason: 'WebSocket usage is forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bEventSource\b/,
    reason: 'EventSource usage is forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\buseMutation\b/,
    reason: 'Mutation hooks are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\b(?:apiClient|authClient|sessionClient)\b/,
    reason:
      'API/auth/session client references are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\b(?:localStorage|sessionStorage|indexedDB|caches)\b/,
    reason:
      'Persisted browser storage mutations are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bdocument\.cookie\b/,
    reason: 'Cookie/session mutations are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bcreateServerFn\s*\(/,
    reason: 'Server function calls are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\b(?:signIn|signUp|login|logout|authenticate|resetPassword|verifyOtp|verifyOTP)\s*\(/,
    reason: 'Real auth action calls are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bmutationFn\b/,
    reason: 'Mutation helpers are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bmutate(?:Async)?\b/,
    reason: 'Mutation triggers are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\baxios\b/,
    reason: 'Axios usage is forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\bky\b/,
    reason: 'ky usage is forbidden in sample auth demo submit references.',
  },
  {
    pattern: /\buseNavigate\b|\bnavigate\s*\(/,
    reason: 'Navigation side effects are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /<form\b[^>]*\baction\s*=/,
    reason: 'Form action attributes are forbidden in sample auth demo submit references.',
  },
  {
    pattern: /<form\b[^>]*\bmethod\s*=\s*{?\s*['"]post['"]\s*}?/i,
    reason: 'POST form submissions are forbidden in sample auth demo submit references.',
  },
] as const;

const allowedAuthReferencePackageImports = new Set([
  '@faker-js/faker',
  '@hookform/resolvers/zod',
  '@tanstack/react-router',
  'lucide-react',
  'react',
  'react-hook-form',
  'react-i18next',
  'sonner',
  'zod',
]);

const allowedAuthReferenceAliasImportPrefixes = ['@/components/ui/', '@/lib/utils', '@/sample/'];

const expectedDemoSubmissionSafeguards = {
  validationScope: 'client-side-react-hook-form-zod-only',
  createsSession: false,
  callsBackendRoute: false,
  mutatesPersistedData: false,
  triggersRealAuthenticationFlow: false,
} as const;

assertMatchingDemoSubmissionSafeguards();

for (const filePath of authReferenceSourceFiles) {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = parseSourceFile(filePath, source);

  assertNoForbiddenAuthReferenceImports(sourceFile, filePath);

  for (const { pattern, reason } of forbiddenDemoSubmitSideEffects) {
    if (pattern.test(source)) {
      throw new Error(`${reason} Found in ${filePath}.`);
    }
  }
}

function assertParsedValues<T>(
  result: { success: true; data: T } | { success: false },
  reason: string
) {
  if (!result.success) {
    throw new Error(reason);
  }

  return result.data;
}

function collectSampleReferenceSourceFiles(entryPaths: readonly string[]) {
  const visitedFilePaths = new Set<string>();
  const pendingFilePaths = [...entryPaths];

  while (pendingFilePaths.length > 0) {
    const filePath = pendingFilePaths.pop();

    if (!filePath || visitedFilePaths.has(filePath)) {
      continue;
    }

    visitedFilePaths.add(filePath);

    const sourceFile = parseSourceFile(filePath, readFileSync(filePath, 'utf8'));

    for (const modulePath of getStaticModulePaths(sourceFile)) {
      const resolvedModulePath = resolveSampleImportPath(filePath, modulePath);

      if (resolvedModulePath && !visitedFilePaths.has(resolvedModulePath)) {
        pendingFilePaths.push(resolvedModulePath);
      }
    }
  }

  return [...visitedFilePaths].sort();
}

function assertNoForbiddenAuthReferenceImports(sourceFile: ts.SourceFile, filePath: string) {
  for (const modulePath of getStaticModulePaths(sourceFile)) {
    if (isAllowedAuthReferenceImport(modulePath)) {
      continue;
    }

    throw new Error(
      `Auth demo references must not import real auth/session/router-auth/server-action/API client code. Found ${modulePath} in ${filePath}.`
    );
  }
}

function getStaticModulePaths(sourceFile: ts.SourceFile) {
  const modulePaths: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;

      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        modulePaths.push(moduleSpecifier.text);
      }
    }

    if (ts.isImportTypeNode(node)) {
      const argument = node.argument;

      if (ts.isLiteralTypeNode(argument) && ts.isStringLiteral(argument.literal)) {
        modulePaths.push(argument.literal.text);
      }
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;

      if (argument && ts.isStringLiteral(argument)) {
        modulePaths.push(argument.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return modulePaths;
}

function resolveSampleImportPath(fromFilePath: string, importPath: string) {
  if (importPath.startsWith('@/sample/')) {
    return resolveSourceModulePath(resolve(projectSourceDirectory, importPath.slice(2)));
  }

  if (importPath.startsWith('@/routes/sample/')) {
    return resolveSourceModulePath(resolve(projectSourceDirectory, importPath.slice(2)));
  }

  if (importPath.startsWith('.')) {
    const resolvedPath = resolve(dirname(fromFilePath), importPath);

    if (!isSampleReferencePath(resolvedPath)) {
      return undefined;
    }

    return resolveSourceModulePath(resolvedPath);
  }

  return undefined;
}

function isSampleReferencePath(filePath: string) {
  return (
    filePath.startsWith(resolve(projectSourceDirectory, 'sample')) ||
    filePath.startsWith(resolve(projectSourceDirectory, 'routes/sample'))
  );
}

function resolveSourceModulePath(filePathWithoutExtension: string) {
  const candidatePaths = [
    filePathWithoutExtension,
    `${filePathWithoutExtension}.ts`,
    `${filePathWithoutExtension}.tsx`,
    resolve(filePathWithoutExtension, 'index.ts'),
    resolve(filePathWithoutExtension, 'index.tsx'),
  ];

  return candidatePaths.find((candidatePath) => existsSync(candidatePath));
}

function parseSourceFile(filePath: string, source: string) {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function assertMatchingDemoSubmissionSafeguards() {
  for (const [key, expectedValue] of Object.entries(expectedDemoSubmissionSafeguards)) {
    const actualValue =
      sampleAuthDemoSubmissionSafeguards[key as keyof typeof sampleAuthDemoSubmissionSafeguards];

    if (actualValue !== expectedValue) {
      throw new Error(`Auth demo submission safeguard ${key} must be ${String(expectedValue)}.`);
    }
  }
}

function isAllowedAuthReferenceImport(importSource: string) {
  if (allowedAuthReferencePackageImports.has(importSource)) {
    return true;
  }

  if (allowedAuthReferenceAliasImportPrefixes.some((prefix) => importSource.startsWith(prefix))) {
    return true;
  }

  if (importSource.startsWith('.')) {
    return !importSource.includes('../..');
  }

  return false;
}

function assertDemoOnlySubmitHandler<TValues>(
  label: string,
  createHandler: (
    notify: (result: {
      kind: 'demo-only';
      safeguards: typeof sampleAuthDemoSubmissionSafeguards;
      message: string;
      values: TValues;
    }) => void
  ) => (values: TValues) => {
    kind: 'demo-only';
    safeguards: typeof sampleAuthDemoSubmissionSafeguards;
    message: string;
    values: TValues;
  },
  values: TValues,
  expectedMessage: string
) {
  const notifications: string[] = [];
  const handler = createHandler((result) => {
    notifications.push(result.message);
  });
  const result = handler(values);

  if (result.kind !== 'demo-only') {
    throw new Error(`${label} submit handler must explicitly report demo-only execution.`);
  }

  if (result.values !== values) {
    throw new Error(`${label} submit handler must keep the locally validated form values.`);
  }

  if (result.message !== expectedMessage) {
    throw new Error(`${label} submit handler must return only the static demo message.`);
  }

  if (result.safeguards !== sampleAuthDemoSubmissionSafeguards) {
    throw new Error(`${label} submit handler must attach the shared no-side-effects safeguards.`);
  }

  if (notifications.join('\n') !== expectedMessage) {
    throw new Error(`${label} submit handler must notify only the static demo message.`);
  }
}
