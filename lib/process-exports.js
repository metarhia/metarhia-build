'use strict';

const MODULE_EXPORTS_PATTERN =
  /module\.exports\s*=\s*(\{([\s\S]+?)\}|(\w+));?\s*$/m;

const splitExports = (exports) =>
  exports
    .split(',')
    .map((line) => line.trim())
    .filter((line) => line !== '');

const transformToESM = (identifier, exports) => {
  if (identifier) return `export { ${identifier} };`;

  const exportNames = splitExports(exports);
  if (exportNames.length === 1) return `export { ${exportNames[0]} };`;

  const exportsList = exportNames.map((name) => `  ${name}`).join(',\n');
  return `export {\n${exportsList},\n};`;
};

const transformToESMExport = (content) =>
  content.replace(
    new RegExp(MODULE_EXPORTS_PATTERN, 'gm'),
    (match, fullMatch, exports, identifier) =>
      transformToESM(identifier, exports),
  );

module.exports = {
  transformToESMExport,
};
