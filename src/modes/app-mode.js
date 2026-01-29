'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const logger = require('../utils/logger');
const { BUNDLE_EXT } = require('../utils/file-utils');

const findSourceFiles = async (nodeModulesPath, dep) => {
  const basePath = path.join(nodeModulesPath, dep);
  const files = [];

  const iifeFile = path.join(basePath, `${dep}${BUNDLE_EXT.iife}`);
  const mjsFile = path.join(basePath, `${dep}${BUNDLE_EXT.lib}`);

  try {
    await fs.access(iifeFile);
    files.push({ path: iifeFile, name: `${dep}${BUNDLE_EXT.iife}` });
  } catch {
    // IIFE file doesn't exist, continue
  }

  try {
    await fs.access(mjsFile);
    files.push({ path: mjsFile, name: `${dep}${BUNDLE_EXT.symlinked}` });
  } catch {
    // MJS file doesn't exist, continue
  }

  return files;
};

const executeAppMode = async (config) => {
  const dependencies = config.order;
  const targetDir = config.appStaticDir;

  try {
    await fs.mkdir(targetDir, { recursive: true });

    for (const dep of dependencies) {
      if (typeof dep !== 'string' || !dep.trim()) continue;

      const sourceFiles = await findSourceFiles(config.nodeModulesPath, dep);

      if (sourceFiles.length === 0) {
        logger.error(
          `No ${BUNDLE_EXT.iife} or ${BUNDLE_EXT.lib} file found for: ${dep}`,
        );
        continue;
      }

      for (const sourceFile of sourceFiles) {
        const linkPath = path.join(targetDir, sourceFile.name);

        try {
          await fs.rm(linkPath, { force: true });

          await fs.symlink(
            path.relative(path.dirname(linkPath), sourceFile.path),
            linkPath,
            'file',
          );

          logger.info(`Linked: ${sourceFile.path} -> ${linkPath}`);
        } catch (error) {
          logger.error(`Error linking ${dep}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error in processLinks: ${error.message}`);
    throw error;
  }
};

module.exports = { executeAppMode };
