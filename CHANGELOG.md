# Changelog

## [Unreleased][unreleased]

## [0.0.1][] - 2025-02-08

- CLI: `metarhia-build` available when installed in a project
- Two modes: **lib** (build bundle) and **link** (symlink dependencies)
- **lib** mode: `npm run build` or `metarhia-build lib` — bundles `lib/` into `packagename.mjs` per `build.json`
- **link** mode: `npm run link [path]` or `metarhia-build link [path]` — scans `node_modules` for packages with `build.json`, symlinks their `.mjs` bundles as `packagename.js` under the given path (default `./application/static`)
- Tests for lib and link modes

## [0.0.0][] - 2025-12-23

- Initial commit

[unreleased]: https://github.com/metarhia/metarhia-build/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/metarhia/metarhia-build/releases/tag/v0.0.1
[0.0.0]: https://github.com/metarhia/metarhia-build/releases/tag/v0.0.0
