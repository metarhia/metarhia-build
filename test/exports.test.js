'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  transformToESMExport,
  transformToIIFEExport,
  extractExportNames,
} = require('../src/transforms/exports');

test('exports: transforms single-line module.exports with object', () => {
  const input = 'module.exports = { someFn };';
  const output = transformToESMExport(input);
  assert.strictEqual(output, 'export { someFn };');
});

test('exports: transforms single-line module.exports with identifier', () => {
  const input = 'module.exports = someFn;';
  const output = transformToESMExport(input);
  assert.strictEqual(output, 'export { someFn };');
});

test('exports: transforms multi-line module.exports to ESM', () => {
  const input = `module.exports = {
  someFn,
  someConst,
  anotherThing,
};`;
  const expected = `export {
  someFn,
  someConst,
  anotherThing,
};`;
  const output = transformToESMExport(input);
  assert.strictEqual(output, expected);
});

test('exports: transforms multi-line module.exports with many items', () => {
  const input = `module.exports = {
  fn1,
  fn2,
  fn3,
  fn4,
  fn5,
  fn6,
  fn7,
  fn8,
};`;
  const expected = `export {
  fn1,
  fn2,
  fn3,
  fn4,
  fn5,
  fn6,
  fn7,
  fn8,
};`;
  const output = transformToESMExport(input);
  assert.strictEqual(output, expected);
});

test('exports: transforms single-line ESM export to IIFE', () => {
  const input = 'export { someFn };';
  const exportNames = extractExportNames(input);
  const output = transformToIIFEExport(exportNames);
  assert.strictEqual(output, 'exports.someFn = someFn;');
});

test('exports: transforms multi-line ESM export to IIFE', () => {
  const input = `export {
  test4,
  test44,
  test444,
};`;
  const expected = `exports.test4 = test4;
exports.test44 = test44;
exports.test444 = test444;`;
  const exportNames = extractExportNames(input);
  const output = transformToIIFEExport(exportNames);
  assert.strictEqual(output, expected);
});

test('exports: transforms multi-line ESM export with trailing comma', () => {
  const input = `export {
  alpha,
  beta,
  gamma,
  delta,
};`;
  const expected = `exports.alpha = alpha;
exports.beta = beta;
exports.gamma = gamma;
exports.delta = delta;`;
  const exportNames = extractExportNames(input);
  const output = transformToIIFEExport(exportNames);
  assert.strictEqual(output, expected);
});

test('exports: handles module.exports with extra whitespace', () => {
  const input = `module.exports = {
    item1,
    item2,
    item3,
  };`;
  const expected = `export {
  item1,
  item2,
  item3,
};`;
  const output = transformToESMExport(input);
  assert.strictEqual(output, expected);
});

test('exports: handles export with inconsistent spacing', () => {
  const input = `export {
test1,
  test2,
    test3,
};`;
  const expected = `exports.test1 = test1;
exports.test2 = test2;
exports.test3 = test3;`;
  const exportNames = extractExportNames(input);
  const output = transformToIIFEExport(exportNames);
  assert.strictEqual(output, expected);
});

test('exports: transforms module.exports single item to single line', () => {
  const input = `module.exports = {
  singleItem,
};`;
  const output = transformToESMExport(input);
  assert.strictEqual(output, 'export { singleItem };');
});

test('exports: transforms ESM export with single item to IIFE', () => {
  const input = `export {
  singleItem,
};`;
  const exportNames = extractExportNames(input);
  const output = transformToIIFEExport(exportNames);
  assert.strictEqual(output, 'exports.singleItem = singleItem;');
});
