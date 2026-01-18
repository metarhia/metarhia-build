'use strict';

const { writeFileSync, resolveFilePath } = require('../utils/file-utils');
const logger = require('../utils/logger');
const { Bundler } = require('../bundler/bundler');
const { transformToIIFEExport } = require('../transforms/exports');
const { BUNDLE_EXT, GENERATED_BY } = require('../utils/file-utils');

const toIIFEVarName = (packageName) => packageName.replace(/-/g, '') + 'IIFE';

const generateDependencyMappings = (importRegistry) => {
  if (importRegistry.size === 0) return '';

  const statements = [];

  for (const [specifier, entry] of importRegistry.entries()) {
    const iifeVarName = toIIFEVarName(specifier);

    // Handle destructured imports: const { Entity, Schema } = metalibIIFE;
    if (entry.named.size > 0) {
      const namedParts = Array.from(entry.named).join(', ');
      statements.push(`const { ${namedParts} } = ${iifeVarName};`);
    }

    // Handle default imports: const metalib2 = metalib2IIFE;
    if (entry.defaultNames.size > 0) {
      for (const defaultName of entry.defaultNames) {
        statements.push(`const ${defaultName} = ${iifeVarName};`);
      }
    }
  }

  return statements.join('\n');
};

const generateDependencyValidation = (importRegistry) => {
  if (importRegistry.size === 0) return '';

  const uniqueDeps = Array.from(importRegistry.keys());
  const checks = uniqueDeps.map((dep) => {
    logger.info(
      `IIFE module depends on "${dep}".` +
        ` Ensure importScripts("${dep}.iife.js") in an app before this module.`,
    );
    const iifeVarName = toIIFEVarName(dep);
    return (
      `if (typeof ${iifeVarName} === 'undefined') {\n` +
      `  throw new Error('Dependency "${dep}" is not available. ` +
      `Ensure ${iifeVarName} is loaded either in service worker` +
      `via importScripts("${dep}.iife.js")` +
      `or in main thread via <script src="${dep}.iife.js"></script>` +
      `before this module.');\n` +
      `}`
    );
  });

  return checks.join('\n');
};

const wrapInIIFE = (packageName, content, depsMapping, depsValidation) => {
  const iifeVarName = toIIFEVarName(packageName);

  let iifeBody = '';

  if (depsValidation) {
    iifeBody += depsValidation + '\n';
  }

  if (depsMapping) {
    iifeBody += depsMapping + '\n';
  }

  iifeBody += content;

  return (
    `const ${iifeVarName} = (function (exports) {\n` +
    iifeBody +
    '\nreturn exports;\n})({});\n'
  );
};

const executeIIFEMode = (config, packageJson, license) => {
  const bundler = new Bundler(config, packageJson, license);
  const { header, bundleContent, importRegistry, exportNames } =
    bundler.generateBundle();

  const packageName = packageJson.name.split('/').pop();

  const depsMapping = generateDependencyMappings(importRegistry);
  const depsValidation = generateDependencyValidation(importRegistry);

  const exportsBlock = transformToIIFEExport(exportNames);
  const combinedContent = bundleContent + '\n' + exportsBlock;
  const iifeContent = combinedContent.replaceAll(/\n{3,}/g, '\n\n');
  const wrapped = wrapInIIFE(
    packageName,
    iifeContent,
    depsMapping,
    depsValidation,
  );

  const content = GENERATED_BY + header + wrapped;
  const outputFile = resolveFilePath(
    config.outputDir,
    `${packageName}${BUNDLE_EXT.iife}`,
  );

  writeFileSync(outputFile, content, 'IIFE bundle output');
  logger.success(`IIFE bundle created: ${outputFile}`);
};

module.exports = { executeIIFEMode };
