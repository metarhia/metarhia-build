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

Only `order` field is required. But you can use other options to customize the build process.
Config options:

```ts
type Mode = 'lib' | 'iife' | 'app';
interface Config {
  order: string[];
  mode?: Mode; // default 'lib'
  libDir?: string; // default 'lib'
  licensePath?: string; // default 'LICENSE'
  appStaticDir?: string; // default 'application/static'
  outputDir?: string; // default current directory
}
```

- Default mode is `lib`. It just concantenate files in the order specified in `build.json` order field. And converts all requires to imports and puts import once at the top of the file.

- When `mode` is `iife`, it will bundle everything into `modulename.iife.js`. This is useful for browser service worker usage - import with `importScripts()`. If a module has a dependency, user must provide it in the app prior to the module import.

- When `mode` is `app`, order field should contain dependency names and thus should be installed and available in `node_modules` directory. Builder will symlink all dependencies from `node_modules` into `appStaticDir` directory (for libs with es and iife - both files will be linked).

```json
{
  "order": ["metaschema", "metaqr", "metautil"]
}
```

2. Ensure you have a `lib/` directory with the source files listed in `build.json` or set valid `libDir` option.

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

Arguments:

- `-c` or `--config` - path to config file
- `-m` or `--mode` - mode to build - overrides mode in config file

```bash
npm run build -- -c ./path/to/build.other.json -m iife
# or
metarhia-build --c ./path/to/build.other.json
# or
metarhia-build --config ./path/to/build.other.json
```

This will:

- Read files from `lib/` (or `libDir` option) directory in the order specified in `build.json` order field.
- Convert `require()` calls to `import` statements
- Convert same `import` or `require` in multiple files to a single import at the top of the file.
- Convert CommonJS `module.exports` to ES6 `export` statements
- Remove `'use strict'` declarations
- Remove internal submodules `require()` or `import` calls
- Bundle everything into `modulename.mjs` (or ouputDir/modulename.mjs) with a header containing version and license information. When `mode` is `iife` bundle name will be `modulename.iife.js`.

## License & Contributors

Copyright (c) 2025 [Metarhia contributors](https://github.com/metarhia/metarhia-build/graphs/contributors).
Metarhia-build is [MIT licensed](./LICENSE).\
Metarhia-build is a part of [Metarhia](https://github.com/metarhia) technology stack.
