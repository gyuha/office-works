import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sampleErrorsDirectory = dirname(fileURLToPath(import.meta.url));
const maintenanceErrorRouteSourcePath = resolve(
  sampleErrorsDirectory,
  '../../routes/sample/errors/maintenance-error.tsx'
);

if (!existsSync(maintenanceErrorRouteSourcePath)) {
  throw new Error('/sample/errors/maintenance-error route file must exist.');
}

const maintenanceErrorRouteSource = readFileSync(maintenanceErrorRouteSourcePath, 'utf8');
const maintenanceErrorRouteSourceFile = ts.createSourceFile(
  maintenanceErrorRouteSourcePath,
  maintenanceErrorRouteSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

assertImportsNamedBinding(
  maintenanceErrorRouteSourceFile,
  '@/sample/errors/components/sample-error-page',
  'SampleErrorPage'
);
assertImportsNamedBinding(
  maintenanceErrorRouteSourceFile,
  '@/sample/errors/error-page-definitions',
  'sampleMaintenanceErrorPage'
);
assertMaintenanceErrorRouteDeclaration(maintenanceErrorRouteSourceFile);

function assertImportsNamedBinding(
  sourceFile: ts.SourceFile,
  modulePath: string,
  bindingName: string
) {
  const hasNamedImport = sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement)) {
      return false;
    }

    const importPath = statement.moduleSpecifier;
    const namedBindings = statement.importClause?.namedBindings;

    if (!ts.isStringLiteral(importPath) || importPath.text !== modulePath) {
      return false;
    }

    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      return false;
    }

    return namedBindings.elements.some((element) => element.name.text === bindingName);
  });

  if (!hasNamedImport) {
    throw new Error(`Maintenance error route must import ${bindingName} from ${modulePath}.`);
  }
}

function assertMaintenanceErrorRouteDeclaration(sourceFile: ts.SourceFile) {
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
    throw new Error('Maintenance error route must export a Route declaration.');
  }

  const [declaration] = routeDeclaration.declarationList.declarations;
  const initializer = declaration.initializer;

  if (
    !initializer ||
    !isCreateFileRouteInitializer(initializer, '/sample/errors/maintenance-error')
  ) {
    throw new Error('Maintenance error route must create /sample/errors/maintenance-error.');
  }

  const routeOptions = ts.isCallExpression(initializer) ? initializer.arguments[0] : undefined;

  if (!routeOptions || !ts.isObjectLiteralExpression(routeOptions)) {
    throw new Error('Maintenance error route must configure route options inline.');
  }

  const componentProperty = routeOptions.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'component'
  );

  if (!componentProperty || !ts.isPropertyAssignment(componentProperty)) {
    throw new Error('Maintenance error route must configure a component.');
  }

  const componentSource = componentProperty.initializer.getText(sourceFile);

  if (!componentSource.includes('<SampleErrorPage')) {
    throw new Error('Maintenance error route must render SampleErrorPage.');
  }

  if (!componentSource.includes('sampleMaintenanceErrorPage')) {
    throw new Error('Maintenance error route must render the maintenance error page definition.');
  }
}

function isCreateFileRouteInitializer(node: ts.Expression, expectedPath: string) {
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
