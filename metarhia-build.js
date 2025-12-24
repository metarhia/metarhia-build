#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const cwd = process.cwd();
const buildConfigPath = path.join(cwd, 'build.json');
const buildConfigContent = fs.readFileSync(buildConfigPath, 'utf8');
const buildConfig = JSON.parse(buildConfigContent);
const fileOrder = buildConfig.order;

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

const convertModuleExports = (match, fullMatch, exports, identifier) => {
  if (identifier) return `export { ${identifier} };`;
  const exportNames = exports
    .split(',')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  if (exportNames.length === 1) return `export { ${exportNames[0]} };`;
  const exportsList = exportNames.map((name) => `  ${name}`).join(',\n');
  return `export {\n${exportsList},\n};`;
};

const processFile = (filename) => {
  const filePath = path.join(libDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(`'use strict';\n\n`, '');
  const lines = content.split('\n');
  const filteredLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('require(') || line.includes('import ')) continue;
    filteredLines.push(line);
  }
  content = filteredLines.join('\n');
  content = content.replace(moduleExportsPattern, convertModuleExports);
  return content;
};

const build = () => {
  const header =
    `// ${copyrightLine}\n` +
    `// Version ${packageJson.version} ${packageName} ${licenseName}\n\n`;
  const requiredLibs = (buildConfig.require || [])
    .map((lib) => {
      const fileName = `./node_modules/${lib}/${lib}.mjs`;
      const source = fs.readFileSync(fileName, 'utf8');
      return `//#region ${lib}\n${source}\n//#endregion\n`;
    })
    .join('\n');
  const bundle = [];
  for (const filename of fileOrder) {
    const content = processFile(filename);
    bundle.push(`//#region ${filename}\n`);
    bundle.push(content + '\n');
    bundle.push(`//#endregion\n`);
  }
  const content =
    header + requiredLibs + bundle.join('\n').replaceAll('\n\n\n', '\n\n');
  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`Bundle created: ${outputFile}`);
};

build();
