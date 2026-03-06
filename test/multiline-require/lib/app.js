'use strict';

const {
  getA,
  getB,
} = require('./data.js');

const run = () => getA() + getB();

module.exports = { run };
