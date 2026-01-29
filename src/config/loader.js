'use strict';

const {
  readJsonSync,
  fileExists,
  readFileSync,
  resolveFilePath,
} = require('../utils/file-utils');
const { validateConfig } = require('./schema');
const logger = require('../utils/logger');

const loadConfig = (configPath, cwd, override) => {
  const fullConfigPath = resolveFilePath(cwd, configPath);

  if (!fileExists(fullConfigPath)) {
    logger.error(`Configuration file not found: ${fullConfigPath}`);
    process.exit(1);
  }

  Object.keys(override).forEach((key) => {
    if (!override[key]) delete override[key];
  });
  const buildConfig = readJsonSync(fullConfigPath, 'build configuration');
  const config = { ...buildConfig, ...override };
  validateConfig(config, fullConfigPath);

  const defaults = {
    // read from config file
    mode: 'lib',
    libDir: 'lib',
    licensePath: 'LICENSE',
    appStaticDir: 'application/static',
    outputDir: cwd,
    // runtime or constants
    cwd,
    nodeModulesPath: 'node_modules',
  };

  const finalConfig = { ...defaults, ...config };

  return finalConfig;
};

const loadPackageJson = (cwd) => {
  const packageJsonPath = resolveFilePath(cwd, 'package.json');

  if (!fileExists(packageJsonPath)) {
    logger.error(`package.json not found in: ${cwd}`);
    process.exit(1);
  }

  return readJsonSync(packageJsonPath, 'package.json');
};

const loadLicense = (cwd, licensePath) => {
  const fullLicensePath = resolveFilePath(cwd, licensePath);

  if (!fileExists(fullLicensePath)) {
    logger.warn(`License file not found: ${fullLicensePath}`);
    return { licenseName: 'Unknown License', copyrightLine: '' };
  }

  const licenseText = readFileSync(fullLicensePath, 'license file');
  const licenseLines = licenseText.split('\n');

  return {
    licenseName: licenseLines[0] || 'Unknown License',
    copyrightLine: licenseLines[2] || '',
  };
};

const validateSourceFiles = (sourceFiles, libDir, cwd) => {
  const missingFiles = [];

  for (const filename of sourceFiles) {
    const filePath = resolveFilePath(cwd, libDir, filename);
    if (!fileExists(filePath)) {
      missingFiles.push(filename);
    }
  }

  if (missingFiles.length > 0) {
    logger.error('Source files not found in lib directory:');
    missingFiles.forEach((file) => logger.error(`  - ${file}`));
    process.exit(1);
  }
};

module.exports = {
  loadConfig,
  loadPackageJson,
  loadLicense,
  validateSourceFiles,
};
