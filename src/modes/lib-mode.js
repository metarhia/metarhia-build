'use strict';

const { writeFileSync, resolveFilePath } = require('../utils/file-utils');
const logger = require('../utils/logger');
const { Bundler } = require('../bundler/bundler');
const { BUNDLE_EXT, GENERATED_BY } = require('../utils/file-utils');

const executeLibMode = (config, packageJson, license) => {
  const bundler = new Bundler(config, packageJson, license);
  const { header, importsBlock, bundleContent } = bundler.generateBundle();
  const content = GENERATED_BY + '\n' + header + importsBlock + bundleContent;

  const packageName = packageJson.name.split('/').pop();
  const outputFile = resolveFilePath(
    config.outputDir,
    `${packageName}${BUNDLE_EXT.lib}`,
  );

  writeFileSync(outputFile, content, 'bundle output');
  logger.success(`Bundle created: ${outputFile}`);
};

module.exports = { executeLibMode };
