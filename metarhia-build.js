#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { between } = require('metautil');

const isBuiltin = (p) => p.startsWith('node:');
const isInternal = (p) => p.startsWith('.');
const trim = (s) => s.trim();
const notEmpty = (s) => s.length > 0;

const parseRequireCalls = (source) => {
  const requires = [];
  let body = source;
  let reqPos = body.indexOf(`require('`);
  while (reqPos !== -1) {
    const namesBlock = body.slice(0, reqPos);
    const reqEnd = body.indexOf(';', reqPos) + 1;
    const requireBlock = body.slice(reqPos, reqEnd);
    const modulePath = between(requireBlock, `'`, `'`);
    const identifiers = between(namesBlock, '{', '}');
    body = body.slice(reqEnd);
    if (identifiers) {
      const names = identifiers.split(',').map(trim).filter(notEmpty);
      requires.push({ modulePath, names });
    }
    reqPos = body.indexOf(`require('`);
  }
  return { requires, body };
};

const parseExports = (content) => {
  const idx = content.indexOf('module.exports');
  if (idx === -1) return { names: [], body: content };
  const start = content.lastIndexOf('\n', idx) + 1;
  const afterEq = content.indexOf('=', idx) + 2;
  const closeBracePos = content.indexOf('}', afterEq);
  const inner = between(content.slice(afterEq), '{', '}');
  const names = inner.split(',').map(trim).filter(notEmpty);
  let end = closeBracePos + 1;
  if (content[end] === ';') end++;
  if (content[end] === '\n') end++;
  const body = content.slice(0, start) + content.slice(end);
  return { names, body };
};

const processFile = (libDir, filename) => {
  const filePath = path.join(libDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  const strictPrefix = `'use strict';\n`;
  if (content.startsWith(strictPrefix)) {
    content = content.slice(strictPrefix.length);
    if (content.startsWith('\n')) content = content.slice(1);
  }
  const { requires, body: noRequires } = parseRequireCalls(content);
  const { names: exportNames, body: noExports } = parseExports(noRequires);
  const externals = new Map();
  for (const { modulePath, names } of requires) {
    if (!isBuiltin(modulePath) && !isInternal(modulePath)) {
      if (!externals.has(modulePath)) externals.set(modulePath, new Set());
      for (const name of names) externals.get(modulePath).add(name);
    }
  }
  let body = noExports;
  while (body.startsWith('\n')) body = body.slice(1);
  body = body.trimEnd();
  return { body, exportNames, externals };
};

const build = (cwd) => {
  const { order } = require(path.resolve(cwd, 'build.json'));
  const { name } = require(path.resolve(cwd, 'package.json'));
  const packageName = name.split('/').pop();
  const outputFile = path.join(cwd, `${packageName}.mjs`);
  const libDir = path.join(cwd, 'lib');
  const processedFiles = [];
  const externals = new Map();
  for (const filename of order) {
    const result = processFile(libDir, filename);
    processedFiles.push({ filename, ...result });
    for (const [pkg, names] of result.externals) {
      if (!externals.has(pkg)) externals.set(pkg, new Set());
      for (const name of names) externals.get(pkg).add(name);
    }
  }
  let output = '';
  if (externals.size > 0) {
    for (const [pkg, names] of externals) {
      output += `import { ${[...names].join(', ')} } from './${pkg}.js';\n`;
    }
    output += '\n';
  }
  for (const { filename, body } of processedFiles) {
    output += `// ${filename}\n\n${body}\n\n`;
  }
  const exports = processedFiles.flatMap((f) => f.exportNames);
  if (exports.length > 0) {
    output += 'export {\n';
    for (const name of exports) output += `  ${name},\n`;
    output += '};\n';
  }
  fs.writeFileSync(outputFile, output, 'utf8');
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
      const pkgJson = require(path.resolve(pkgDir, 'package.json'));
      packageName = pkgJson.name.split('/').pop();
    } catch {
      continue;
    }
    const sourceName = `${packageName}.mjs`;
    const sourceFile = path.join(pkgDir, sourceName);
    if (!fs.existsSync(sourceFile)) {
      console.log(`Skip ${packageName}: ${sourceName} not found.`);
      continue;
    }
    const linkName = `${packageName}.js`;
    const linkPath = path.join(targetDir, linkName);
    if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
    fs.symlinkSync(path.resolve(sourceFile), linkPath);
    console.log(`Linked: ${linkName} -> ${path.relative(cwd, sourceFile)}`);
  }
};

const main = () => {
  const cwd = process.cwd();
  const mode = process.argv[2];
  try {
    if (mode === 'link') {
      const targetPath = process.argv[3] || './application/static';
      link(cwd, targetPath);
    } else {
      build(cwd);
      console.log('Bundle created successfully.');
    }
  } catch (err) {
    console.error(`Build error: ${err.message}`);
    process.exit(1);
  }
};

if (require.main === module) main();

module.exports = { build, link };
