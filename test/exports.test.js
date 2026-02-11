'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { transformToESMExport } = require('../lib/process-exports');

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

test('exports: transforms module.exports single item to single line', () => {
  const input = `module.exports = {
  singleItem,
};`;
  const output = transformToESMExport(input);
  assert.strictEqual(output, 'export { singleItem };');
});
