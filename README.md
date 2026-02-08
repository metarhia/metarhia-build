# Metarhia Module Builder

[![ci status](https://github.com/metarhia/metarhia-build/workflows/Testing%20CI/badge.svg)](https://github.com/metarhia/metarhia-build/actions?query=workflow%3A%22Testing+CI%22+branch%3Amaster)
[![snyk](https://snyk.io/test/github/metarhia/metarhia-build/badge.svg)](https://snyk.io/test/github/metarhia/metarhia-build)
[![npm version](https://badge.fury.io/js/metarhia-build.svg)](https://badge.fury.io/js/metarhia-build)
[![npm downloads/month](https://img.shields.io/npm/dm/metarhia-build.svg)](https://www.npmjs.com/package/metarhia-build)
[![npm downloads](https://img.shields.io/npm/dt/metarhia-build.svg)](https://www.npmjs.com/package/metarhia-build)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/metarhia-build/blob/master/LICENSE)

## Installation

```bash
npm install --save-dev metarhia-build
```

When installed in a project, the `metarhia-build` CLI is available in that project (e.g. via `npx metarhia-build` or via npm scripts).

## Modes

### Mode: lib (building library)

Use in metarhia **libraries** that ship a single bundled `.mjs` file.

1. Create a `build.json` in the project root with the order of files to bundle:

```json
{ "order": ["error.js", "array.js", "async.js"] }
```

2. Put source files in `lib/` as listed in `build.json`.

3. In `package.json` add command:

```json
"scripts": {
  "build": "metarhia-build"
}
```

4. Run: `npm run build`

This will:

- Read files from `lib/` in the order in `build.json`
- Convert CommonJS `module.exports` to ES6 `export` statements
- Remove `'use strict'` and internal `require()` calls
- Write `modulename.mjs` with a version/license header

Optional: configure ESLint for the generated `.mjs` (e.g. `languageOptions.sourceType: 'module'` for `*.mjs`).

### Mode: app (link libraries to static web server folder)

Use in **applications** that depend on packages built with metarhia-build. It scans `node_modules` for packages that have a `build.json`, finds their bundled `.mjs` files, and creates symlinks into a directory (e.g. for static serving).

1. In your app’s `package.json`:

```json
"scripts": {
  "link": "metarhia-build link"
}
```

2. Ensure dependencies that use metarhia-build are built (each has its `.mjs` in `node_modules/<pkg>/`), then run:

```bash
npm run link
```

By default, symlinks are created under `./application/static`. To use another directory: `npm run link ./public/vendor`

Or run the CLI directly: `npx metarhia-build link ./public/vendor`.

Each bundled package’s `packagename.mjs` is linked as `application/static/packagename.js` (or under the path you pass). Packages without a built `.mjs` are skipped (with a message).

## License & Contributors

Copyright (c) 2025-2026 [Metarhia contributors](https://github.com/metarhia/metarhia-build/graphs/contributors).
Metarhia-build is [MIT licensed](./LICENSE).\
Metarhia-build is a part of [Metarhia](https://github.com/metarhia) technology stack.
