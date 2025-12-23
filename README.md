# Metarhia Module Builder

[![ci status](https://github.com/metarhia/metarhia-build/workflows/Testing%20CI/badge.svg)](https://github.com/metarhia/metarhia-build/actions?query=workflow%3A%22Testing+CI%22+branch%3Amaster)
[![snyk](https://snyk.io/test/github/metarhia/metarhia-build/badge.svg)](https://snyk.io/test/github/metarhia/metarhia-build)
[![npm version](https://badge.fury.io/js/metarhia-build.svg)](https://badge.fury.io/js/metarhia-build)
[![npm downloads/month](https://img.shields.io/npm/dm/metarhia-build.svg)](https://www.npmjs.com/package/metarhia-build)
[![npm downloads](https://img.shields.io/npm/dt/metarhia-build.svg)](https://www.npmjs.com/package/metarhia-build)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/metarhia-build/blob/master/LICENSE)

## Usage

1. Installation

```bash
npm install --save-dev metarhia-build
```

2. Create a `build.json` file in your project root with the order of files to bundle:

```json
{
  "order": ["error.js", "strings.js", "array.js", "async.js"]
}
```

2. Ensure you have a `lib/` directory with the source files listed in `build.json`

3. Add a build script to your `package.json`:

```json
"scripts": {
  "build": "metarhia-build"
}
```

4. Configure ESLint to treat the generated `.mjs` file as an ES module. Add to your `eslint.config.js`:

```js
module.exports = [
  // your existing config
  {
    files: ['*.mjs'], // or use your specific package name
    languageOptions: {
      sourceType: 'module',
    },
  },
];
```

5. Run the build process:

```bash
npm run build
```

This will:

- Read files from `lib/` directory in the order specified in `build.json`
- Convert CommonJS `module.exports` to ES6 `export` statements
- Remove `'use strict'` declarations
- Remove internal submodules `require()` calls
- Bundle everything into `modulename.mjs` with a header containing version and license information

## License & Contributors

Copyright (c) 2025 [Metarhia contributors](https://github.com/metarhia/metarhia-build/graphs/contributors).
Metarhia-build is [MIT licensed](./LICENSE).\
Metarhia-build is a part of [Metarhia](https://github.com/metarhia) technology stack.
