'use strict';

const { Schema } = require('metaschema');
const logger = require('../utils/logger');

const VALID_MODES = ['lib', 'iife', 'app'];

const schema = new Schema('Config', {
  order: { array: 'string' },
  mode: { type: '?enum', enum: VALID_MODES },
  libDir: '?string',
  licensePath: '?string',
  appStaticDir: '?string',
  outputDir: '?string',
});

const validateConfig = (config, configPath) => {
  const result = schema.check(config);
  if (result.errors.length > 0) {
    logger.error(`Invalid configuration in ${configPath}:`);
    result.errors.forEach((err) => logger.error(`  - ${err}`));
    process.exit(1);
  }

  return result.valid;
};

module.exports = {
  validateConfig,
  VALID_MODES,
};
