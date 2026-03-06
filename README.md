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

The `metarhia-build` CLI is available in the project (e.g. `npx metarhia-build` or via npm scripts).

## Modes

### Build (bundle library)

For **libraries** that ship a single bundled `.mjs` file.

1. Create `build.json` in the project root:

```json
{ "order": ["error.js", "array.js", "async.js"] }
```

2. Put CommonJS source files in `lib/` as listed. Each file may use:
   - `const { a, b } = require('./internal.js');` — internal, stripped
   - `const { x } = require('external-pkg');` — becomes `import { x } from './external-pkg.js';`
   - `module.exports = { foo, bar };` — becomes `export { foo, bar };`
   - Multiline destructuring `require` is supported

3. Add to `package.json`:

```json
"scripts": {
  "build": "metarhia-build"
}
```

4. Run `npm run build`

**Output:** `packagename.mjs` (from `package.json` name) with: import block, concatenated file bodies (with `// filename` comments), and a combined `export { ... }` block.

**Constraints:** Node.js built-ins (`node:*`) are forbidden. Circular dependencies and unknown internal files produce build errors.

### Link (symlink built packages)

For **applications** that depend on metarhia-build packages. Scans `node_modules` for packages with `build.json`, finds their `.mjs` bundles, and creates symlinks for static serving.

1. Add to your app’s `package.json`:

```json
"scripts": {
  "link": "metarhia-build link"
}
```

2. Ensure dependencies are built (each has a `.mjs` in `node_modules/<pkg>/`), then run:

```bash
npm run link
```

By default, symlinks go to `./application/static`. Custom path: `npm run link ./public/vendor` or `npx metarhia-build link ./public/vendor`.

Each built package’s `packagename.mjs` is symlinked as `packagename.js` in the target directory. Packages without a built `.mjs` are skipped.

## License

Copyright (c) 2025–2026 [Metarhia contributors](https://github.com/metarhia/metarhia-build/graphs/contributors).  
[MIT licensed](./LICENSE). Part of [Metarhia](https://github.com/metarhia).
