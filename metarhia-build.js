#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

const processFile = (libDir, filename) => {
  const filePath = path.join(libDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(`'use strict';\n\n`, '');
  const lines = content.split('\n');
  const filteredLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('require(')) continue;
    filteredLines.push(line);
  }
  content = filteredLines.join('\n');
  content = content.replace(moduleExportsPattern, convertModuleExports);
  return content;
};

const build = (cwd) => {
  const buildConfigPath = path.join(cwd, 'build.json');
  console.log({ buildConfigPath });
  const buildConfigContent = fs.readFileSync(buildConfigPath, 'utf8');
  const buildConfig = JSON.parse(buildConfigContent);
  const fileOrder = buildConfig.order;

  const libDir = path.join(cwd, 'lib');
  const packageJsonPath = path.join(cwd, 'package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);
  const packageName = packageJson.name.split('/').pop();
  const outputFile = path.join(cwd, `${packageName}.mjs`);
  const licenseText = fs.readFileSync(path.join(cwd, 'LICENSE'), 'utf8');
  const licenseLines = licenseText.split('\n');
  const licenseName = licenseLines[0];
  const copyrightLine = licenseLines[2];

  const header =
    `// ${copyrightLine}\n` +
    `// Version ${packageJson.version} ${packageName} ${licenseName}\n\n`;
  const bundle = [];
  for (const filename of fileOrder) {
    const content = processFile(libDir, filename);
    bundle.push(`// ${filename}\n`);
    bundle.push(content + '\n');
  }
  const content = header + bundle.join('\n').replaceAll('\n\n\n', '\n\n');
  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`Bundle created: ${outputFile}`);
};

const link = (cwd, targetPath) => {
  const nodeModulesDir = path.join(cwd, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('No node_modules found.');
    return;
  }

  const targetDir = path.resolve(cwd, targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const packageDirs = [];
  for (const name of fs.readdirSync(nodeModulesDir)) {
    const full = path.join(nodeModulesDir, name);
    if (name.startsWith('@') && fs.statSync(full).isDirectory()) {
      for (const sub of fs.readdirSync(full)) {
        packageDirs.push(path.join(full, sub));
      }
    } else if (fs.statSync(full).isDirectory()) {
      packageDirs.push(full);
    }
  }

  for (const pkgDir of packageDirs) {
    const buildJsonPath = path.join(pkgDir, 'build.json');
    if (!fs.existsSync(buildJsonPath)) continue;

    let packageName;
    try {
      const packageJsonPath = path.join(pkgDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageName = packageJson.name.split('/').pop();
    } catch {
      continue;
    }

    const sourceName = `${packageName}.mjs`;
    const sourceFile = path.join(pkgDir, sourceName);
    if (!fs.existsSync(sourceFile)) {
      console.log(
        `Skip ${packageName}: ${sourceName} not found (run build there first)`,
      );
      continue;
    }

    const linkName = `${packageName}.js`;
    const linkPath = path.join(targetDir, linkName);
    const sourceAbsolute = path.resolve(sourceFile);
    if (fs.existsSync(linkPath)) {
      fs.unlinkSync(linkPath);
    }
    fs.symlinkSync(sourceAbsolute, linkPath);
    console.log(`Linked: ${linkName} -> ${path.relative(cwd, sourceFile)}`);
  }
};

const main = () => {
  const cwd = process.cwd();
  const mode = process.argv[2];
  if (mode === 'link') {
    const targetPath = process.argv[3] || './application/static';
    link(cwd, targetPath);
  } else {
    build(cwd);
  }
};

main();
