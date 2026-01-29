/* eslint-disable quotes */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  processImports,
  generateImportStatements,
} = require('../src/transforms/imports');

describe('processImports', () => {
  test('imports: removes single-line require assignment', () => {
    const registry = new Map();
    const input = `const fs = require('fs');
const code = 'hello';`;
    const output = processImports(input, 'test.js', registry);
    assert.ok(!output.includes('require'));
    assert.ok(output.includes(`const code = 'hello';`));
  });

  test('imports: removes single-line import assignment', () => {
    const registry = new Map();
    const input = `import something from 'some-package';
const code = 'hello';`;
    const output = processImports(input, 'test.js', registry);
    assert.ok(!output.includes('import'));
    assert.ok(output.includes("const code = 'hello';"));
  });

  test('imports: removes multiline import with destructuring', () => {
    const registry = new Map();
    const input = `import {
  VAR1,
  VAR2,
  VAR3,
} from 'test-package';

const fn = () => VAR1;`;
    const output = processImports(input, 'test.js', registry);
    assert.ok(!output.includes('import'));
    assert.ok(!output.includes('from'));
    assert.ok(output.includes('const fn = () => VAR1;'));
  });

  test('imports: removes multiline require with destructuring', () => {
    const registry = new Map();
    const input = `const {
  fn1,
  fn2,
  fn3,
} = require('some-lib');

const code = fn1();`;
    const output = processImports(input, 'test.js', registry);
    assert.ok(!output.includes('require'));
    assert.ok(output.includes('const code = fn1();'));
  });

  test('imports: records external package imports in registry', () => {
    const registry = new Map();
    const input = `import { a, b } from 'external-pkg';`;
    processImports(input, 'test.js', registry);
    assert.ok(registry.has('external-pkg'));
    const entry = registry.get('external-pkg');
    assert.ok(entry.named.has('a'));
    assert.ok(entry.named.has('b'));
  });

  test('imports: records default import in registry', () => {
    const registry = new Map();
    const input = `import pkg from 'external-pkg';`;
    processImports(input, 'test.js', registry);
    assert.ok(registry.has('external-pkg'));
    const entry = registry.get('external-pkg');
    assert.ok(entry.defaultNames.has('pkg'));
  });

  test('imports: does not record relative imports in registry', () => {
    const registry = new Map();
    const input = `import { fn } from './local';`;
    processImports(input, 'test.js', registry);
    assert.strictEqual(registry.size, 0);
  });

  test('imports: does not record node builtins in registry', () => {
    const registry = new Map();
    const input = `const fs = require('fs');`;
    processImports(input, 'test.js', registry);
    assert.strictEqual(registry.size, 0);
  });

  test('imports: handles multiline import with renamed bindings', () => {
    const registry = new Map();
    const input = `import {
  original: renamed,
  another,
} from 'external-pkg';`;
    processImports(input, 'test.js', registry);
    const entry = registry.get('external-pkg');
    assert.ok(entry.named.has('original'));
    assert.ok(entry.named.has('another'));
  });
});
describe('generateImportStatements', () => {
  test('imports: generates import statements from registry', () => {
    const registry = new Map();
    registry.set('pkg-a', {
      defaultNames: new Set(['PkgA']),
      named: new Set(),
      sideEffect: false,
    });
    registry.set('pkg-b', {
      defaultNames: new Set(),
      named: new Set(['fn1', 'fn2']),
      sideEffect: false,
    });
    const output = generateImportStatements(registry);
    assert.ok(output.includes("import PkgA from './pkg-a.js';"));
    assert.ok(output.includes("import { fn1, fn2 } from './pkg-b.js';"));
  });

  test('imports: generates combined default and named import', () => {
    const registry = new Map();
    registry.set('pkg', {
      defaultNames: new Set(['Pkg']),
      named: new Set(['helper']),
      sideEffect: false,
    });
    const output = generateImportStatements(registry);
    assert.ok(output.includes("import Pkg, { helper } from './pkg.js';"));
  });
});
