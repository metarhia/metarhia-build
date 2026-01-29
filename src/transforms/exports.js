'use strict';

const MODULE_EXPORTS_PATTERN =
  /module\.exports\s*=\s*(\{([\s\S]+?)\}|(\w+));?\s*$/m;
const ESM_MODULE_EXPORTS_PATTERN = /export\s*(\{([\s\S]+?)\}|(\w+));?\s*$/m;

const splitExports = (exports) =>
  exports
    .split(',')
    .map((line) => line.trim())
    .filter((line) => line !== '');

const transformToIIFEExport = (exportNames) => {
  if (exportNames.length === 0) return '';
  const exportsLines = exportNames.map((name) => `exports.${name} = ${name};`);
  return exportsLines.join('\n');
};

const transformToESM = (identifier, exports) => {
  if (identifier) return `export { ${identifier} };`;

  const exportNames = splitExports(exports);
  if (exportNames.length === 1) return `export { ${exportNames[0]} };`;

  const exportsList = exportNames.map((name) => `  ${name}`).join(',\n');
  return `export {\n${exportsList},\n};`;
};

const extractExportNames = (content) => {
  const exportNames = [];
  const patterns = [MODULE_EXPORTS_PATTERN, ESM_MODULE_EXPORTS_PATTERN];

  for (const pattern of patterns) {
    const matches = content.matchAll(new RegExp(pattern, 'gm'));
    for (const match of matches) {
      const [, , exports, identifier] = match;
      if (identifier) {
        exportNames.push(identifier);
      } else if (exports) {
        const names = splitExports(exports);
        exportNames.push(...names);
      }
    }
  }

  return exportNames;
};

const removeExports = (content) => {
  let result = content;
  result = result.replace(new RegExp(MODULE_EXPORTS_PATTERN, 'gm'), '');
  result = result.replace(new RegExp(ESM_MODULE_EXPORTS_PATTERN, 'gm'), '');
  return result;
};

const transformToESMExport = (content) =>
  content.replace(
    new RegExp(MODULE_EXPORTS_PATTERN, 'gm'),
    (match, fullMatch, exports, identifier) =>
      transformToESM(identifier, exports),
  );

module.exports = {
  transformToESMExport,
  transformToIIFEExport,
  extractExportNames,
  removeExports,
  MODULE_EXPORTS_PATTERN,
  ESM_MODULE_EXPORTS_PATTERN,
};
