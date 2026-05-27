import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { SAMPLE_LOGIN_PATH, SAMPLE_SIGN_IN_PATH } from '../layout/navigation';
import {
  createSampleSignInDemoSubmitHandler,
  toSampleSignInReferenceSubmissionMessage,
} from './sample-auth-copy';
import {
  SAMPLE_SIGN_IN_PASSWORD_MIN_LENGTH,
  sampleSignInSchema,
  sampleSignInValidationMessages,
} from './schema/sign-in-schema';

const validSignInValues = {
  email: ' Name@Example.COM ',
  password: 'password',
};

const parsedValidValues = sampleSignInSchema.safeParse(validSignInValues);

if (!parsedValidValues.success) {
  throw new Error('Sign-in schema must accept a valid email and password.');
}

if (parsedValidValues.data.email !== 'Name@Example.COM') {
  throw new Error('Sign-in schema must trim email input before submit handling.');
}

assertRejectedField(
  { email: '', password: 'password' },
  'email',
  sampleSignInValidationMessages.emailRequired
);
assertRejectedField(
  { email: 'not-an-email', password: 'password' },
  'email',
  sampleSignInValidationMessages.emailInvalid
);
assertOnlyEmailValidationMessage('', sampleSignInValidationMessages.emailRequired);
assertOnlyEmailValidationMessage('not-an-email', sampleSignInValidationMessages.emailInvalid);
assertRejectedField(
  { email: 'name@example.com', password: '' },
  'password',
  sampleSignInValidationMessages.passwordRequired
);
assertRejectedField(
  { email: 'name@example.com', password: ' '.repeat(SAMPLE_SIGN_IN_PASSWORD_MIN_LENGTH) },
  'password',
  sampleSignInValidationMessages.passwordRequired
);
assertRejectedField(
  { email: 'name@example.com', password: 'short' },
  'password',
  sampleSignInValidationMessages.passwordMinLength
);

const submissionMessage = toSampleSignInReferenceSubmissionMessage(parsedValidValues.data);

if (
  submissionMessage !==
  'Local demo sign-in feedback for Name@Example.COM only. No real authentication occurred, no session was created, and no authentication request was sent.'
) {
  throw new Error('Sign-in submission must stay a local UI-only reference with no real auth.');
}

const demoSubmitNotifications: string[] = [];
const demoSubmitHandler = createSampleSignInDemoSubmitHandler((result) => {
  demoSubmitNotifications.push(result.message);
});
const demoSubmitResult = demoSubmitHandler(parsedValidValues.data);

if (demoSubmitResult.kind !== 'demo-only') {
  throw new Error('Sign-in submit handler must explicitly report demo-only execution.');
}

if (demoSubmitResult.message !== submissionMessage) {
  throw new Error('Sign-in submit handler must return the demo-only validation message.');
}

if (demoSubmitNotifications.join('\n') !== submissionMessage) {
  throw new Error('Sign-in submit handler must notify only the demo validation message.');
}

const sampleAuthDirectory = dirname(fileURLToPath(import.meta.url));
const projectSourceDirectory = resolve(sampleAuthDirectory, '../..');
const signInRouteSourcePath = resolve(sampleAuthDirectory, '../../routes/sample/auth/sign-in.tsx');
const loginRouteSourcePath = resolve(sampleAuthDirectory, '../../routes/sample/auth/login.tsx');
const signIn2RouteSourcePath = resolve(
  sampleAuthDirectory,
  '../../routes/sample/auth/sign-in-2.tsx'
);
const signIn2ColumnRouteSourcePath = resolve(
  sampleAuthDirectory,
  '../../routes/sample/auth/sign-in-2-column.tsx'
);
const signInReferenceSourceFiles = collectSampleReferenceSourceFiles([
  signInRouteSourcePath,
  loginRouteSourcePath,
  signIn2RouteSourcePath,
  signIn2ColumnRouteSourcePath,
]);

const forbiddenSourcePatterns = [
  {
    pattern: /(^|\n)\s*['\"]use server['\"]\s*;?/m,
    reason: 'Server action directives are forbidden in sample auth references.',
  },
  {
    pattern: /\bfetch\s*\(/,
    reason: 'Network fetch calls are forbidden in sample auth references.',
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    reason: 'XMLHttpRequest usage is forbidden in sample auth references.',
  },
  {
    pattern: /\bnavigator\.sendBeacon\s*\(/,
    reason: 'Beacon requests are forbidden in sample auth references.',
  },
  {
    pattern: /\bWebSocket\b/,
    reason: 'WebSocket usage is forbidden in sample auth references.',
  },
  {
    pattern: /\bEventSource\b/,
    reason: 'EventSource usage is forbidden in sample auth references.',
  },
  {
    pattern: /\buseMutation\b/,
    reason: 'Mutation hooks are forbidden in sample auth references.',
  },
  {
    pattern: /\bredirect\s*\(/,
    reason: 'Redirect helpers are forbidden in sample sign-in references.',
  },
  {
    pattern: /<Navigate\b/,
    reason: 'Declarative router redirects are forbidden in sample sign-in references.',
  },
  {
    pattern: /\btoast\./,
    reason:
      'Global toast feedback is forbidden; sample sign-in feedback must be component-local UI state.',
  },
  {
    pattern: /\b(?:useNavigate|useRouter)\b/,
    reason: 'Router navigation hooks are forbidden in sample sign-in references.',
  },
  {
    pattern: /\b(?:router\.)?navigate\s*\(/,
    reason: 'Router navigation calls are forbidden in sample sign-in references.',
  },
  {
    pattern: /\b(?:window\.)?history\.(?:pushState|replaceState|go|back|forward)\s*\(/,
    reason: 'Browser history navigation side effects are forbidden in sample sign-in references.',
  },
  {
    pattern: /\b(?:window\.)?location\.(?:assign|replace|reload)\s*\(/,
    reason: 'Location navigation or reload calls are forbidden in sample sign-in references.',
  },
  {
    pattern: /\b(?:window|document)\.location\s*=/,
    reason:
      'Location assignment navigation side effects are forbidden in sample sign-in references.',
  },
  {
    pattern: /\breloadDocument\s*=\s*{?\s*true\s*}?/,
    reason: 'Full document reload navigation is forbidden in sample sign-in references.',
  },
  {
    pattern: /\bmutationFn\b/,
    reason: 'Mutation helpers are forbidden in sample auth references.',
  },
  {
    pattern: /\bmutate(?:Async)?\b/,
    reason: 'Mutation triggers are forbidden in sample auth references.',
  },
  {
    pattern: /\baxios\b/,
    reason: 'Axios usage is forbidden in sample auth references.',
  },
  {
    pattern: /\bky\b/,
    reason: 'ky usage is forbidden in sample auth references.',
  },
  {
    pattern: /<form\b[^>]*\baction\s*=/,
    reason: 'Form action attributes are forbidden in sample auth references.',
  },
  {
    pattern: /<form\b[^>]*\bmethod\s*=\s*{?\s*['\"]post['\"]\s*}?/i,
    reason: 'POST form submissions are forbidden in sample auth references.',
  },
] as const;

for (const filePath of signInReferenceSourceFiles) {
  const source = readFileSync(filePath, 'utf8');

  for (const { pattern, reason } of forbiddenSourcePatterns) {
    if (pattern.test(source)) {
      throw new Error(`${reason} Found in ${filePath}.`);
    }
  }
}

assertSignInRouteSource(signInRouteSourcePath, SAMPLE_SIGN_IN_PATH, '/sample/auth/sign-in');
assertSignInRouteSource(loginRouteSourcePath, SAMPLE_LOGIN_PATH, '/sample/auth/login');
assertLinksDisablePreload(signInReferenceSourceFiles);

function collectSampleReferenceSourceFiles(entryPaths: readonly string[]) {
  const visitedFilePaths = new Set<string>();
  const pendingFilePaths = [...entryPaths];

  while (pendingFilePaths.length > 0) {
    const filePath = pendingFilePaths.pop();

    if (!filePath || visitedFilePaths.has(filePath)) {
      continue;
    }

    visitedFilePaths.add(filePath);

    const sourceFile = parseSourceFile(filePath);

    for (const modulePath of getStaticModulePaths(sourceFile)) {
      const resolvedImportPath = resolveSampleImportPath(filePath, modulePath);

      if (resolvedImportPath && !visitedFilePaths.has(resolvedImportPath)) {
        pendingFilePaths.push(resolvedImportPath);
      }
    }
  }

  return [...visitedFilePaths].sort();
}

function getStaticModulePaths(sourceFile: ts.SourceFile) {
  const modulePaths: string[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
      const moduleSpecifier = statement.moduleSpecifier;

      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        modulePaths.push(moduleSpecifier.text);
      }
    }
  }

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

function parseSourceFile(filePath: string) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

function assertLinksDisablePreload(filePaths: readonly string[]) {
  for (const filePath of filePaths) {
    const sourceFile = parseSourceFile(filePath);

    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName;

        if (ts.isIdentifier(tagName) && tagName.text === 'Link') {
          const preloadAttribute = node.attributes.properties.find(
            (attribute): attribute is ts.JsxAttribute =>
              ts.isJsxAttribute(attribute) &&
              ts.isIdentifier(attribute.name) &&
              attribute.name.text === 'preload'
          );

          if (!preloadAttribute || !isExplicitFalseJsxAttribute(preloadAttribute)) {
            throw new Error(
              `Sample sign-in Link elements must set preload={false} to avoid prefetch-triggered auth flows. Found in ${filePath}.`
            );
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}

function isExplicitFalseJsxAttribute(attribute: ts.JsxAttribute) {
  const initializer = attribute.initializer;

  if (!initializer || !ts.isJsxExpression(initializer)) {
    return false;
  }

  return initializer.expression?.kind === ts.SyntaxKind.FalseKeyword;
}

function assertSignInRouteSource(filePath: string, expectedPath: string, routeLabel: string) {
  const sourceFile = ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const importsSampleSignInPage = sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement)) {
      return false;
    }

    const importPath = statement.moduleSpecifier;
    const importClause = statement.importClause;

    if (!ts.isStringLiteral(importPath) || !importClause?.namedBindings) {
      return false;
    }

    if (importPath.text !== '@/sample/auth/components/sample-sign-in-page') {
      return false;
    }

    if (!ts.isNamedImports(importClause.namedBindings)) {
      return false;
    }

    return importClause.namedBindings.elements.some(
      (element) => element.name.text === 'SampleSignInPage'
    );
  });

  if (!importsSampleSignInPage) {
    throw new Error(`${routeLabel} must import SampleSignInPage directly.`);
  }

  const routeDeclaration = sourceFile.statements.find((statement) => {
    if (!ts.isVariableStatement(statement)) {
      return false;
    }

    const isExported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
    const [declaration] = statement.declarationList.declarations;

    return (
      isExported === true &&
      declaration &&
      ts.isIdentifier(declaration.name) &&
      declaration.name.text === 'Route'
    );
  });

  if (!routeDeclaration || !ts.isVariableStatement(routeDeclaration)) {
    throw new Error(`${routeLabel} must export a Route declaration.`);
  }

  const [declaration] = routeDeclaration.declarationList.declarations;
  const initializer = declaration.initializer;

  if (!initializer || !isCreateFileRouteComponentInitializer(initializer, expectedPath)) {
    throw new Error(`${routeLabel} must create the expected auth route path.`);
  }

  const routeOptions = ts.isCallExpression(initializer) ? initializer.arguments[0] : undefined;

  if (!routeOptions || !ts.isObjectLiteralExpression(routeOptions)) {
    throw new Error(`${routeLabel} must configure route options inline.`);
  }

  const componentProperty = routeOptions.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'component'
  );

  if (!componentProperty || !ts.isPropertyAssignment(componentProperty)) {
    throw new Error(`${routeLabel} must configure a component.`);
  }

  if (!ts.isIdentifier(componentProperty.initializer)) {
    throw new Error(`${routeLabel} component must be a direct SampleSignInPage reference.`);
  }

  if (componentProperty.initializer.text !== 'SampleSignInPage') {
    throw new Error(`${routeLabel} must render the sample sign-in page.`);
  }
}

function isCreateFileRouteComponentInitializer(node: ts.Expression, expectedPath: string) {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const createFileRouteCall = node.expression;

  if (!ts.isCallExpression(createFileRouteCall)) {
    return false;
  }

  if (!ts.isIdentifier(createFileRouteCall.expression)) {
    return false;
  }

  if (createFileRouteCall.expression.text !== 'createFileRoute') {
    return false;
  }

  const routePath = createFileRouteCall.arguments[0];

  return ts.isStringLiteral(routePath) && routePath.text === expectedPath;
}

function assertOnlyEmailValidationMessage(email: string, message: string) {
  const parsedValues = sampleSignInSchema.safeParse({ email, password: 'password' });

  if (parsedValues.success) {
    throw new Error('Sign-in schema must reject invalid email values client-side.');
  }

  const emailMessages = parsedValues.error.issues
    .filter((issue) => issue.path.join('.') === 'email')
    .map((issue) => issue.message);

  if (emailMessages.join('\n') !== message) {
    throw new Error('Sign-in schema must expose exactly one email validation state at a time.');
  }
}

function assertRejectedField(
  values: { email: string; password: string },
  fieldName: 'email' | 'password',
  message: string
) {
  const parsedValues = sampleSignInSchema.safeParse(values);

  if (parsedValues.success) {
    throw new Error(`Sign-in schema must reject invalid ${fieldName} values client-side.`);
  }

  const hasExpectedIssue = parsedValues.error.issues.some(
    (issue) => issue.path.join('.') === fieldName && issue.message === message
  );

  if (!hasExpectedIssue) {
    throw new Error(`Sign-in schema must return the expected ${fieldName} validation message.`);
  }
}
