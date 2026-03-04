'use strict';

const { builtinModules } = require('node:module');

const NODE_BUILTINS = new Set(
  builtinModules
    .map((name) => (name.startsWith('node:') ? name.slice(5) : name))
    .filter(Boolean),
);

const IMPORT_PATTERNS = [
  {
    type: 'named',
    regex: new RegExp(
      '(?:const|let|var)\\s*\\{(?<namedImports>[^}]+)\\}\\s*=\\s*' +
        'require\\(\\s*[\'"](?<specifier>[^\'"]+)[\'"]\\s*\\);?',
      'g',
    ),
  },
  {
    type: 'default',
    regex: new RegExp(
      '(?:const|let|var)\\s+(?<defaultName>[A-Za-z_$][\\w$]*)\\s*=\\s*' +
        'require\\(\\s*[\'"](?<specifier>[^\'"]+)[\'"]\\s*\\);?',
      'g',
    ),
  },
  {
    type: 'sideEffect',
    regex: /^require\(\s*['"](?<specifier>[^'"]+)['"]\s*\);?\s*$/gm,
  },
  {
    type: 'named',
    regex: new RegExp(
      'import\\s*\\{(?<namedImports>[^}]+)\\}\\s*from\\s*' +
        '[\'"](?<specifier>[^\'"]+)[\'"];?',
      'g',
    ),
  },
  {
    type: 'default',
    regex: new RegExp(
      'import\\s+(?<defaultName>[A-Za-z_$][\\w$]*)\\s*from\\s*' +
        '[\'"](?<specifier>[^\'"]+)[\'"];?',
      'g',
    ),
  },
];

const parseNamedImports = (bindings) => {
  const parts = bindings
    .split(',')
    .map((p) => {
      const part = p.trim();
      const localName = part.split('=')[0].trim();
      if (localName === '') return part;

      const colonIndex = localName.indexOf(':');
      if (colonIndex !== -1) {
        return localName.slice(0, colonIndex).trim();
      }

      if (localName.startsWith('...')) return '';

      return localName;
    })
    .filter(Boolean);

  return parts;
};

const isValidSpecifier = (specifier, filename, importStatement) => {
  if (specifier.startsWith('node:') || NODE_BUILTINS.has(specifier)) {
    console.error(
      `Node built-in module is not allowed in bundle sources: ` +
        `${filename}: ${importStatement.trim()}`,
    );
    return false;
  }

  if (specifier.endsWith('.js')) return false;

  return true;
};

const processImports = (content, filename, importRegistry) => {
  let result = content;
  for (const pattern of IMPORT_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    result = result.replace(regex, (match, ...args) => {
      const groups = args[args.length - 1];
      const { specifier, defaultName, namedImports } = groups;

      if (isValidSpecifier(specifier, filename, match)) {
        if (!importRegistry.has(specifier)) {
          importRegistry.set(specifier, {
            defaultNames: new Set(),
            named: new Set(),
            isSideEffect: false,
          });
        }
        const entry = importRegistry.get(specifier);

        if (pattern.type === 'default') {
          entry.defaultNames.add(defaultName);
        } else if (pattern.type === 'sideEffect') {
          entry.isSideEffect = true;
        } else if (pattern.type === 'named') {
          for (const name of parseNamedImports(namedImports)) {
            entry.named.add(name);
          }
        }
      }
      return '\n';
    });
  }
  return result;
};

const generateEntryStatements = (
  specifier,
  { isSideEffect, defaultNames, named },
) => {
  const sideEffect = isSideEffect ? [`import '${specifier}';`] : [];

  const defaultStmts = [...defaultNames].map(
    (name) => `import ${name} from '${specifier}';`,
  );

  const namedStmt = named.size > 0
      ? [`import { ${[...named].join(', ')} } from '${specifier}';`]
      : [];

  return [...sideEffect, ...defaultStmts, ...namedStmt];
};

const generateImportStatements = (importRegistry) => {
  if (importRegistry.size === 0) return '';
  return (
    Array.from(importRegistry.entries())
      .flatMap(([depName, entry]) =>
        generateEntryStatements(`./${depName}.js`, entry),
      )
      .join('\n') + '\n\n'
  );
};

module.exports = {
  processImports,
  generateImportStatements,
};
