'use strict';

const { builtinModules } = require('node:module');
const logger = require('../utils/logger');

const NODE_BUILTINS = new Set(
  builtinModules
    .map((name) => (name.startsWith('node:') ? name.slice(5) : name))
    .filter(Boolean),
);

const IMPORT_PATTERNS = {
  REQUIRE_DESTRUCTURING: new RegExp(
    '(?:const|let|var)\\s*\\{([^}]+)\\}\\s*=\\s*' +
      'require\\(\\s*[\'"]([^\'"]+)[\'"]\\s*\\);?',
    'g',
  ),
  REQUIRE_ASSIGNMENT: new RegExp(
    '(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*' +
      'require\\(\\s*[\'"]([^\'"]+)[\'"]\\s*\\);?',
    'g',
  ),
  REQUIRE_SIDE_EFFECT: /^require\(\s*['"]([^'"]+)['"]\s*\);?\s*$/gm,
  IMPORT_DESTRUCTURING: new RegExp(
    'import\\s*\\{([^}]+)\\}\\s*from\\s*[\'"]([^\'"]+)[\'"];?',
    'g',
  ),
  IMPORT_ASSIGNMENT: new RegExp(
    'import\\s+([A-Za-z_$][\\w$]*)\\s*from\\s*[\'"]([^\'"]+)[\'"];?',
    'g',
  ),
};

const parseDestructuringBindings = (bindings) => {
  const parts = bindings
    .split(',')
    .map((p) => p.trim())
    .map((part) => {
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

const ensureImportEntry = (importRegistry, specifier) => {
  let entry = importRegistry.get(specifier);
  if (!entry) {
    entry = {
      defaultNames: new Set(),
      named: new Set(),
      sideEffect: false,
    };
    importRegistry.set(specifier, entry);
  }
  return entry;
};

const addDefaultImport = (importRegistry, specifier, localName) => {
  const entry = ensureImportEntry(importRegistry, specifier);
  entry.defaultNames.add(localName);
};

const addNamedImport = (importRegistry, specifier, localName) => {
  const entry = ensureImportEntry(importRegistry, specifier);
  entry.named.add(localName);
};

const addSideEffectImport = (importRegistry, specifier) => {
  const entry = ensureImportEntry(importRegistry, specifier);
  entry.sideEffect = true;
};

const isRelativePath = (specifier) =>
  specifier.startsWith('./') ||
  specifier.startsWith('../') ||
  specifier.startsWith('../../');

const validateSpecifier = (specifier, filename, lineNumber, line) => {
  if (specifier.startsWith('node:')) {
    const msg =
      `Node built-in require is not allowed in bundle sources: ` +
      `${filename}:${lineNumber}: ${line.trim()}`;
    logger.error(msg);
    return { valid: false, shouldKeep: false, isExternal: false };
  }

  if (isRelativePath(specifier)) {
    return { valid: true, shouldKeep: false, isExternal: false };
  }

  if (NODE_BUILTINS.has(specifier)) {
    const msg =
      `Node built-in module imported from bundle source: ` +
      `${filename}:${lineNumber}: ${specifier}`;
    logger.warn(msg);
    return { valid: true, shouldKeep: false, isExternal: false };
  }

  return { valid: true, shouldKeep: false, isExternal: true };
};

const processMatch = (patternName, match, filename, importRegistry) => {
  let specifier, bindings, localName;

  switch (patternName) {
    case 'REQUIRE_DESTRUCTURING':
    case 'IMPORT_DESTRUCTURING':
      bindings = match[1];
      specifier = match[2];
      break;
    case 'REQUIRE_ASSIGNMENT':
    case 'IMPORT_ASSIGNMENT':
      localName = match[1];
      specifier = match[2];
      break;
    case 'REQUIRE_SIDE_EFFECT':
      specifier = match[1];
      break;
  }

  const validation = validateSpecifier(specifier, filename, 0, match[0]);
  if (!validation.valid) return;

  if (isRelativePath(specifier) || !validation.isExternal) return;

  if (patternName.includes('DESTRUCTURING')) {
    const parsedBindings = parseDestructuringBindings(bindings);
    for (const name of parsedBindings) {
      addNamedImport(importRegistry, specifier, name);
    }
  } else if (patternName.includes('ASSIGNMENT')) {
    addDefaultImport(importRegistry, specifier, localName);
  } else if (patternName === 'REQUIRE_SIDE_EFFECT') {
    addSideEffectImport(importRegistry, specifier);
  }
};

const processImports = (content, filename, importRegistry) => {
  let result = content;

  for (const [patternName, pattern] of Object.entries(IMPORT_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      processMatch(patternName, match, filename, importRegistry);
    }
    result = result.replace(pattern, '');
  }

  return result.replace(/^\s*[\r\n]+/gm, (m) => {
    const lines = m.split(/\r?\n/).filter((l) => l.trim() !== '');
    return lines.length ? lines.join('\n') + '\n' : '';
  });
};

const generateImportStatements = (importRegistry) => {
  if (importRegistry.size === 0) return '';
  const lines = [];

  for (const [specifier, entry] of importRegistry.entries()) {
    if (entry.sideEffect) lines.push(`import '${specifier}';`);

    const namedParts = Array.from(entry.named);

    if (entry.defaultNames.size === 0 && namedParts.length === 0) continue;

    if (entry.defaultNames.size <= 1) {
      const defaultName =
        entry.defaultNames.size === 1 ? [...entry.defaultNames][0] : null;
      if (defaultName && namedParts.length > 0) {
        const stmt =
          `import ${defaultName}, { ${namedParts.join(', ')} } ` +
          `from '${specifier}';`;
        lines.push(stmt);
      } else if (defaultName) {
        lines.push(`import ${defaultName} from '${specifier}';`);
      } else {
        lines.push(`import { ${namedParts.join(', ')} } from '${specifier}';`);
      }
      continue;
    }

    for (const defaultName of entry.defaultNames) {
      lines.push(`import ${defaultName} from '${specifier}';`);
    }
    if (namedParts.length > 0) {
      lines.push(`import { ${namedParts.join(', ')} } from '${specifier}';`);
    }
  }

  return lines.join('\n') + '\n\n';
};

module.exports = {
  processImports,
  generateImportStatements,
};
