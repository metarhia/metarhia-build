#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { between } = require('metautil');

const isBuiltin = (p) => p.startsWith('node:');
const isInternal = (p) => p.startsWith('.');
const trim = (s) => s.trim();
const notEmpty = (s) => s.length > 0;

const parseRequireCalls = (content) => {
  const requires = [];
  let body = '';
  let pos = 0;
  while (true) {
    const idx = content.indexOf(`require('`, pos);
    if (idx === -1) break;
    const slice = content.slice(idx);
    const modulePath = between(slice, `require('`, `')`);
    if (!modulePath) {
      pos = idx + 1;
      continue;
    }
    const next = content.indexOf('\n', idx);
    const lineEnd = next === -1 ? content.length : next + 1;
    const closeBracePos = content.lastIndexOf('}', idx);
    const openBracePos = content.lastIndexOf('{', closeBracePos);
    const start = content.lastIndexOf('\n', openBracePos) + 1;
    const inner = between(content.slice(start), '{', '}');
    const names = inner.split(',').map(trim).filter(notEmpty);
    requires.push({ modulePath, names });
    body += content.slice(pos, start);
    pos = lineEnd;
  }
  body += content.slice(pos);
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

const processFile = (libDir, filename, buildOrder, processed) => {
  const filePath = path.join(libDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  const strictPrefix = `'use strict';\n`;
  if (content.startsWith(strictPrefix)) {
    content = content.slice(strictPrefix.length);
    if (content.startsWith('\n')) content = content.slice(1);
  }
  const { requires, body: noRequires } = parseRequireCalls(content);
  const { names: exportNames, body: noExports } = parseExports(noRequires);
  const orderSet = new Set(buildOrder);
  const externals = new Map();
  for (const { modulePath, names } of requires) {
    if (isBuiltin(modulePath)) {
      const msg = `Node.js built-in module "${modulePath}" is not allowed`;
      throw new Error(`${msg} in ${filename}`);
    }
    if (isInternal(modulePath)) {
      const basename = path.basename(modulePath);
      if (!orderSet.has(basename)) {
        const msg = `Unknown file "${modulePath}" required`;
        throw new Error(`${msg} in ${filename}`);
      }
      if (!processed.has(basename)) {
        const msg = `Circular dependency: ${filename} requires ${basename}`;
        throw new Error(msg);
      }
    } else {
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
  const allExternals = new Map();
  const processed = new Set();
  for (const filename of order) {
    const result = processFile(libDir, filename, order, processed);
    processed.add(filename);
    processedFiles.push({ filename, ...result });
    for (const [pkg, names] of result.externals) {
      if (!allExternals.has(pkg)) allExternals.set(pkg, new Set());
      for (const name of names) allExternals.get(pkg).add(name);
    }
  }
  let output = '';
  if (allExternals.size > 0) {
    for (const [pkg, names] of allExternals) {
      output += `import { ${[...names].join(', ')} } from './${pkg}.js';\n`;
    }
    output += '\n';
  }
  for (const { filename, body } of processedFiles) {
    output += `// ${filename}\n\n${body}\n\n`;
  }
  const allExportNames = processedFiles.flatMap((f) => f.exportNames);
  if (allExportNames.length > 0) {
    output += 'export {\n';
    for (const name of allExportNames) output += `  ${name},\n`;
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
