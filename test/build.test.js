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

test('circular: mutual require between files throws error', () => {
  assert.throws(
    () => build(fixture('circular')),
    (err) => {
      assert.ok(
        err.message.toLowerCase().includes('circular'),
        `Expected circular error, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('import-node: require of Node.js built-in throws error', () => {
  assert.throws(
    () => build(fixture('import-node')),
    (err) => {
      assert.ok(
        err.message.toLowerCase().includes('built-in'),
        `Expected built-in error, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('import-unknown: require of missing file throws error', () => {
  assert.throws(
    () => build(fixture('import-unknown')),
    (err) => {
      assert.ok(
        err.message.toLowerCase().includes('unknown'),
        `Expected unknown file error, got: ${err.message}`,
      );
      return true;
    },
  );
});
