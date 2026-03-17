'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('../metarhia-build.js');

const fixture = (name) => path.join(__dirname, name);

const assertBuildMatches = (fixtureName, mjsName) => {
  const dir = fixture(fixtureName);
  const outputFile = path.join(dir, mjsName);
  const expected = fs.readFileSync(outputFile, 'utf8');
  build(dir);
  const actual = fs.readFileSync(outputFile, 'utf8');
  assert.equal(actual, expected);
};

test('collection: single file, multi-export', () => {
  assertBuildMatches('collection', 'collection.mjs');
});

test('submodules: intra-package requires stripped, combined export', () => {
  assertBuildMatches('submodules', 'submodules.mjs');
});

test('complex: external requires -> import header, cross-file stripped', () => {
  assertBuildMatches('complex', 'complex.mjs');
});

test('multiline-require: multiline destructuring require stripped', () => {
  assertBuildMatches('multiline-require', 'multiline-require.mjs');
});

test('circular: mutual require stripped', () => {
  assertBuildMatches('circular', 'circular.mjs');
});

test('import-npm: non-destructuring require stripped', () => {
  assertBuildMatches('import-npm', 'import-npm.mjs');
});

test('import-node: Node built-in require stripped', () => {
  assertBuildMatches('import-node', 'import-node.mjs');
});

test('import-unknown: unknown file require stripped', () => {
  assertBuildMatches('import-unknown', 'import-unknown.mjs');
});
