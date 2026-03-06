'use strict';

const init = require('eslint-config-metarhia');

module.exports = [
  ...init,
  { ignores: ['test/'] },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];
