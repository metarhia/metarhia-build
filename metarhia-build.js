#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { processLine, renderImportsBlock } = require('./src/process-requires');
const { processLinks } = require('./src/process-links');

const cwd = process.cwd();
// add args
const args = process.argv.slice(2);
const configPath = args[0] || 'build.json';

const buildConfigPath = path.join(cwd, configPath);
const buildConfigContent = fs.readFileSync(buildConfigPath, 'utf8');
const buildConfig = JSON.parse(buildConfigContent);
const fileOrder = buildConfig.order;
const mode = buildConfig.mode || 'lib';
const isIIFE = mode === 'iife';
const isApp = mode === 'app';

const libDir = path.join(cwd, buildConfig.libDir || 'lib');
const packageJsonPath = path.join(cwd, 'package.json');
const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonContent);
const packageName = packageJson.name.split('/').pop();
const outputFile = path.join(cwd, `${packageName}.mjs`);
const licenseText = fs.readFileSync(path.join(cwd, 'LICENSE'), 'utf8');
const licenseLines = licenseText.split('\n');
const licenseName = licenseLines[0];
const copyrightLine = licenseLines[2];

const moduleExportsPattern = /module\.exports\s*=\s*(\{([^}]+)\}|(\w+));?\s*$/m;
const esmModuleExportsPattern = /export\s*(\{([^}]+)\}|(\w+));?\s*$/m;
// const esmModuleExportsPattern = /export\s*\{\s*([\w,\s]+)\s*\};?\s*$/m;

const convertModuleExports = (match, fullMatch, exports, identifier) => {
  const splitExports = () =>
    exports
      .split(',')
      .map((line) => line.trim())
      .filter((line) => line !== '');

  if (isIIFE) {
    if (identifier) return `exports.${identifier} = ${identifier};`;
    const exportNames = splitExports();
    if (exportNames.length === 1) {
      return `exports.${exportNames[0]} = ${exportNames[0]};`;
    }
    const exportsList = exportNames
      .map((name) => `exports.${name} = ${name}`)
      .join(',\n');
    return exportsList;
  }
  if (identifier) return `export { ${identifier} };`;

  const exportNames = splitExports();
  if (exportNames.length === 1) return `export { ${exportNames[0]} };`;
  const exportsList = exportNames.map((name) => `  ${name}`).join(',\n');
  return `export {\n${exportsList},\n};`;
};

const processFile = (filename, importsBySpecifier) => {
  const filePath = path.join(libDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(`'use strict';\n\n`, '');
  const lines = content.split('\n');
  const filteredLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const { keepLine } = processLine(filename, i + 1, line, importsBySpecifier);
    if (!keepLine) continue;

    filteredLines.push(line);
  }
  content = filteredLines.join('\n');
  content = content.replace(moduleExportsPattern, convertModuleExports);
  if (isIIFE) {
    content = content.replace(esmModuleExportsPattern, convertModuleExports);
  }
  return content;
};

const build = () => {
  const header =
    `// ${copyrightLine}\n` +
    `// Version ${packageJson.version} ${packageName} ${licenseName}\n\n`;
  const bundle = [];
  const importsBySpecifier = new Map();

  for (const filename of fileOrder) {
    const content = processFile(filename, importsBySpecifier);
    bundle.push(`//#region ${filename}\n`);
    bundle.push(content + '\n');
    bundle.push(`//#endregion\n`);
  }

  const importsBlock = renderImportsBlock(importsBySpecifier);
  let content = '';
  if (isIIFE) {
    const uniqueDeps = Array.from(new Set(importsBySpecifier.keys()));
    const iifeDeps = uniqueDeps
      .map((lib) => {
        const fileName = `./node_modules/${lib}/${lib}.mjs`;
        const source = fs.readFileSync(fileName, 'utf8');
        return `//#region ${lib}\n${source}\n//#endregion\n`;
      })
      .join('\n');
    const iifeContent =
      iifeDeps.replace(esmModuleExportsPattern, convertModuleExports) +
      bundle.join('\n').replaceAll('\n\n\n', '\n\n');
    content =
      header +
      `var ${packageName.replace(/-/g, '')}IIFE = (function (exports) {\n` +
      iifeContent +
      'return exports; })({});';
  } else {
    content =
      header + importsBlock + bundle.join('\n').replaceAll('\n\n\n', '\n\n');
  }

  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`Bundle created: ${outputFile}`);
};

if (isApp) {
  processLinks(fileOrder);
} else {
  build();
}
