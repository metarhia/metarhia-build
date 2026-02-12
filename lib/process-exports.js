'use strict';

const EXPORT_PATTERNS = [
  {
    type: 'named',
    regex: /module\.exports\s*=\s*\{([\s\S]+?)\};?\s*$/gm,
  },
  {
    type: 'default',
    regex: /module\.exports\s*=\s*(\w+);?\s*$/gm,
  },
];

const splitExportNames = (exports) =>
  exports
    .split(',')
    .map((line) => line.trim())
    .filter(Boolean);

const addExportNames = (names, exportRegistry) => {
  for (const name of names) {
    if (exportRegistry.has(name)) {
      throw new Error(`Duplicate export: ${name}`);
    }
    exportRegistry.add(name);
  }
};

const processExports = (content, exportRegistry) => {
  let result = content;
  for (const { type, regex } of EXPORT_PATTERNS) {
    result = result.replace(regex, (match, captured) => {
      const names = type === 'named' ? splitExportNames(captured) : [captured];
      addExportNames(names, exportRegistry);
      return '\n';
    });
  }
  return result;
};

const generateExportStatements = (exportRegistry) => {
  if (exportRegistry.size === 0) return '';
  const names = Array.from(exportRegistry);
  if (names.length === 1) return `export { ${names[0]} };\n`;
  const exportsList = names.map((name) => `  ${name}`).join(',\n');
  return `export {\n${exportsList},\n};\n`;
};

module.exports = {
  processExports,
  generateExportStatements,
};
