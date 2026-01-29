'use strict';

const wrapInRegion = (filename, content) =>
  `//#region ${filename}\n${content}\n//#endregion\n`;

const generateBundleHeader = (packageJson, licenseName, copyrightLine) => {
  const packageName = packageJson.name.split('/').pop();
  return (
    `// ${copyrightLine}\n` +
    `// Version ${packageJson.version} ${packageName} ${licenseName}\n\n`
  );
};

module.exports = {
  generateBundleHeader,
  wrapInRegion,
};
