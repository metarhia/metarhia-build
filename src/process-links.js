'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

/**
 * Creates symlinks for module files from node_modules to a target directory
 * @param {string[]} dependencies - Array of package names to create links for
 * @param {string} [targetDir='application/static'] - Target directory for links
 * @returns {Promise<void>}
 */
async function processLinks(dependencies, targetDir = 'application/static') {
  if (
    !dependencies ||
    !Array.isArray(dependencies) ||
    dependencies.length === 0
  ) {
    return;
  }

  try {
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    for (const dep of dependencies) {
      if (typeof dep !== 'string' || !dep.trim()) continue;

      const sourcePath = path.join('node_modules', dep, `${dep}.mjs`);
      const linkPath = path.join(targetDir, `${dep}.mjs`);

      try {
        // Remove existing link/file if it exists
        try {
          await fs.unlink(linkPath);
        } catch (unlinkError) {
          // Ignore if file doesn't exist
          if (unlinkError.code !== 'ENOENT') throw unlinkError;
        }

        // Create symbolic link
        await fs.symlink(
          path.relative(path.dirname(linkPath), sourcePath),
          linkPath,
          'file',
        );

        console.log(`Linked: ${sourcePath} -> ${linkPath}`);
      } catch (error) {
        console.error(`Error linking ${dep}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in processLinks:', error.message);
    throw error;
  }
}

module.exports = { processLinks };
