#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const {
  loadConfig,
  loadPackageJson,
  loadLicense,
  validateSourceFiles,
} = require('./src/config/loader');
const { modeExecutors } = require('./src/modes');
const logger = require('./src/utils/logger');

const main = async () => {
  const { values: args } = parseArgs({
    options: {
      config: { type: 'string', short: 'c' },
      mode: { type: 'string', short: 'm' },
    },
    allowPositionals: true,
  });

  const cwd = process.cwd();
  const configPath = args.config || 'build.json';
  const configOverride = { mode: args.mode };

  const config = loadConfig(configPath, cwd, configOverride);
  const packageJson = loadPackageJson(cwd);
  const license = loadLicense(cwd, config.licensePath);

  if (['lib', 'iife'].includes(config.mode)) {
    validateSourceFiles(config.order, config.libDir, cwd);
  }

  const executor = modeExecutors[config.mode];
  if (!executor) {
    throw new Error(`Unknown mode: ${config.mode}`);
  }

  await executor(config, packageJson, license);
};

if (!process.stdin.isTTY && process.env.NODE_ENV !== 'test') {
  // Running as a script file or input is redirected
  // Do nothing
  return;
}

main().catch((error) => {
  logger.error(`Build failed: ${error.message}`);
  if (error.stack) {
    logger.error(error.stack);
  }
  process.exit(1);
});
