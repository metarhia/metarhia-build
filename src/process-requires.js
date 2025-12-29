/* eslint-disable max-len */
'use strict';
const { builtinModules } = require('node:module');

const nodeBuiltins = new Set(
  builtinModules
    .map((name) => (name.startsWith('node:') ? name.slice(5) : name))
    .filter(Boolean),
);

const parseDestructuringBindings = (bindings) => {
  const parts = bindings
    .split(',')
    .map((p) => p.trim())
    .map((part) => {
      // Remove default values: { a = 1 }
      const localName = part.split('=')[0].trim();
      if (localName === '') return part;

      // Support simple renames: { a: b }
      const colonIndex = localName.indexOf(':');
      if (colonIndex !== -1) {
        return localName.slice(0, colonIndex).trim();
      }

      // Ignore rest properties: { ...rest }
      if (localName.startsWith('...')) return '';

      return localName;
    })
    .filter(Boolean);

  return parts;
};

const ensureImportEntry = (importsBySpecifier, specifier) => {
  let entry = importsBySpecifier.get(specifier);
  if (!entry) {
    entry = {
      defaultNames: new Set(),
      named: new Set(),
      sideEffect: false,
    };
    importsBySpecifier.set(specifier, entry);
  }
  return entry;
};

const addDefaultImport = (importsBySpecifier, specifier, localName) => {
  const entry = ensureImportEntry(importsBySpecifier, specifier);
  entry.defaultNames.add(localName);
};

const addNamedImport = (importsBySpecifier, specifier, localName) => {
  const entry = ensureImportEntry(importsBySpecifier, specifier);
  entry.named.add(localName);
};

const addSideEffectImport = (importsBySpecifier, specifier) => {
  const entry = ensureImportEntry(importsBySpecifier, specifier);
  entry.sideEffect = true;
};

const requireDestructuringPattern =
  /^\s*(?:const|let|var)\s*\{\s*([^}]+)\s*\}\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*$/;
const requireAssignmentPattern =
  /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*$/;
const requireSideEffectPattern =
  /^\s*require\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*$/;

const importDestructuringPattern =
  /^\s*import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/;
const importAssignmentPattern =
  /^\s*import\s+([A-Za-z_$][\w$]*)\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/;

const processLine = (filename, lineNumber, line, importsBySpecifier) => {
  const hasDeps = line.includes('require(') || line.includes('import ');
  if (!hasDeps) return { keepLine: true };

  const destructuringMatch = line.match(requireDestructuringPattern);
  const assignmentMatch = line.match(requireAssignmentPattern);
  const sideEffectMatch = line.match(requireSideEffectPattern);
  const importDestructuringMatch = line.match(importDestructuringPattern);
  const importAssignmentMatch = line.match(importAssignmentPattern);

  const specifier =
    destructuringMatch?.[2] ||
    assignmentMatch?.[2] ||
    sideEffectMatch?.[1] ||
    importDestructuringMatch?.[2] ||
    importAssignmentMatch?.[2];

  if (!specifier) {
    console.info(
      `\x1b[33mCaution: Unsupported require() usage in ${filename}:${lineNumber}: ${line.trim()}`,
    );
    return { keepLine: true };
  }

  if (specifier.startsWith('node:')) {
    console.error(
      `\x1b[31mError: Node built-in require is not allowed in bundle sources: ${filename}:${lineNumber}: ${line.trim()}`,
    );
    return { keepLine: false };
  }

  if (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('../../')
  ) {
    return { keepLine: false };
  }

  if (nodeBuiltins.has(specifier)) {
    console.info(
      `\x1b[33mCaution: Node built-in module imported from bundle source: ${filename}:${lineNumber}: ${specifier}`,
    );
    return { keepLine: false };
  }

  if (destructuringMatch) {
    const bindings = parseDestructuringBindings(destructuringMatch[1]);
    if (bindings.length === 0) return { keepLine: false };
    for (const localName of bindings) {
      addNamedImport(importsBySpecifier, specifier, localName);
    }
    return { keepLine: false };
  }

  if (assignmentMatch) {
    addDefaultImport(importsBySpecifier, specifier, assignmentMatch[1]);
    return { keepLine: false };
  }

  if (sideEffectMatch) {
    addSideEffectImport(importsBySpecifier, specifier);
    return { keepLine: false };
  }

  if (importDestructuringMatch) {
    const bindings = parseDestructuringBindings(importDestructuringMatch[1]);
    if (bindings.length === 0) return { keepLine: false };
    for (const localName of bindings) {
      addNamedImport(importsBySpecifier, specifier, localName);
    }
    return { keepLine: false };
  }

  if (importAssignmentMatch) {
    addDefaultImport(importsBySpecifier, specifier, importAssignmentMatch[1]);
    return { keepLine: false };
  }

  console.info(
    `\x1b[33mCaution: Unsupported require() usage in ${filename}:${lineNumber}: ${line.trim()}`,
  );

  return { keepLine: false };
};

const renderImportsBlock = (importsBySpecifier) => {
  if (importsBySpecifier.size === 0) return '';
  const lines = [];

  for (const [specifier, entry] of importsBySpecifier.entries()) {
    if (entry.sideEffect) lines.push(`import '${specifier}';`);

    const namedParts = [];
    for (const [imported, local] of entry.named.entries()) {
      namedParts.push(
        imported === local ? imported : `${imported} as ${local}`,
      );
    }

    if (entry.defaultNames.size === 0 && namedParts.length === 0) continue;

    if (entry.defaultNames.size <= 1) {
      const defaultName =
        entry.defaultNames.size === 1 ? [...entry.defaultNames][0] : null;
      if (defaultName && namedParts.length > 0) {
        lines.push(
          `import ${defaultName}, { ${namedParts.join(', ')} } from '${specifier}';`,
        );
      } else if (defaultName) {
        lines.push(`import ${defaultName} from '${specifier}';`);
      } else {
        lines.push(`import { ${namedParts.join(', ')} } from '${specifier}';`);
      }
      continue;
    }

    // Multiple different default bindings for the same specifier can't be merged safely.
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
  processLine,
  renderImportsBlock,
};
