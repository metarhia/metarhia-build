'use strict';

const init = require('eslint-config-metarhia');

module.exports = [
  ...init,
  {
    files: ['*.mjs', 'test/fixtures/lib/test4.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];
