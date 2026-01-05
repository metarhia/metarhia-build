'use strict';

const { resolveFilePath, readFileSync } = require('../utils/file-utils');
const {
  processImports,
  generateImportStatements,
} = require('../transforms/imports');
const {
  transformExports,
  extractExportNames,
  removeExports,
} = require('../transforms/exports');
const { generateBundleHeader, wrapInRegion } = require('./regions');

class Bundler {
  constructor(config, packageJson, license) {
    this.config = config;
    this.packageJson = packageJson;
    this.license = license;
    this.importRegistry = new Map();
    this.exportNames = [];
  }

  processFile(filename) {
    const filePath = resolveFilePath(
      this.config.cwd,
      this.config.libDir,
      filename,
    );
    let content = readFileSync(filePath, `processing ${filename}`);

    content = content.replace(`'use strict';\n\n`, '');
    content = processImports(content, filename, this.importRegistry);

    if (this.config.mode === 'iife') {
      const names = extractExportNames(content);
      this.exportNames.push(...names);
      content = removeExports(content);
    } else {
      content = transformExports(content, this.config.mode);
    }

    return content;
  }

  generateBundle() {
    const header = generateBundleHeader(
      this.packageJson,
      this.license.licenseName,
      this.license.copyrightLine,
    );

    const chunks = this.config.order.map((filename) => {
      const content = this.processFile(filename);
      return wrapInRegion(filename, content);
    });

    const importsBlock = generateImportStatements(this.importRegistry);
    const bundleContent = chunks.join('\n').replaceAll('\n\n\n', '\n\n');

    return {
      header,
      importsBlock,
      bundleContent,
      importRegistry: this.importRegistry,
      exportNames: this.exportNames,
    };
  }
}

module.exports = { Bundler };
