# Changelog

## [Unreleased][unreleased]

## [0.0.2][] - 2026-03-06

- Rewrite bundler engine: string-based parsing using `metautil`
- Collect `require()` and add `import` header at file top
- Strip internal `require()` calls between sub-modules
- Collect `module.exports` from each file and emit `export`
- Support multiline destructuring `require` statements
- Detect circular dependencies
- Detect Node.js built-in modules
- Detect unknown dependencies
- Add tests and multiple complex cases

## [0.0.1][] - 2025-02-08

- CLI: `metarhia-build` available when installed in a project
- Two modes: **build** (bundle) and **link** (symlink dependencies)
- **build** mode: `metarhia-build` — bundles `lib/` into `packagename.mjs` per `build.json`
- **link** mode: `metarhia-build link [path]` — scans `node_modules` for packages with `build.json`, symlinks their `.mjs` bundles as `packagename.js` (default path `./application/static`)

## [0.0.0][] - 2025-12-23

- Initial commit

[unreleased]: https://github.com/metarhia/metarhia-build/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/metarhia/metarhia-build/releases/tag/v0.0.2
[0.0.1]: https://github.com/metarhia/metarhia-build/releases/tag/v0.0.1
[0.0.0]: https://github.com/metarhia/metarhia-build/releases/tag/v0.0.0
